"""
Tests for the multi-escrow BoxMap contract (hybrid lifecycle).

Uses algopy_testing to emulate AVM behavior offline.
"""

from collections.abc import Generator

import algopy
import pytest
from algopy import Global
from algopy_testing import AlgopyTestContext, algopy_testing_context

import sys
from pathlib import Path

# Add parent so we can import the contract module
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from contract import (
    EscrowContract,
    STATUS_OPEN,
    STATUS_ACCEPTED,
    STATUS_SUBMITTED,
    STATUS_APPROVED,
    STATUS_RELEASED,
    STATUS_REFUNDED,
)

ESCROW_AMOUNT = 1_000_000  # 1 ALGO
APP_MBR_SEED = 500_000


@pytest.fixture()
def context() -> Generator[AlgopyTestContext, None, None]:
    with algopy_testing_context() as ctx:
        yield ctx


def _fund_app(ctx: AlgopyTestContext, contract: EscrowContract) -> None:
    app = ctx.ledger.get_app(contract)
    ctx.ledger.update_account(app.address, balance=algopy.UInt64(APP_MBR_SEED))


# ──── Create Escrow ──────────────────────────────────────────────────────────


def _create(
    ctx: AlgopyTestContext,
    contract: EscrowContract,
    task_id: str = "task-001",
    deadline: int = 9999999999,
) -> tuple[algopy.Account, algopy.Account]:
    client = ctx.default_sender
    freelancer = ctx.any.account()
    app_address = ctx.ledger.get_app(contract).address

    payment = ctx.any.txn.payment(
        sender=client,
        receiver=app_address,
        amount=algopy.UInt64(ESCROW_AMOUNT),
    )
    contract.create_escrow(
        algopy.arc4.String(task_id),
        algopy.arc4.Address(freelancer),
        algopy.arc4.UInt64(deadline),
        algopy.arc4.UInt64(0),  # ALGO, not USDC
        payment,
    )
    return client, freelancer


def test_create_escrow(context: AlgopyTestContext) -> None:
    contract = EscrowContract()
    client, freelancer = _create(context, contract)

    status = contract.get_status(algopy.arc4.String("task-001"))
    assert status == algopy.arc4.UInt64(STATUS_OPEN)


def test_create_duplicate_task_id_fails(context: AlgopyTestContext) -> None:
    contract = EscrowContract()
    _create(context, contract, "task-dup")
    with pytest.raises(AssertionError, match="task_id already exists"):
        _create(context, contract, "task-dup")


def test_multiple_tasks_in_one_app(context: AlgopyTestContext) -> None:
    contract = EscrowContract()
    _create(context, contract, "task-A")
    _create(context, contract, "task-B")

    assert contract.get_status(algopy.arc4.String("task-A")) == algopy.arc4.UInt64(STATUS_OPEN)
    assert contract.get_status(algopy.arc4.String("task-B")) == algopy.arc4.UInt64(STATUS_OPEN)


# ──── Accept Task ────────────────────────────────────────────────────────────


def test_accept_task(context: AlgopyTestContext) -> None:
    contract = EscrowContract()
    _client, freelancer = _create(context, contract)

    with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
        contract.accept_task(algopy.arc4.String("task-001"))

    assert contract.get_status(algopy.arc4.String("task-001")) == algopy.arc4.UInt64(STATUS_ACCEPTED)


def test_accept_task_unauthorized(context: AlgopyTestContext) -> None:
    contract = EscrowContract()
    _create(context, contract)
    intruder = context.any.account()

    with pytest.raises(AssertionError, match="only freelancer"):
        with context.txn.create_group(active_txn_overrides={"sender": intruder}):
            contract.accept_task(algopy.arc4.String("task-001"))


