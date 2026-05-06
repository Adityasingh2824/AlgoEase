# AlgoEase Contracts (AlgoPy)

AlgoPy / Puya smart contracts for AlgoEase ([Puya](https://github.com/algorandfoundation/puya), [language guide](https://algorandfoundation.github.io/puya/)).

## Layout

- `src/escrow_contract.py` — trustless client / freelancer ALGO escrow (`EscrowContract`).
- `tests/` — pytest (optional compile check when `algokit` is on PATH).

## Setup

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Requires **Python 3.11+**. For compilation and ARC-56 output, install [AlgoKit CLI](https://github.com/algorandfoundation/algokit-cli) and run:

```bash
algokit compile py src/escrow_contract.py --no-output-teal
```

Typical client flow (atomic groups as needed):

1. **create_escrow**(freelancer, escrow_microalgos, **Payment** to the app account for that amount) — caller becomes **client**; funds are locked in the app.
2. **submit_work**(IPFS CID string) — **freelancer** only; state **submitted**.
3. **approve** — **client** only; state **approved**.
4. **release_payment** — **freelancer** only; inner payment of locked microalgos after **approve**.

**refund** — **client** only while status is **created** or **submitted** (not after **approve**).

The app’s minimum balance must remain funded (often by the deployer or an extra seed payment) so escrow principal can be routed out without violating MBR. `deliverable_cid` is limited to **128 bytes** (UTF-8) to fit default global state sizing.

## Notes

- Language: **AlgoPy** (compiled by Puya via `algokit compile py`). No PyTEAL in this tree.
- Target chain: **Algorand**.
