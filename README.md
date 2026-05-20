# AlgoEase v2

A decentralized escrow platform for freelance payments on Algorand, where all money movement (deposit, release, refund) happens exclusively via the **x402 payment protocol**. Every ALGO or USDC-A that enters or exits an escrow contract is settled as an x402 transaction verified by the GoPlausible facilitator.

## Architecture

```
┌──────────────┐         ┌──────────────┐        ┌──────────────────┐
│   Frontend   │◄───────►│  Backend API │◄──────►│  Algorand Chain  │
│  (TanStack)  │  HTTP   │  (Express)   │  ATC   │  (BoxMap Escrow) │
└──────┬───────┘         └──────┬───────┘        └──────────────────┘
       │                        │
       │  Realtime              │  Verify x402
       ▼                        ▼
┌──────────────┐         ┌──────────────────┐
│   Supabase   │         │   GoPlausible    │
│  (Postgres)  │         │  (Facilitator)   │
└──────────────┘         └──────────────────┘
```

**x402 Flow:**
1. Frontend calls a money-moving endpoint (e.g., `POST /escrow/create`)
2. Backend responds with `HTTP 402` + payment payload (amount, payTo, asset)
3. Frontend prompts user to sign a payment transaction via Pera/Defly wallet
4. Frontend retries request with signed txn in `X-Payment` header
5. Backend verifies payment with GoPlausible facilitator
6. Backend executes the atomic on-chain group (payment + ABI call)
7. Supabase stores metadata + fires Realtime updates to frontend

## Tech Stack

| Layer | Choice |
|-------|--------|
| Smart Contracts | AlgoPy (ARC-4 ABI, BoxMap multi-escrow) |
| Backend | Node.js + TypeScript + Express |
| x402 Integration | GoPlausible facilitator (`@x402-avm/*`) |
| Frontend | React 19 + TanStack Router + Vite |
| Wallet | Pera + Defly via `@txnlab/use-wallet` |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | Supabase (Postgres + Realtime) |
| Chain Access | AlgoNode (testnet/mainnet) |
| Monorepo | npm workspaces |

## Escrow Lifecycle (Hybrid)

```
OPEN → ACCEPTED → SUBMITTED → APPROVED → RELEASED
  │        │          │
  └────────┴──────────┴──────→ REFUNDED (client, after deadline)
```

| Status | Triggered by | x402 Required |
|--------|-------------|---------------|
| OPEN | `create_escrow` (client deposits) | Yes |
| ACCEPTED | `accept_task` (freelancer) | No |
| SUBMITTED | `submit_work` (freelancer + IPFS CID) | No |
| REJECTED | `reject_work` (client rejects submission → refund) | No (wallet-signed) |
| APPROVED | `approve` (client reviews work) | No (wallet-signed) |
| RELEASED | `release_payment` (funds → freelancer) | No (wallet-signed) |
| REFUNDED | `refund` (funds → client) | No (wallet-signed) |

## Local Setup

### Prerequisites

- Node.js 20+
- Python 3.11+
- AlgoKit CLI (for LocalNet / Puya compiler)
- A Supabase project (free tier works)

### Install

```bash
npm install
```

### Environment

Copy env examples and fill in your values:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Key variables:
- `ALGORAND_APP_ID` — deployed escrow app ID on testnet
- `DEPLOYER_MNEMONIC` — testnet account for deploy/dev signing (never use in prod)
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — backend DB access
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — frontend Realtime

### Database

Apply the migration to your Supabase project:

```bash
# Via Supabase CLI
cd backend
npx supabase db push

# Or manually run: backend/supabase/migrations/001_init.sql
```

### Smart Contract

```bash
# Run tests
npm run contracts:test

# Compile to TEAL (requires AlgoKit / Puya)
npm run contracts:compile

# Deploy to testnet
npm run scripts:deploy
```

### Development

```bash
# Backend (port 3001)
npm run dev:backend

# Frontend (port 5173)
npm run dev:frontend
```

## API Reference

### `POST /escrow/create` (x402 gated)

Creates escrow and locks funds on-chain.

```bash
# First request → 402
curl -X POST http://localhost:3001/escrow/create \
  -H "Content-Type: application/json" \
  -d '{"task_id":"task-1","title":"Build NFT contract","description":"...","freelancer_address":"ALGO...","deadline_hours":72,"amount":"5","asset":"ALGO"}'

# Response: HTTP 402
# {
#   "version": "1.0",
#   "accepts": [{
#     "scheme": "exact",
#     "network": "algorand-testnet",
#     "maxAmountRequired": "5000000",
#     "payTo": "APP_ADDRESS...",
#     "asset": "ALGO",
#     ...
#   }]
# }

# Sign the payment → retry with X-Payment header
curl -X POST http://localhost:3001/escrow/create \
  -H "Content-Type: application/json" \
  -H "X-Payment: BASE64_SIGNED_TXN" \
  -d '{"task_id":"task-1","title":"Build NFT contract",...}'

# Response: HTTP 200
# { "action": "create", "txIds": ["TX_ID_1", "TX_ID_2"], "taskId": "task-1" }
```

### `GET /escrow/:task_id`

Returns escrow state from Supabase + event history.

### `POST /escrow/:task_id/accept`

Freelancer accepts (no payment required).

### `POST /escrow/:task_id/submit`

Freelancer submits IPFS CID of deliverable.

### `POST /escrow/:task_id/approve`

Client approves work (wallet-signed).

### `POST /escrow/:task_id/reject`

Client rejects submitted work; funds return to client immediately (wallet-signed).

### `POST /escrow/:task_id/release`

Releases funds to freelancer after approval.

### `POST /escrow/:task_id/refund`

Refunds client (OPEN/ACCEPTED anytime; SUBMITTED only after deadline).

### `GET /api/bounties`

Lists all bounties from Supabase.

## E2E Test

Run the full lifecycle on testnet:

```bash
npm run e2e
```

This creates an escrow, accepts, submits work, approves, and releases — verifying each status transition on-chain.

## Project Structure

```
algoease-v2/
├── contracts/
│   ├── algoease_escrow/        # New BoxMap contract
│   │   ├── contract.py
│   │   ├── deploy_config.py
│   │   └── tests/test_escrow.py
│   ├── src/                    # Legacy single-escrow (preserved)
│   └── pyproject.toml
├── backend/
│   ├── src/
│   │   ├── middleware/x402.ts  # x402 enforcement
│   │   ├── services/           # algorand, facilitator, ipfs
│   │   ├── routes/             # escrow (task-scoped), bounties
│   │   └── db/                 # supabase client + types
│   └── supabase/migrations/
├── frontend/
│   ├── src/
│   │   ├── hooks/              # useX402Payment, useEscrow, useAlgorand
│   │   ├── lib/api.ts          # 402-aware fetch wrapper
│   │   ├── components/         # PaymentRequiredModal, EscrowSteps, etc.
│   │   └── routes/             # TanStack file-based routes
├── shared/                     # TypeScript types (Bounty, X402Payload, etc.)
├── scripts/                    # deploy, e2e-test
└── package.json                # npm workspaces root
```

## License

MIT — Aditya Singh, AlgoEase
