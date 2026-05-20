"""
AlgoEase v2 — Multi-escrow contract with BoxMap storage.

One deployed app handles many escrows keyed by task_id. Supports ALGO and
USDC-A (ASA) payments with hybrid lifecycle:

    OPEN → ACCEPTED → SUBMITTED → APPROVED → RELEASED
                                           ↘ REFUNDED (deadline or explicit)

Uses AlgoPy (Puya) exclusively — no PyTeal.
"""

from algopy import (
    ARC4Contract,
    Account,
    Asset,
    BoxMap,
    Bytes,
    Global,
    Txn,
    UInt64,
    arc4,
    gtxn,
    itxn,
    op,
    subroutine,
)

# Status codes (plain ints — Puya does not allow UInt64 at module level)
STATUS_OPEN = 1
STATUS_ACCEPTED = 2
STATUS_SUBMITTED = 3
STATUS_APPROVED = 4
STATUS_RELEASED = 5
STATUS_REFUNDED = 6


class EscrowRecord(arc4.Struct):
    """Per-task escrow state stored in a box."""

    client: arc4.Address
    freelancer: arc4.Address
    amount: arc4.UInt64
    usdc_asset_id: arc4.UInt64
    status: arc4.UInt64
    ipfs_hash: arc4.String
    created_at: arc4.UInt64
    deadline: arc4.UInt64


