"""
Trustless freelancer escrow implemented with AlgoPy (Puya).

Funds are locked by grouping a Payment to the application account with the
`create_escrow` ABI call. Release pays the freelancer only after the client
approves; refund pays the client back only before approval (CREATED or
SUBMITTED).

References:
- https://github.com/algorandfoundation/puya
- https://algorandfoundation.github.io/puya/lg-arc4.html
- https://algorandfoundation.github.io/puya/lg-storage.html
"""

from algopy import (
    ARC4Contract,
    Account,
    Bytes,
    Global,
    Txn,
    UInt64,
    arc4,
    gtxn,
    itxn,
    subroutine,
)

# Module-level constants must be plain ints (Puya rule); compared against UInt64
# state via implicit promotion in expressions like `self.status == STATUS_CREATED`.
STATUS_UNINITIALISED = 0
STATUS_CREATED = 1
STATUS_SUBMITTED = 2
STATUS_APPROVED = 3
STATUS_REFUNDED = 4
STATUS_RELEASED = 5

MAX_CID_BYTES = 128


class EscrowContract(ARC4Contract):
    """ARC-4 escrow locking ALGO behind client / freelancer approvals."""

    def __init__(self) -> None:
        self.amount = UInt64(0)
        self.client = Account()
        self.freelancer = Account()
        self.status = UInt64(STATUS_UNINITIALISED)
        self.work_hash = Bytes()

    @arc4.abimethod
    def create_escrow(
        self,
        freelancer: arc4.Address,
        amount: arc4.UInt64,
        fund: gtxn.PaymentTransaction,
    ) -> None:
        """
        Initialise escrow. Caller becomes the client; the grouped Payment must
        deliver `amount` microalgos to the application account.
        """
        assert self.status == STATUS_UNINITIALISED, "escrow already initialised"

        amount_native = amount.native
        assert amount_native > 0, "amount must be > 0"

        freelancer_acct = freelancer.native
        assert freelancer_acct != Txn.sender, "freelancer must differ from client"

        assert fund.sender == Txn.sender, "payment sender must be client"
        assert (
            fund.receiver == Global.current_application_address
        ), "payment receiver must be app"
        assert fund.amount == amount_native, "locked amount mismatch"
        assert fund.close_remainder_to == Global.zero_address, "close_remainder_to must be zero"
        assert fund.rekey_to == Global.zero_address, "rekey_to must be zero"

        self.client = Txn.sender
        self.freelancer = freelancer_acct
        self.amount = amount_native
        self.status = UInt64(STATUS_CREATED)

    @arc4.abimethod
    def submit_work(self, ipfs_hash: arc4.String) -> None:
        """Freelancer records deliverable CID; status -> SUBMITTED."""
        assert Txn.sender == self.freelancer, "only freelancer"
        assert self.status == STATUS_CREATED, "invalid status for submit"

        cid_bytes = ipfs_hash.bytes
        assert cid_bytes.length > 0, "ipfs_hash required"
        assert cid_bytes.length <= MAX_CID_BYTES, "ipfs_hash too long"

        self.work_hash = cid_bytes
        self.status = UInt64(STATUS_SUBMITTED)

    @arc4.abimethod
    def approve(self) -> None:
        """Client approves submitted deliverable; status -> APPROVED."""
        assert Txn.sender == self.client, "only client"
        assert self.status == STATUS_SUBMITTED, "work not submitted"
        self.status = UInt64(STATUS_APPROVED)

    @arc4.abimethod
    def release_payment(self) -> None:
        """Freelancer pulls escrow after approval; status -> RELEASED."""
        assert Txn.sender == self.freelancer, "only freelancer"
        assert self.status == STATUS_APPROVED, "approval required"
        assert self.amount > 0, "no funds locked"

        payout = self.amount
        itxn.Payment(
            receiver=self.freelancer,
            amount=payout,
            fee=0,
        ).submit()

        self.amount = UInt64(0)
        self.status = UInt64(STATUS_RELEASED)

    @arc4.abimethod
    def refund(self) -> None:
        """Client refund window: only CREATED or SUBMITTED, never APPROVED+."""
        assert Txn.sender == self.client, "only client"
        assert self._refundable(), "refund not allowed"
        assert self.amount > 0, "no funds locked"

        rebate = self.amount
        itxn.Payment(
            receiver=self.client,
            amount=rebate,
            fee=0,
        ).submit()

        self.amount = UInt64(0)
        self.status = UInt64(STATUS_REFUNDED)

    @subroutine
    def _refundable(self) -> bool:
        return self.status == STATUS_CREATED or self.status == STATUS_SUBMITTED