def _create_open(
    ctx: AlgopyTestContext,
    contract: EscrowContract,
    task_id: str = "task-open",
) -> algopy.Account:
    """Create escrow with no pre-assigned freelancer (zero address)."""
    client = ctx.default_sender
    app_address = ctx.ledger.get_app(contract).address
    payment = ctx.any.txn.payment(
        sender=client,
        receiver=app_address,
        amount=algopy.UInt64(ESCROW_AMOUNT),
    )
    contract.create_escrow(
        algopy.arc4.String(task_id),
        algopy.arc4.Address(Global.zero_address),
        algopy.arc4.UInt64(9999999999),
        algopy.arc4.UInt64(0),
        payment,
    )
    return client


def test_open_bounty_accept_assigns_freelancer(context: AlgopyTestContext) -> None:
    contract = EscrowContract()
    _create_open(context, contract)
    freelancer = context.any.account()

    with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
        contract.accept_task(algopy.arc4.String("task-open"))

    assert contract.get_status(algopy.arc4.String("task-open")) == algopy.arc4.UInt64(STATUS_ACCEPTED)


def test_open_bounty_client_cannot_accept(context: AlgopyTestContext) -> None:
    contract = EscrowContract()
    client = _create_open(context, contract)

    with pytest.raises(AssertionError, match="freelancer must differ from client"):
        with context.txn.create_group(active_txn_overrides={"sender": client}):
            contract.accept_task(algopy.arc4.String("task-open"))


# ──── Submit Work ────────────────────────────────────────────────────────────


def test_submit_work(context: AlgopyTestContext) -> None:
    contract = EscrowContract()
    _client, freelancer = _create(context, contract)

    with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
        contract.accept_task(algopy.arc4.String("task-001"))
    with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
        contract.submit_work(algopy.arc4.String("task-001"), algopy.arc4.String("ipfs://QmTest123"))

    assert contract.get_status(algopy.arc4.String("task-001")) == algopy.arc4.UInt64(STATUS_SUBMITTED)


def test_submit_requires_accepted(context: AlgopyTestContext) -> None:
    contract = EscrowContract()
    _client, freelancer = _create(context, contract)

    with pytest.raises(AssertionError, match="not ACCEPTED"):
        with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
            contract.submit_work(algopy.arc4.String("task-001"), algopy.arc4.String("ipfs://x"))


# ──── Approve ────────────────────────────────────────────────────────────────


def test_approve(context: AlgopyTestContext) -> None:
    contract = EscrowContract()
    client, freelancer = _create(context, contract)

    with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
        contract.accept_task(algopy.arc4.String("task-001"))
    with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
        contract.submit_work(algopy.arc4.String("task-001"), algopy.arc4.String("ipfs://x"))
    with context.txn.create_group(active_txn_overrides={"sender": client}):
        contract.approve(algopy.arc4.String("task-001"))

    assert contract.get_status(algopy.arc4.String("task-001")) == algopy.arc4.UInt64(STATUS_APPROVED)


def test_approve_unauthorized(context: AlgopyTestContext) -> None:
    contract = EscrowContract()
    _client, freelancer = _create(context, contract)

    with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
        contract.accept_task(algopy.arc4.String("task-001"))
    with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
        contract.submit_work(algopy.arc4.String("task-001"), algopy.arc4.String("ipfs://x"))

    with pytest.raises(AssertionError, match="only client"):
        with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
            contract.approve(algopy.arc4.String("task-001"))


# ──── Reject Work ────────────────────────────────────────────────────────────


def test_reject_work_refunds_client(context: AlgopyTestContext) -> None:
    contract = EscrowContract()
    client, freelancer = _create(context, contract)
    _fund_app(context, contract)
    client_before = context.ledger.get_account(client).balance

    with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
        contract.accept_task(algopy.arc4.String("task-001"))
    with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
        contract.submit_work(algopy.arc4.String("task-001"), algopy.arc4.String("ipfs://bad"))
    with context.txn.create_group(active_txn_overrides={"sender": client}):
        contract.reject_work(algopy.arc4.String("task-001"))

    client_after = context.ledger.get_account(client).balance
    assert client_after.native > client_before.native