class EscrowContract(ARC4Contract):
    """ARC-4 multi-escrow contract using BoxMap keyed by task_id."""

    def __init__(self) -> None:
        self.escrows = BoxMap(Bytes, EscrowRecord, key_prefix=b"esc")
        self.usdc_asset_id = UInt64(0)

    @subroutine
    def is_open_freelancer(self, freelancer: arc4.Address) -> bool:
        """Open bounty marker — compare arc4.Address, not Account.native (TEAL-safe)."""
        return freelancer == arc4.Address(Global.zero_address)

    @arc4.abimethod
    def configure(self, usdc_asset_id: arc4.UInt64) -> None:
        """One-time admin config (creator only). Sets default USDC ASA ID."""
        assert Txn.sender == Global.creator_address, "only creator"
        self.usdc_asset_id = usdc_asset_id.native

    @arc4.abimethod
    def opt_in_asset(self, asset: Asset) -> None:
        """Opt the app into an ASA (required before receiving USDC). Creator only."""
        assert Txn.sender == Global.creator_address, "only creator"
        itxn.AssetTransfer(
            xfer_asset=asset,
            asset_receiver=Global.current_application_address,
            asset_amount=0,
            fee=0,
        ).submit()

    @arc4.abimethod
    def create_escrow(
        self,
        task_id: arc4.String,
        freelancer: arc4.Address,
        deadline: arc4.UInt64,
        usdc_asset_id: arc4.UInt64,
        fund: gtxn.PaymentTransaction,
    ) -> None:
        """
        Create a new escrow. Must be grouped with a Payment (ALGO) to the app.
        For USDC, a separate create_escrow_usdc method is used.
        """
        key = task_id.bytes
        assert key not in self.escrows, "task_id already exists"

        amount_native = fund.amount
        assert amount_native > 0, "amount must be > 0"
        assert fund.receiver == Global.current_application_address, "pay to app"
        assert fund.sender == Txn.sender, "payment sender must be caller"
        assert fund.close_remainder_to == Global.zero_address, "no close"
        assert fund.rekey_to == Global.zero_address, "no rekey"

        # Zero address = open bounty; freelancer claims on accept_task.
        if not self.is_open_freelancer(freelancer):
            assert freelancer.native != Txn.sender, "freelancer must differ from client"

        self.escrows[key] = EscrowRecord(
            client=arc4.Address(Txn.sender),
            freelancer=freelancer,
            amount=arc4.UInt64(amount_native),
            usdc_asset_id=usdc_asset_id,
            status=arc4.UInt64(STATUS_OPEN),
            ipfs_hash=arc4.String(""),
            created_at=arc4.UInt64(Global.latest_timestamp),
            deadline=deadline,
        )

    @arc4.abimethod
    def create_escrow_usdc(
        self,
        task_id: arc4.String,
        freelancer: arc4.Address,
        deadline: arc4.UInt64,
        usdc_asset_id: arc4.UInt64,
        fund: gtxn.AssetTransferTransaction,
    ) -> None:
        """Create escrow funded with USDC-A (ASA transfer)."""
        key = task_id.bytes
        assert key not in self.escrows, "task_id already exists"

        amount_native = fund.asset_amount
        assert amount_native > 0, "amount must be > 0"
        assert fund.asset_receiver == Global.current_application_address, "pay to app"
        assert fund.sender == Txn.sender, "payment sender must be caller"
        assert fund.asset_close_to == Global.zero_address, "no close"
        assert fund.rekey_to == Global.zero_address, "no rekey"
        assert fund.xfer_asset.id == usdc_asset_id.native, "asset mismatch"

        if not self.is_open_freelancer(freelancer):
            assert freelancer.native != Txn.sender, "freelancer must differ from client"

        self.escrows[key] = EscrowRecord(
            client=arc4.Address(Txn.sender),
            freelancer=freelancer,
            amount=arc4.UInt64(amount_native),
            usdc_asset_id=usdc_asset_id,
            status=arc4.UInt64(STATUS_OPEN),
            ipfs_hash=arc4.String(""),
            created_at=arc4.UInt64(Global.latest_timestamp),
            deadline=deadline,
        )

    @arc4.abimethod
    def accept_task(self, task_id: arc4.String) -> None:
        """Freelancer accepts the task. OPEN → ACCEPTED."""
        key = task_id.bytes
        record = self.escrows[key].copy()
        assert record.status == arc4.UInt64(STATUS_OPEN), "not OPEN"

        if self.is_open_freelancer(record.freelancer):
            assert Txn.sender != record.client.native, "freelancer must differ from client"
            record.freelancer = arc4.Address(Txn.sender)
        else:
            assert Txn.sender == record.freelancer.native, "only freelancer"

        record.status = arc4.UInt64(STATUS_ACCEPTED)
        self.escrows[key] = record.copy()

    @arc4.abimethod
    def submit_work(self, task_id: arc4.String, ipfs_cid: arc4.String) -> None:
        """Freelancer submits work. ACCEPTED → SUBMITTED."""
        key = task_id.bytes
        record = self.escrows[key].copy()
        assert record.status == arc4.UInt64(STATUS_ACCEPTED), "not ACCEPTED"
        assert Txn.sender == record.freelancer.native, "only freelancer"
        assert ipfs_cid.bytes.length > 0, "ipfs_cid required"

        record.status = arc4.UInt64(STATUS_SUBMITTED)
        record.ipfs_hash = ipfs_cid
        self.escrows[key] = record.copy()

    @subroutine
    def _send_escrow_payout(
        self,
        receiver: Account,
        amount: arc4.UInt64,
        asset_id: arc4.UInt64,
    ) -> None:
        """Pay out escrow funds after the box is deleted (releases box MBR)."""
        payout = amount.native
        assert payout > 0, "no funds"
        app = Global.current_application_address
        available = app.balance - app.min_balance
        assert available >= payout, "insufficient escrow liquidity"

        asset_native = asset_id.native
        if asset_native > 0:
            itxn.AssetTransfer(
                xfer_asset=Asset(asset_native),
                asset_receiver=receiver,
                asset_amount=payout,
                fee=0,
            ).submit()
        else:
            itxn.Payment(
                receiver=receiver,
                amount=payout,
                fee=0,
            ).submit()

    @subroutine
    def _refund_client(self, record: EscrowRecord, key: Bytes) -> None:
        """Return escrowed funds to the client. Deletes the escrow box first."""
        assert record.amount.native > 0, "no funds"
        client = record.client.native
        del self.escrows[key]
        self._send_escrow_payout(client, record.amount, record.usdc_asset_id)

    @arc4.abimethod
    def reject_work(self, task_id: arc4.String) -> None:
        """Client rejects submitted work. SUBMITTED → REFUNDED (immediate refund)."""
        key = task_id.bytes
        record = self.escrows[key].copy()
        assert record.status == arc4.UInt64(STATUS_SUBMITTED), "not SUBMITTED"
        assert Txn.sender == record.client.native, "only client"
        self._refund_client(record, key)

    @arc4.abimethod
    def approve(self, task_id: arc4.String) -> None:
        """Client approves work. SUBMITTED → APPROVED."""
        key = task_id.bytes
        record = self.escrows[key].copy()
        assert record.status == arc4.UInt64(STATUS_SUBMITTED), "not SUBMITTED"
        assert Txn.sender == record.client.native, "only client"

        record.status = arc4.UInt64(STATUS_APPROVED)
        self.escrows[key] = record.copy()

    @arc4.abimethod
    def release_payment(self, task_id: arc4.String) -> None:
        """Release funds to freelancer. APPROVED → RELEASED."""
        key = task_id.bytes
        record = self.escrows[key].copy()
        assert record.status == arc4.UInt64(STATUS_APPROVED), "not APPROVED"
        assert Txn.sender == record.client.native, "only client"

        assert record.amount.native > 0, "no funds"

        freelancer = record.freelancer.native
        del self.escrows[key]
        self._send_escrow_payout(freelancer, record.amount, record.usdc_asset_id)

    @arc4.abimethod
    def refund(self, task_id: arc4.String) -> None:
        """Refund to client. Allowed if deadline passed or status is OPEN/ACCEPTED/SUBMITTED."""
        key = task_id.bytes
        record = self.escrows[key].copy()
        assert Txn.sender == record.client.native, "only client"

        status = record.status.native
        deadline = record.deadline.native
        now = Global.latest_timestamp

        # Refundable: OPEN, ACCEPTED, or SUBMITTED (never after APPROVED/RELEASED/REFUNDED)
        is_refundable_status = (
            status == STATUS_OPEN or status == STATUS_ACCEPTED or status == STATUS_SUBMITTED
        )
        assert is_refundable_status, "refund not allowed"
        # After SUBMITTED, require deadline to have passed
        if status == STATUS_SUBMITTED:
            assert now >= deadline, "deadline not reached"

        self._refund_client(record, key)

    @arc4.abimethod(readonly=True)
    def get_status(self, task_id: arc4.String) -> arc4.UInt64:
        """Returns the numeric status of an escrow."""
        key = task_id.bytes
        record = self.escrows[key].copy()
        return record.status
