"""
Deploy configuration for the EscrowContract.

This file is consumed by AlgoKit or custom deploy scripts.
"""

DEPLOY_CONFIG = {
    "app_name": "AlgoEaseEscrow",
    "contract_module": "contract",
    "contract_class": "EscrowContract",
    "global_ints": 1,      # usdc_asset_id
    "global_bytes": 0,
    "local_ints": 0,
    "local_bytes": 0,
    # Boxes are dynamically sized; no static local/global for escrow records.
}