def test_reject_requires_submitted(context: AlgopyTestContext) -> None:
    contract = EscrowContract()
    client, freelancer = _create(context, contract)

    with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
        contract.accept_task(algopy.arc4.String("task-001"))

    with pytest.raises(AssertionError, match="not SUBMITTED"):
        with context.txn.create_group(active_txn_overrides={"sender": client}):
            contract.reject_work(algopy.arc4.String("task-001"))


# ──── Release Payment ────────────────────────────────────────────────────────


def test_release_payment(context: AlgopyTestContext) -> None:
    contract = EscrowContract()
    client, freelancer = _create(context, contract)
    _fund_app(context, contract)

    with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
        contract.accept_task(algopy.arc4.String("task-001"))
    with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
        contract.submit_work(algopy.arc4.String("task-001"), algopy.arc4.String("ipfs://x"))
    with context.txn.create_group(active_txn_overrides={"sender": client}):
        contract.approve(algopy.arc4.String("task-001"))
    freelancer_before = context.ledger.get_account(freelancer).balance
    with context.txn.create_group(active_txn_overrides={"sender": client}):
        contract.release_payment(algopy.arc4.String("task-001"))

    freelancer_after = context.ledger.get_account(freelancer).balance
    assert freelancer_after.native > freelancer_before.native


def test_release_requires_approval(context: AlgopyTestContext) -> None:
    contract = EscrowContract()
    client, freelancer = _create(context, contract)

    with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
        contract.accept_task(algopy.arc4.String("task-001"))
    with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
        contract.submit_work(algopy.arc4.String("task-001"), algopy.arc4.String("ipfs://x"))

    with pytest.raises(AssertionError, match="not APPROVED"):
        with context.txn.create_group(active_txn_overrides={"sender": client}):
            contract.release_payment(algopy.arc4.String("task-001"))


# ──── Refund ─────────────────────────────────────────────────────────────────


def test_refund_when_open(context: AlgopyTestContext) -> None:
    contract = EscrowContract()
    client, _freelancer = _create(context, contract)
    _fund_app(context, contract)
    client_before = context.ledger.get_account(client).balance

    with context.txn.create_group(active_txn_overrides={"sender": client}):
        contract.refund(algopy.arc4.String("task-001"))

    client_after = context.ledger.get_account(client).balance
    assert client_after.native > client_before.native


def test_refund_blocked_after_approval(context: AlgopyTestContext) -> None:
    contract = EscrowContract()
    client, freelancer = _create(context, contract)

    with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
        contract.accept_task(algopy.arc4.String("task-001"))
    with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
        contract.submit_work(algopy.arc4.String("task-001"), algopy.arc4.String("ipfs://x"))
    with context.txn.create_group(active_txn_overrides={"sender": client}):
        contract.approve(algopy.arc4.String("task-001"))

    with pytest.raises(AssertionError, match="refund not allowed"):
        with context.txn.create_group(active_txn_overrides={"sender": client}):
            contract.refund(algopy.arc4.String("task-001"))


def test_double_release_blocked(context: AlgopyTestContext) -> None:
    contract = EscrowContract()
    client, freelancer = _create(context, contract)
    _fund_app(context, contract)

    with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
        contract.accept_task(algopy.arc4.String("task-001"))
    with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
        contract.submit_work(algopy.arc4.String("task-001"), algopy.arc4.String("ipfs://x"))
    with context.txn.create_group(active_txn_overrides={"sender": client}):
        contract.approve(algopy.arc4.String("task-001"))
    with context.txn.create_group(active_txn_overrides={"sender": client}):
        contract.release_payment(algopy.arc4.String("task-001"))

    with pytest.raises(AssertionError):
        with context.txn.create_group(active_txn_overrides={"sender": client}):
            contract.release_payment(algopy.arc4.String("task-001"))
