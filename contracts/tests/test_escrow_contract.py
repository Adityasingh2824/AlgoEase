"""
Offline AVM tests for `EscrowContract`.

These tests use the official Algorand Python testing framework
(https://algorandfoundation.github.io/algorand-python-testing/) which emulates
core AVM behavior in-process.

They verify two properties:

1. Deploy: the contract can be instantiated within an AVM test context
   (equivalent to a successful create / deploy on-chain).
2. State: each ABI method correctly mutates persisted contract state
   (`status`, `amount`, `client`, `freelancer`, `work_hash`).
"""

from collections.abc import Generator

import algopy
import pytest
from algopy_testing import AlgopyTestContext, algopy_testing_context

from escrow_contract import (
    STATUS_APPROVED,
    STATUS_CREATED,
    STATUS_REFUNDED,
    STATUS_RELEASED,
    STATUS_SUBMITTED,
    STATUS_UNINITIALISED,
    EscrowContract,
)

ESCROW_AMOUNT = 1_000_000  # 1 ALGO in microalgos
APP_MBR_SEED = 200_000  # microalgos seeding the app account so inner pays succeed


@pytest.fixture()
def context() -> Generator[AlgopyTestContext, None, None]:
    with algopy_testing_context() as ctx:
        yield ctx


def _fund_application(ctx: AlgopyTestContext) -> None:
    """Mimic the deployer pre-seeding the application account for MBR."""
    app = ctx.ledger.get_app(ctx.txn.last_active.app_id)
    ctx.ledger.update_account(app.address, balance=algopy.UInt64(APP_MBR_SEED))


# --------------------------------------------------------------------------
# 1) Deploy + initial state
# --------------------------------------------------------------------------


def test_contract_can_deploy_and_initial_state(context: AlgopyTestContext) -> None:
    contract = EscrowContract()

    assert contract.status == algopy.UInt64(STATUS_UNINITIALISED)
    assert contract.amount == algopy.UInt64(0)
    assert contract.client == algopy.Account()
    assert contract.freelancer == algopy.Account()
    assert contract.work_hash == algopy.Bytes()


# --------------------------------------------------------------------------
# 2) State storage across the lifecycle
# --------------------------------------------------------------------------


def _create_escrow(
    context: AlgopyTestContext,
    contract: EscrowContract,
) -> tuple[algopy.Account, algopy.Account]:
    client = context.default_sender
    freelancer = context.any.account()
    app_address = context.ledger.get_app(contract).address

    payment = context.any.txn.payment(
        sender=client,
        receiver=app_address,
        amount=algopy.UInt64(ESCROW_AMOUNT),
    )
    contract.create_escrow(
        algopy.arc4.Address(freelancer),
        algopy.arc4.UInt64(ESCROW_AMOUNT),
        payment,
    )
    return client, freelancer


def test_create_escrow_persists_state(context: AlgopyTestContext) -> None:
    contract = EscrowContract()
    client, freelancer = _create_escrow(context, contract)

    assert contract.status == algopy.UInt64(STATUS_CREATED)
    assert contract.amount == algopy.UInt64(ESCROW_AMOUNT)
    assert contract.client == client
    assert contract.freelancer == freelancer
    assert contract.work_hash == algopy.Bytes()


def test_submit_work_persists_state(context: AlgopyTestContext) -> None:
    contract = EscrowContract()
    _client, freelancer = _create_escrow(context, contract)

    cid = algopy.arc4.String("ipfs://bafkreigh2akiscaildc")
    with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
        contract.submit_work(cid)

    assert contract.status == algopy.UInt64(STATUS_SUBMITTED)
    assert contract.work_hash == cid.bytes
    assert contract.amount == algopy.UInt64(ESCROW_AMOUNT)


def test_approve_persists_state(context: AlgopyTestContext) -> None:
    contract = EscrowContract()
    client, freelancer = _create_escrow(context, contract)
    with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
        contract.submit_work(algopy.arc4.String("ipfs://x"))
    with context.txn.create_group(active_txn_overrides={"sender": client}):
        contract.approve()

    assert contract.status == algopy.UInt64(STATUS_APPROVED)
    assert contract.amount == algopy.UInt64(ESCROW_AMOUNT)


def test_release_payment_persists_state(context: AlgopyTestContext) -> None:
    contract = EscrowContract()
    client, freelancer = _create_escrow(context, contract)
    _fund_application(context)

    with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
        contract.submit_work(algopy.arc4.String("ipfs://x"))
    with context.txn.create_group(active_txn_overrides={"sender": client}):
        contract.approve()
    with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
        contract.release_payment()

    assert contract.status == algopy.UInt64(STATUS_RELEASED)
    assert contract.amount == algopy.UInt64(0)


def test_refund_persists_state(context: AlgopyTestContext) -> None:
    contract = EscrowContract()
    client, _freelancer = _create_escrow(context, contract)
    _fund_application(context)

    with context.txn.create_group(active_txn_overrides={"sender": client}):
        contract.refund()

    assert contract.status == algopy.UInt64(STATUS_REFUNDED)
    assert contract.amount == algopy.UInt64(0)


# --------------------------------------------------------------------------
# 3) Auth + status guards
# --------------------------------------------------------------------------


def test_only_freelancer_can_submit_work(context: AlgopyTestContext) -> None:
    contract = EscrowContract()
    _create_escrow(context, contract)
    intruder = context.any.account()

    with pytest.raises(AssertionError):
        with context.txn.create_group(active_txn_overrides={"sender": intruder}):
            contract.submit_work(algopy.arc4.String("ipfs://x"))


def test_only_client_can_approve(context: AlgopyTestContext) -> None:
    contract = EscrowContract()
    _client, freelancer = _create_escrow(context, contract)
    with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
        contract.submit_work(algopy.arc4.String("ipfs://x"))

    with pytest.raises(AssertionError):
        with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
            contract.approve()


def test_release_blocked_without_approval(context: AlgopyTestContext) -> None:
    contract = EscrowContract()
    _client, freelancer = _create_escrow(context, contract)

    with pytest.raises(AssertionError):
        with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
            contract.release_payment()


def test_refund_blocked_after_approval(context: AlgopyTestContext) -> None:
    contract = EscrowContract()
    client, freelancer = _create_escrow(context, contract)
    with context.txn.create_group(active_txn_overrides={"sender": freelancer}):
        contract.submit_work(algopy.arc4.String("ipfs://x"))
    with context.txn.create_group(active_txn_overrides={"sender": client}):
        contract.approve()

    with pytest.raises(AssertionError):
        with context.txn.create_group(active_txn_overrides={"sender": client}):
            contract.refund()
