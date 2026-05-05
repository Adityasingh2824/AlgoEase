from escrow_contract import EscrowContract


def test_contract_version():
    contract = EscrowContract()
    assert contract.version() == "v2"
