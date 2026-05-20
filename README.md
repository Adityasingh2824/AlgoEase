# AlgoEase v2 🚀

<div align="center">

![Algorand](https://img.shields.io/badge/Algorand-Testnet-00D494?style=for-the-badge&logo=algorand&logoColor=white)
![Version](https://img.shields.io/badge/Version-2.0.0-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)

**App ID:** `762856134` • [View on Explorer](https://testnet.explorer.perawallet.app/application/762856134/)

</div>

---

> A decentralized escrow platform for freelance payments on Algorand, powered by the **x402 payment protocol**

AlgoEase v2 is a trustless escrow system that enables secure freelance payments on the Algorand blockchain. Built with AlgoPy smart contracts and integrated with the x402 payment protocol, it provides a seamless experience for clients and freelancers to transact with confidence.

## 📑 Table of Contents

- [Key Features](#-key-features)
- [Quick Links](#-quick-links)
- [Architecture](#-architecture)
- [Deployed Contracts](#-deployed-contracts)
- [Tech Stack](#️-tech-stack)
- [Smart Contract Documentation](#-smart-contract-documentation)
- [Escrow Lifecycle](#-escrow-lifecycle)
- [Getting Started](#-getting-started)
- [Environment Setup](#️-environment-setup)
- [Database Setup](#️-database-setup)
- [Smart Contract Setup](#-smart-contract-setup)
- [Development](#-development)
- [API Reference](#-api-reference)
- [Project Structure](#-project-structure)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [Additional Resources](#-additional-resources)
- [Roadmap](#️-roadmap)
- [License](#-license)
- [Contact & Support](#-contact--support)

---

## 🌟 Key Features

- **Multi-Asset Support**: ALGO and USDC-A (testnet) payments
- **x402 Payment Protocol**: All money movements verified by GoPlausible facilitator
- **BoxMap Storage**: One contract handles unlimited escrows efficiently
- **Open Bounties**: Post tasks publicly or assign to specific freelancers
- **Hybrid Lifecycle**: Flexible workflow from task creation to payment release
- **Real-time Updates**: Live status tracking via Supabase Realtime
- **Wallet Integration**: Pera & Defly wallet support

---

## 🔗 Quick Links

### Testnet Contract
- **App ID**: `762856134`
- **Address**: `PPBVQIUUEMYH7EYSJ4QJ5HGT2LZADEDAEKJPUZQ4EQQZQ3K6MLRKAHUJOE`
- 🔍 [View on Pera Explorer](https://testnet.explorer.perawallet.app/application/762856134/)
- 🔍 [Recent Transactions](https://testnet.algoexplorer.io/application/762856134/transactions)

### Resources
- 💰 [Testnet Faucet](https://bank.testnet.algorand.network/) - Get free testnet ALGOs
- 📖 [AlgoPy Docs](https://algorandfoundation.github.io/puya/) - Smart contract language
- 🔌 [x402 Protocol](https://github.com/GoPlausible/x402) - Payment specification
- 🧪 [AlgoNode API](https://nodely.io/docs/free/start) - Public node endpoints

### Development
- 🐛 [Report Issues](https://github.com/yourusername/algoease-v2/issues)
- 💬 [Discussions](https://github.com/yourusername/algoease-v2/discussions)
- 📚 [Full Documentation](#-table-of-contents)

---

## 📐 Architecture

### System Overview

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

### x402 Payment Flow

The x402 protocol ensures payment atomicity by coupling HTTP requests with blockchain transactions:

1. **Initial Request**: Frontend calls money-moving endpoint (e.g., `POST /escrow/create`)
2. **Payment Challenge**: Backend responds with `HTTP 402` + payment payload (amount, payTo, asset)
3. **User Signature**: Frontend prompts user to sign transaction via Pera/Defly wallet
4. **Retry with Payment**: Frontend retries request with signed txn in `X-Payment` header
5. **Verification**: Backend verifies payment with GoPlausible facilitator
6. **Atomic Execution**: Backend executes atomic transaction group (payment + ABI call)
7. **State Persistence**: Supabase stores metadata + fires Realtime updates to frontend

### Component Responsibilities

| Component | Role | Technology |
|-----------|------|------------|
| **Smart Contract** | Escrow logic, fund custody, status transitions | AlgoPy (ARC-4) |
| **Backend API** | x402 enforcement, transaction building, state management | Node.js + Express |
| **Frontend** | Wallet integration, UI, x402 payment flow | React 19 + TanStack Router |
| **Supabase** | Off-chain metadata, event history, real-time subscriptions | Postgres + Realtime |
| **GoPlausible** | x402 payment verification | Facilitator Service |

---

## 🌐 Deployed Contracts

### Testnet Deployment

<div align="center">

```
╔═══════════════════════════════════════════════════════════════╗
║              ALGOEASE V2 - TESTNET DEPLOYMENT                 ║
╠═══════════════════════════════════════════════════════════════╣
║  App ID:       762856134                                      ║
║  Address:      PPBVQIUUEMYH7EYSJ4QJ5HGT2LZADEDAEKJPUZQ4EQ... ║
║  Network:      Algorand Testnet                               ║
║  Status:       🟢 Active                                       ║
║  USDC Asset:   10458941 (USDC-A)                              ║
╚═══════════════════════════════════════════════════════════════╝
```

</div>

| Property | Value |
|----------|-------|
| **App ID** | `762856134` |
| **Contract Address** | `PPBVQIUUEMYH7EYSJ4QJ5HGT2LZADEDAEKJPUZQ4EQQZQ3K6MLRKAHUJOE` |
| **Network** | Algorand Testnet |
| **Creation Tx** | [View on AlgoExplorer](https://testnet.explorer.perawallet.app/application/762856134/) |
| **USDC Asset ID** | `10458941` (USDC-A testnet) |
| **Status** | ✅ Active |

**Explorer Links:**
- 🔍 [AlgoExplorer](https://testnet.algoexplorer.io/application/762856134)
- 🔍 [Pera Explorer](https://testnet.explorer.perawallet.app/application/762856134/)
- 🔍 [GoalSeeker](https://goalseeker.purestake.io/algorand/testnet/application/762856134)
- 🔍 [NFDomains](https://app.nf.domains/search/?query=762856134&view=simple&network=testnet)

**Contract Capabilities:**
- ✅ Multi-escrow BoxMap storage
- ✅ ALGO native payments
- ✅ USDC-A (ASA) payments
- ✅ x402 payment protocol integration
- ✅ Open bounty support
- ✅ Deadline-based refunds
- ✅ Immediate rejection refunds

### Mainnet Deployment

| Property | Value |
|----------|-------|
| **App ID** | 🚧 Not yet deployed |
| **Contract Address** | 🚧 Pending |
| **Network** | Algorand Mainnet |
| **Status** | 📋 Planned for Phase 3 |

> **Note**: Mainnet deployment is planned after security audit completion. See [Roadmap](#-roadmap) for details.

### Verify Deployment

You can verify the contract deployment using AlgoSDK:

```bash
# Using algokit
algokit explore application 762856134 --network testnet

# Or via curl
curl https://testnet-api.algonode.cloud/v2/applications/762856134
```

**Contract ABI:**
The full ARC-4 ABI contract specification is available at:
- `contracts/algoease_escrow/build/EscrowContract.arc32.json`
- Or view on [AlgoExplorer ABI tab](https://testnet.explorer.perawallet.app/application/762856134/)

### Recent Transactions

View recent escrow activity:
- [All Transactions](https://testnet.algoexplorer.io/application/762856134/transactions)
- [Application Calls](https://testnet.explorer.perawallet.app/application/762856134/)

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Smart Contracts** | AlgoPy (Puya) | ARC-4 ABI, BoxMap multi-escrow storage |
| **Backend** | Node.js + TypeScript + Express | REST API, x402 middleware, transaction building |
| **x402 Integration** | GoPlausible (`@x402-avm/*`) | Payment protocol verification |
| **Frontend** | React 19 + TanStack Router + Vite | SPA with file-based routing |
| **Wallet** | Pera + Defly | Via `@txnlab/use-wallet` |
| **Styling** | Tailwind CSS v4 + shadcn/ui | Utility-first CSS + component library |
| **Database** | Supabase | Postgres + Realtime subscriptions |
| **Chain Access** | AlgoNode | Testnet/mainnet RPC endpoints |
| **Monorepo** | npm workspaces | Shared types, coordinated scripts |

---

## 📊 Smart Contract Documentation

### Contract Overview

**Contract Type**: Multi-escrow with BoxMap storage  
**Language**: AlgoPy (Puya compiler)  
**ABI Standard**: ARC-4  
**Storage**: Box storage (one box per escrow, keyed by `task_id`)

### Key Features

- **Single Deployment**: One contract instance handles unlimited escrows
- **Multi-Asset**: Supports ALGO (native) and ASAs (USDC-A)
- **Open Bounties**: Freelancer address can be `zero_address` for public tasks
- **Deadline Enforcement**: Time-based refund protection for clients
- **Atomic Operations**: All state changes happen on-chain

### Contract Structure

```python
class EscrowRecord(arc4.Struct):
    client: arc4.Address           # Client who created escrow
    freelancer: arc4.Address       # Freelancer (or zero_address for open)
    amount: arc4.UInt64            # Locked amount (ALGO or ASA)
    usdc_asset_id: arc4.UInt64     # ASA ID (0 for ALGO)
    status: arc4.UInt64            # Current status code (1-6)
    ipfs_hash: arc4.String         # Work submission CID
    created_at: arc4.UInt64        # Unix timestamp
    deadline: arc4.UInt64          # Unix timestamp
```

### Status Codes

| Code | Status | Description |
|------|--------|-------------|
| `1` | `OPEN` | Escrow created, funds locked, awaiting acceptance |
| `2` | `ACCEPTED` | Freelancer accepted task |
| `3` | `SUBMITTED` | Freelancer submitted work (IPFS CID) |
| `4` | `APPROVED` | Client approved work |
| `5` | `RELEASED` | Funds released to freelancer (terminal) |
| `6` | `REFUNDED` | Funds returned to client (terminal) |

### ABI Methods

#### Administrative Methods

```python
@arc4.abimethod
def configure(usdc_asset_id: arc4.UInt64) -> None
```
- **Caller**: Contract creator only
- **Purpose**: Set USDC asset ID for the contract
- **Call Once**: During initial setup

```python
@arc4.abimethod
def opt_in_asset(asset: Asset) -> None
```
- **Caller**: Contract creator only
- **Purpose**: Opt contract into ASA (required before receiving USDC)

#### Escrow Creation

```python
@arc4.abimethod
def create_escrow(
    task_id: arc4.String,
    freelancer: arc4.Address,
    deadline: arc4.UInt64,
    usdc_asset_id: arc4.UInt64,
    fund: gtxn.PaymentTransaction
) -> None
```
- **Atomic Group**: Must be grouped with ALGO payment to app
- **Validates**: Amount > 0, payment to app, no rekey/close
- **Creates**: New escrow box with status `OPEN`

```python
@arc4.abimethod
def create_escrow_usdc(
    task_id: arc4.String,
    freelancer: arc4.Address,
    deadline: arc4.UInt64,
    usdc_asset_id: arc4.UInt64,
    fund: gtxn.AssetTransferTransaction
) -> None
```
- **Atomic Group**: Must be grouped with ASA transfer to app
- **For**: USDC-A payments

#### Task Lifecycle

```python
@arc4.abimethod
def accept_task(task_id: arc4.String) -> None
```
- **Transition**: `OPEN` → `ACCEPTED`
- **Caller**: Freelancer (or claims if open bounty)
- **Effect**: Locks freelancer address if open bounty

```python
@arc4.abimethod
def submit_work(task_id: arc4.String, ipfs_cid: arc4.String) -> None
```
- **Transition**: `ACCEPTED` → `SUBMITTED`
- **Caller**: Freelancer only
- **Stores**: IPFS CID of deliverable

```python
@arc4.abimethod
def approve(task_id: arc4.String) -> None
```
- **Transition**: `SUBMITTED` → `APPROVED`
- **Caller**: Client only
- **Effect**: Work accepted, ready for release

```python
@arc4.abimethod
def reject_work(task_id: arc4.String) -> None
```
- **Transition**: `SUBMITTED` → `REFUNDED`
- **Caller**: Client only
- **Effect**: Immediate refund to client, box deleted

#### Payment Release

```python
@arc4.abimethod
def release_payment(task_id: arc4.String) -> None
```
- **Transition**: `APPROVED` → `RELEASED`
- **Caller**: Client only
- **Effect**: Sends funds to freelancer, box deleted

```python
@arc4.abimethod
def refund(task_id: arc4.String) -> None
```
- **Transition**: `OPEN/ACCEPTED/SUBMITTED` → `REFUNDED`
- **Caller**: Client only
- **Conditions**:
  - `OPEN` or `ACCEPTED`: Anytime
  - `SUBMITTED`: Only after deadline passed
- **Effect**: Returns funds to client, box deleted

#### Read Methods

```python
@arc4.abimethod(readonly=True)
def get_status(task_id: arc4.String) -> arc4.UInt64
```
- **Returns**: Current status code (1-6)
- **No State Change**: Read-only query

### Security Features

- **Rekey Protection**: All methods reject transactions with `rekey_to` set
- **Close Remainder Protection**: Payments cannot close accounts
- **Balance Verification**: Ensures contract has sufficient liquidity before payout
- **Deadline Enforcement**: Clients cannot refund `SUBMITTED` work before deadline
- **Role Enforcement**: Only authorized parties can call state-changing methods
- **Box MBR Release**: Deleting box releases minimum balance requirement

---

## 🔄 Escrow Lifecycle

### State Machine

```
         ┌─────────────────────────────────────┐
         │                                     │
         ▼                                     │
      [OPEN] ──────► [ACCEPTED] ──────► [SUBMITTED] ──────► [APPROVED] ──────► [RELEASED]
         │               │                  │                     │
         │               │                  │                     │
         └───────────────┴──────────────────┴─────────────────────┴──────────► [REFUNDED]
                                            (after deadline)
```

### Status Transitions

| Status | Triggered By | Action | x402 Required | Notes |
|--------|-------------|--------|---------------|-------|
| **OPEN** | `create_escrow` | Client deposits funds | ✅ Yes | Initial state, funds locked |
| **ACCEPTED** | `accept_task` | Freelancer accepts | ❌ No | Freelancer commits to work |
| **SUBMITTED** | `submit_work` | Freelancer submits IPFS CID | ❌ No | Work delivered for review |
| **APPROVED** | `approve` | Client approves work | ❌ No | Work accepted, ready for payout |
| **RELEASED** | `release_payment` | Client releases payment | ❌ No | Funds sent to freelancer (terminal) |
| **REFUNDED** | `refund` or `reject_work` | Client gets refund | ❌ No | Funds returned to client (terminal) |

### Refund Rules

| Current Status | Refund Allowed | Condition |
|----------------|----------------|-----------|
| `OPEN` | ✅ Always | Anytime before acceptance |
| `ACCEPTED` | ✅ Always | Anytime before submission |
| `SUBMITTED` | ⏰ Conditional | Only after deadline passes |
| `APPROVED` | ❌ Never | Work approved, must release |
| `RELEASED` | ❌ Never | Terminal state |
| `REFUNDED` | ❌ Never | Terminal state |

### Rejection Flow

Client can explicitly reject submitted work:
- **From**: `SUBMITTED` status
- **Effect**: Immediate refund to client (bypasses `APPROVED` state)
- **Method**: `reject_work(task_id)`

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Purpose | Installation |
|------|---------|---------|--------------|
| **Node.js** | 20.x or higher | Runtime for backend/frontend | [nodejs.org](https://nodejs.org) |
| **npm** | 10.x or higher | Package manager | Comes with Node.js |
| **Python** | 3.11+ | Smart contract development | [python.org](https://python.org) |
| **AlgoKit** | Latest | Puya compiler, LocalNet | `pipx install algokit` |
| **Git** | Latest | Version control | [git-scm.com](https://git-scm.com) |

**Optional but Recommended:**
- **AlgoKit LocalNet** (Docker-based Algorand sandbox)
- **Supabase CLI** (for database migrations)

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/algoease-v2.git
cd algoease-v2

# 2. Install dependencies
npm install

# 3. Set up environment variables (see Environment Setup below)
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 4. Configure your environment files
# Edit .env, backend/.env, and frontend/.env with your values

# 5. Set up database (see Database Setup below)
cd backend
npx supabase db push
cd ..

# 6. Start development servers
npm run dev
```

Your application will be available at:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001

---

## ⚙️ Environment Setup

### Root `.env`

Main configuration file for shared values:

```bash
# Algorand Network Configuration
ALGORAND_NETWORK=testnet                           # or mainnet
ALGOD_TOKEN=                                       # Leave empty for AlgoNode
ALGOD_SERVER=https://testnet-api.algonode.cloud   # Public AlgoNode endpoint
ALGOD_PORT=443
INDEXER_SERVER=https://testnet-idx.algonode.cloud

# Deployed Smart Contract
ALGORAND_APP_ID=762856134                          # Your deployed app ID
ESCROW_APP_ID=762856134                            # Alias for ALGORAND_APP_ID
DEPLOYER_MNEMONIC=your 25 word mnemonic here       # For deployment only (testnet)

# x402 Payment Protocol
X402_FACILITATOR_URL=https://facilitator.goplausible.xyz
X402_NETWORK=algorand-testnet

# Assets
USDC_ASSET_ID=10458941                             # USDC-A on testnet

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co             # Your project URL
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key    # From Supabase dashboard
SUPABASE_ANON_KEY=your_anon_key                    # From Supabase dashboard

# IPFS Storage
NFT_STORAGE_API_KEY=your_nft_storage_key           # From nft.storage
```

### Backend `.env`

Backend-specific configuration:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173

# Algorand (inherits from root .env)
ALGORAND_NETWORK=testnet
ALGORAND_ALGOD_TOKEN=
ALGORAND_ALGOD_SERVER=https://testnet-api.algonode.cloud
ALGORAND_ALGOD_PORT=443
INDEXER_SERVER=https://testnet-idx.algonode.cloud
ALGORAND_APP_ID=762856134
ESCROW_APP_ID=762856134
ALGORAND_DEFAULT_MNEMONIC=                         # Backend signing mnemonic

# x402
X402_FACILITATOR_URL=https://facilitator.goplausible.xyz
X402_NETWORK=algorand-testnet

# USDC
USDC_ASSET_ID=10458941

# Supabase (service role for writes)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# IPFS
NFT_STORAGE_API_KEY=your_nft_storage_key
```

### Frontend `.env`

Frontend-specific configuration (all variables must be prefixed with `VITE_`):

```bash
# Backend API
VITE_BACKEND_URL=http://localhost:3001

# Algorand
VITE_ALGORAND_NETWORK=testnet
VITE_ALGORAND_APP_ID=762856134                     # Must match backend
VITE_USDC_ASSET_ID=10458941

# Supabase (anon key for Realtime)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key               # Public key, safe for frontend

# Development
VITE_PLACEHOLDER_FREELANCER_ADDRESS=VALID_TESTNET_ADDRESS  # For demo bounties
```

### Getting API Keys

#### Supabase

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to **Settings** → **API**
4. Copy:
   - `SUPABASE_URL` (Project URL)
   - `SUPABASE_ANON_KEY` (anon public)
   - `SUPABASE_SERVICE_ROLE_KEY` (service_role - keep secret!)

#### NFT.Storage (IPFS)

1. Sign up at [nft.storage](https://nft.storage)
2. Go to **API Keys**
3. Create new API key
4. Copy token to `NFT_STORAGE_API_KEY`

#### Testnet Mnemonic

```bash
# Using AlgoKit
algokit account generate --name deployer

# Save the 25-word mnemonic to DEPLOYER_MNEMONIC
# Fund account at: https://bank.testnet.algorand.network/
```

---

## 🗄️ Database Setup

### Option 1: Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
cd backend
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push

# Generate TypeScript types (optional)
npm run db:types
```

### Option 2: Manual Migration

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open `backend/supabase/migrations/001_init.sql`
4. Copy and paste the SQL into the editor
5. Run the migration

### Database Schema

The migration creates:

- **`bounties`** table: Off-chain metadata for escrows
  - `task_id` (PK): Unique identifier
  - `title`, `description`: Task details
  - `client_address`, `freelancer_address`: Participant addresses
  - `amount`, `asset`: Payment details
  - `status`: Current state
  - `ipfs_cid`: Work submission hash
  - `created_at`, `updated_at`: Timestamps
  - `deadline`: Unix timestamp for refund eligibility

- **`events`** table: Event history log
  - `id` (PK): Auto-increment
  - `task_id` (FK): References bounties
  - `event_type`: Action type (created, accepted, etc.)
  - `actor_address`: Who triggered the event
  - `tx_id`: Algorand transaction ID
  - `timestamp`: When it occurred

---

## 📦 Smart Contract Setup

### Compile Contracts

```bash
# Run Python tests
npm run contracts:test

# Compile AlgoPy to TEAL
npm run contracts:compile

# Check Python syntax
npm run contracts:check
```

**Output**: Compiled TEAL files in `contracts/algoease_escrow/build/`

### Deploy to Testnet

```bash
# 1. Ensure DEPLOYER_MNEMONIC is funded
# Fund at: https://bank.testnet.algorand.network/

# 2. Run deployment script
npm run scripts:deploy

# 3. Copy the app ID from output
# Update ALGORAND_APP_ID in all .env files

# 4. Configure the contract
npm run scripts:fund-app  # Fund contract for box storage

# 5. Opt contract into USDC (manual via AlgoKit)
```

### Deployment Script Flow

The `scripts/src/deploy.ts` script:

1. Compiles contract if needed
2. Creates application on testnet
3. Calls `configure(usdc_asset_id)`
4. Calls `opt_in_asset(USDC_ASSET_ID)`
5. Funds contract with 1 ALGO
6. Outputs app ID and address

**Example Output:**
```
✅ Contract deployed successfully!

📋 Deployment Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
App ID:       762856134
Address:      PPBVQIUUEMYH7EYSJ4QJ5HGT2LZADEDAEKJPUZQ4EQQZQ3K6MLRKAHUJOE
Network:      testnet
Txn ID:       ABCD1234EFGH5678IJKL9012MNOP3456QRST7890UVWX1234YZAB5678
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 Explorer Links:
• AlgoExplorer: https://testnet.algoexplorer.io/application/762856134
• Pera Explorer: https://explorer.perawallet.app/application/762856134/?network=testnet
• Transaction: https://testnet.algoexplorer.io/tx/ABCD1234EFGH5678...

⚠️  Update your .env files with this App ID:
   ALGORAND_APP_ID=762856134
   ESCROW_APP_ID=762856134
   VITE_ALGORAND_APP_ID=762856134
```

### Get Contract Address

To get the contract address from an App ID:

```bash
# Using Python
python -c "import algosdk; print(algosdk.logic.get_application_address(762856134))"

# Using algokit
algokit explore application 762856134 --network testnet
```

---

## 🔨 Development

### Start Development Servers

```bash
# Both servers concurrently
npm run dev

# Or individually:
npm run dev:backend   # Port 3001
npm run dev:frontend  # Port 5173
```

### Build for Production

```bash
# Build all workspaces
npm run build

# Or individually:
npm run build:backend   # Compiles TypeScript to dist/
npm run build:frontend  # Vite production build to dist/
```

### Run Tests

```bash
# Smart contract tests (Python)
npm run contracts:test

# E2E integration test (testnet)
npm run e2e
```

### Linting

```bash
# Lint all workspaces
npm run lint
```

---

## 📡 API Reference

Base URL: `http://localhost:3001` (development)

### Health Check

#### `GET /health`

Returns API status.

**Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": 1234567890,
  "network": "testnet",
  "appId": "762856134"
}
```

---

### Escrow Endpoints

#### `POST /escrow/create` 🔒 x402 Gated

Creates new escrow and locks funds on-chain.

**Request Body**:
```json
{
  "task_id": "task-123",
  "title": "Build NFT marketplace",
  "description": "Full-stack NFT marketplace with wallet integration",
  "freelancer_address": "ALGO_ADDRESS_OR_EMPTY_FOR_OPEN",
  "deadline_hours": 72,
  "amount": "5",
  "asset": "ALGO"
}
```

**x402 Flow**:

1️⃣ **First Request** (no payment):

```bash
curl -X POST http://localhost:3001/escrow/create \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": "task-1",
    "title": "Build NFT contract",
    "description": "ERC721-style contract on Algorand",
    "freelancer_address": "",
    "deadline_hours": 72,
    "amount": "5",
    "asset": "ALGO"
  }'
```

**Response** (402 Payment Required):
```json
{
  "version": "1.0",
  "accepts": [{
    "scheme": "exact",
    "network": "algorand-testnet",
    "maxAmountRequired": "5000000",
    "payTo": "APP_ADDRESS_HERE",
    "asset": "ALGO",
    "memo": "task-1"
  }]
}
```

2️⃣ **Retry with Signed Payment**:

```bash
curl -X POST http://localhost:3001/escrow/create \
  -H "Content-Type: application/json" \
  -H "X-Payment: BASE64_SIGNED_TXN" \
  -d '{ ... same request body ... }'
```

**Response** (200 OK):
```json
{
  "action": "create",
  "txIds": ["TXN_ID_1", "TXN_ID_2"],
  "taskId": "task-1"
}
```

---

#### `GET /escrow/:task_id`

Retrieves escrow details and event history.

**Response** (200 OK):
```json
{
  "escrow": {
    "task_id": "task-1",
    "title": "Build NFT contract",
    "client_address": "CLIENT_ALGO_ADDRESS",
    "freelancer_address": "FREELANCER_ALGO_ADDRESS",
    "amount": "5000000",
    "asset": "ALGO",
    "status": "ACCEPTED",
    "deadline": 1234567890,
    "created_at": "2026-05-20T10:00:00Z"
  },
  "events": [
    {
      "event_type": "created",
      "actor_address": "CLIENT_ALGO_ADDRESS",
      "tx_id": "TXN_ID",
      "timestamp": "2026-05-20T10:00:00Z"
    }
  ]
}
```

---

#### `POST /escrow/:task_id/accept`

Freelancer accepts the task.

**Request Body**: (empty or `{}`)

**Authorization**: Caller must be:
- Specified freelancer address, OR
- Any address (if open bounty)

**Response** (200 OK):
```json
{
  "action": "accept",
  "txIds": ["TXN_ID"],
  "taskId": "task-1"
}
```

---

#### `POST /escrow/:task_id/submit`

Freelancer submits deliverable.

**Request Body**:
```json
{
  "ipfs_cid": "QmXxx..."
}
```

**Authorization**: Caller must be freelancer

**Response** (200 OK):
```json
{
  "action": "submit",
  "txIds": ["TXN_ID"],
  "taskId": "task-1",
  "ipfsCid": "QmXxx..."
}
```

---

#### `POST /escrow/:task_id/approve`

Client approves submitted work.

**Request Body**: (empty or `{}`)

**Authorization**: Caller must be client

**Response** (200 OK):
```json
{
  "action": "approve",
  "txIds": ["TXN_ID"],
  "taskId": "task-1"
}
```

---

#### `POST /escrow/:task_id/reject`

Client rejects submitted work (immediate refund).

**Request Body**: (empty or `{}`)

**Authorization**: Caller must be client

**Response** (200 OK):
```json
{
  "action": "reject",
  "txIds": ["TXN_ID"],
  "taskId": "task-1",
  "refundedTo": "CLIENT_ALGO_ADDRESS",
  "amount": "5000000"
}
```

---

#### `POST /escrow/:task_id/release`

Client releases payment to freelancer.

**Request Body**: (empty or `{}`)

**Authorization**: Caller must be client

**Response** (200 OK):
```json
{
  "action": "release",
  "txIds": ["TXN_ID"],
  "taskId": "task-1",
  "paidTo": "FREELANCER_ALGO_ADDRESS",
  "amount": "5000000"
}
```

---

#### `POST /escrow/:task_id/refund`

Client requests refund.

**Request Body**: (empty or `{}`)

**Authorization**: Caller must be client

**Conditions**:
- Status is `OPEN` or `ACCEPTED`: Always allowed
- Status is `SUBMITTED`: Only after deadline

**Response** (200 OK):
```json
{
  "action": "refund",
  "txIds": ["TXN_ID"],
  "taskId": "task-1",
  "refundedTo": "CLIENT_ALGO_ADDRESS",
  "amount": "5000000"
}
```

---

### Bounty Endpoints

#### `GET /api/bounties`

Lists all bounties.

**Query Parameters**:
- `status` (optional): Filter by status (OPEN, ACCEPTED, etc.)
- `limit` (optional): Max results (default: 50)
- `offset` (optional): Pagination offset

**Response** (200 OK):
```json
{
  "bounties": [
    {
      "task_id": "task-1",
      "title": "Build NFT contract",
      "description": "...",
      "amount": "5000000",
      "asset": "ALGO",
      "status": "OPEN",
      "created_at": "2026-05-20T10:00:00Z"
    }
  ],
  "total": 1
}
```

---

### Error Responses

#### 400 Bad Request
```json
{
  "error": "Invalid task_id format"
}
```

#### 402 Payment Required (x402)
```json
{
  "version": "1.0",
  "accepts": [{ ... }]
}
```

#### 403 Forbidden
```json
{
  "error": "Only client can approve work"
}
```

#### 404 Not Found
```json
{
  "error": "Escrow not found"
}
```

#### 409 Conflict
```json
{
  "error": "Task already in SUBMITTED state"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Transaction failed",
  "details": "..."
}
```

---

### Transaction Tracking

All successful API responses include transaction IDs (`txIds` array) that can be used to track on-chain execution.

**Example Response with Transaction IDs:**
```json
{
  "action": "create",
  "txIds": [
    "ABCD1234EFGH5678IJKL9012MNOP3456QRST7890UVWX1234YZAB5678",
    "ZYXW9876VUUT5432SRQP1098ONML7654KJII3210HGFF9876EDCC5432"
  ],
  "taskId": "task-1"
}
```

**Track Transaction on Explorers:**

Replace `{txId}` with the transaction ID from the response:

- **AlgoExplorer**: `https://testnet.algoexplorer.io/tx/{txId}`
- **Pera Explorer**: `https://explorer.perawallet.app/tx/{txId}/?network=testnet`
- **GoalSeeker**: `https://goalseeker.purestake.io/algorand/testnet/tx/{txId}`

**Example:**
```
https://testnet.algoexplorer.io/tx/ABCD1234EFGH5678IJKL9012MNOP3456QRST7890UVWX1234YZAB5678
```

**Transaction Group:**
Most escrow operations create an atomic transaction group. The first txId is typically the payment, and the second is the application call. View the group on AlgoExplorer by clicking "Group" in the transaction details.

**Verify Transaction Status:**
```bash
# Using curl
curl "https://testnet-api.algonode.cloud/v2/transactions/ABCD1234...?format=json"

# Check if confirmed
curl "https://testnet-idx.algonode.cloud/v2/transactions/ABCD1234..."
```

---

## 📁 Project Structure

```
algoease-v2/
├── contracts/                          # Smart contracts (AlgoPy)
│   ├── algoease_escrow/                # Main multi-escrow contract
│   │   ├── contract.py                 # EscrowContract implementation
│   │   ├── deploy_config.py            # Deployment configuration
│   │   ├── build/                      # Compiled TEAL output
│   │   │   ├── EscrowContract.approval.teal
│   │   │   └── EscrowContract.clear.teal
│   │   └── tests/
│   │       └── test_escrow.py          # Contract unit tests
│   ├── src/                            # Legacy single-escrow (archived)
│   └── pyproject.toml                  # Python dependencies
│
├── backend/                            # Express API server
│   ├── src/
│   │   ├── app.ts                      # Express app setup
│   │   ├── server.ts                   # HTTP server entry point
│   │   ├── middleware/
│   │   │   └── x402.ts                 # x402 payment enforcement
│   │   ├── routes/
│   │   │   ├── health.ts               # Health check endpoint
│   │   │   ├── escrow.ts               # Escrow lifecycle routes
│   │   │   └── bounties.ts             # Bounty listing routes
│   │   ├── services/
│   │   │   ├── algorand.ts             # AlgoSDK wrapper, transaction building
│   │   │   ├── facilitator.ts          # GoPlausible x402 verification
│   │   │   └── ipfs.ts                 # NFT.Storage uploads
│   │   ├── db/
│   │   │   ├── supabase.ts             # Supabase client initialization
│   │   │   ├── database.types.ts       # Generated TypeScript types
│   │   │   ├── local-store.ts          # Dev fallback (JSON file)
│   │   │   └── index.ts                # Unified DB interface
│   │   ├── lib/
│   │   │   ├── algorand-config.ts      # Network configuration
│   │   │   ├── algorand-address.ts     # Address validation utils
│   │   │   ├── escrow-box.ts           # Box storage encoding
│   │   │   └── constants.ts            # Status codes, constants
│   │   └── types/
│   │       └── x402.ts                 # x402 payload types
│   ├── supabase/
│   │   └── migrations/
│   │       └── 001_init.sql            # Database schema
│   ├── .env.example                    # Environment template
│   ├── package.json                    # Backend dependencies
│   └── tsconfig.json                   # TypeScript config
│
├── frontend/                           # React SPA
│   ├── src/
│   │   ├── main.tsx                    # App entry point
│   │   ├── router.tsx                  # TanStack Router setup
│   │   ├── routeTree.gen.ts            # Generated route tree
│   │   ├── routes/                     # File-based routes
│   │   │   ├── __root.tsx              # Root layout
│   │   │   ├── index.tsx               # Landing page
│   │   │   ├── bounties.tsx            # Bounty list layout
│   │   │   ├── bounties.index.tsx      # Bounty list page
│   │   │   ├── bounties.$bountyId.tsx  # Bounty detail page
│   │   │   └── create-bounty.tsx       # Create bounty form
│   │   ├── components/
│   │   │   ├── Header.tsx              # Nav bar with wallet connect
│   │   │   ├── Logo.tsx                # AlgoEase logo
│   │   │   ├── BountyCard.tsx          # Bounty list item
│   │   │   ├── EscrowSteps.tsx         # Status timeline
│   │   │   ├── EscrowActionPanel.tsx   # Action buttons
│   │   │   ├── SubmittedWorkPanel.tsx  # Work review UI
│   │   │   ├── PaymentRequiredModal.tsx # x402 payment prompt
│   │   │   ├── ConnectWalletModal.tsx  # Wallet selection
│   │   │   ├── CounterOfferModal.tsx   # Price negotiation (future)
│   │   │   ├── DevPanel.tsx            # Dev tools overlay
│   │   │   ├── X402Badge.tsx           # x402 indicator
│   │   │   ├── FloatingCards.tsx       # Animated background
│   │   │   ├── Marquee.tsx             # Scrolling text
│   │   │   ├── Toggles.tsx             # Feature flags
│   │   │   └── ui/                     # shadcn/ui components
│   │   │       ├── button.tsx
│   │   │       ├── card.tsx
│   │   │       ├── dialog.tsx
│   │   │       └── ... (40+ components)
│   │   ├── hooks/
│   │   │   ├── useAlgorand.ts          # Wallet state management
│   │   │   ├── useEscrow.ts            # Escrow data fetching
│   │   │   ├── useEscrowActions.ts     # Action mutations
│   │   │   ├── useEscrowConfig.ts      # App config
│   │   │   ├── useX402Payment.ts       # x402 payment flow
│   │   │   └── use-mobile.tsx          # Responsive utils
│   │   ├── lib/
│   │   │   ├── api.ts                  # x402-aware fetch wrapper
│   │   │   ├── supabase.ts             # Supabase client
│   │   │   ├── bounties-api.ts         # Bounty CRUD
│   │   │   ├── escrow-client.ts        # Escrow API client
│   │   │   ├── create-escrow-client.ts # Factory for escrow client
│   │   │   ├── algorand-config.ts      # AlgoSDK initialization
│   │   │   ├── algorand-address.ts     # Address utils
│   │   │   ├── escrow-box.ts           # Box key encoding
│   │   │   ├── ipfs.ts                 # IPFS gateway URLs
│   │   │   ├── app-context.tsx         # React context providers
│   │   │   ├── utils.ts                # General utilities
│   │   │   ├── browser-polyfills.ts    # Buffer polyfill for Vite
│   │   │   └── wallet/
│   │   │       ├── wallet-types.ts     # Wallet interfaces
│   │   │       ├── wallet-service.ts   # Wallet abstraction
│   │   │       └── wallet-service.impl.ts # Implementation
│   │   ├── data/
│   │   │   └── bounties.ts             # Mock/seed data
│   │   └── styles/
│   │       └── index.css               # Tailwind + globals
│   ├── public/                         # Static assets
│   ├── .env.example                    # Environment template
│   ├── components.json                 # shadcn/ui config
│   ├── package.json                    # Frontend dependencies
│   ├── tsconfig.json                   # TypeScript config
│   ├── vite.config.ts                  # Vite bundler config
│   └── eslint.config.js                # ESLint rules
│
├── shared/                             # Shared TypeScript types
│   ├── src/
│   │   └── types.ts                    # Bounty, EscrowStatus, etc.
│   ├── package.json
│   └── tsconfig.json
│
├── scripts/                            # Deployment & testing scripts
│   ├── src/
│   │   ├── deploy.ts                   # Deploy contract to testnet
│   │   ├── e2e-test.ts                 # Full lifecycle test
│   │   ├── fund-app.ts                 # Fund contract account
│   │   └── testnet-smoke.ts            # Quick smoke test
│   ├── package.json
│   └── tsconfig.json
│
├── .env.example                        # Root environment template
├── .gitignore                          # Git ignore rules
├── package.json                        # Workspace root + scripts
├── package-lock.json                   # Dependency lock file
└── README.md                           # This file
```

### Key Directories Explained

#### `contracts/`
- **AlgoPy** smart contracts using Puya compiler
- `contract.py`: Main EscrowContract with BoxMap storage
- Tests use `pytest` with AlgoSDK
- Compile output → `build/*.teal`

#### `backend/`
- **Express** API with TypeScript
- **x402 middleware**: Intercepts payment-required endpoints
- **Services layer**: Algorand transaction building, x402 verification, IPFS uploads
- **Routes**: RESTful endpoints for escrow + bounty operations
- **Database**: Supabase for metadata, local JSON fallback for dev

#### `frontend/`
- **React 19** with TanStack Router (file-based routing)
- **Wallet integration**: `@txnlab/use-wallet` (Pera, Defly)
- **x402 flow**: Custom hooks + modal for payment prompts
- **shadcn/ui**: 40+ pre-built accessible components
- **Tailwind CSS v4**: Utility-first styling

#### `shared/`
- **TypeScript types** shared between frontend/backend
- `Bounty`, `EscrowStatus`, `X402Payload`, etc.
- Ensures type safety across workspaces

#### `scripts/`
- **Deployment automation**: Compile + deploy + configure contract
- **E2E testing**: Full lifecycle test on testnet
- **Utilities**: Fund contract, smoke tests

---

## 🧪 Testing

### Smart Contract Tests

```bash
# Run AlgoPy unit tests
npm run contracts:test

# Output: pytest results for contract methods
```

**Tests cover**:
- Escrow creation (ALGO & USDC)
- Task acceptance (open vs. assigned)
- Work submission
- Approval/rejection
- Payment release
- Refund (with deadline checks)

### E2E Integration Test

```bash
# Run full lifecycle on testnet
npm run e2e
```

**Test flow**:
1. Creates escrow with x402 payment
2. Freelancer accepts task
3. Freelancer submits work (IPFS CID)
4. Client approves work
5. Client releases payment
6. Verifies final status and balances

**Duration**: ~30 seconds  
**Network**: Testnet  
**Requires**: Funded `DEPLOYER_MNEMONIC` account

### Manual Testing

```bash
# Smoke test (quick validation)
npm run scripts:testnet

# Create test bounty via frontend
# 1. Start dev servers: npm run dev
# 2. Connect Pera wallet (testnet)
# 3. Navigate to /create-bounty
# 4. Fill form and submit
# 5. Verify in Supabase dashboard
```

### Example Transactions

Here are examples of successful transactions on testnet for reference:

| Operation | Transaction ID | Explorer Link |
|-----------|---------------|---------------|
| **Create Escrow** | Sample Tx Group | [View Group](https://testnet.algoexplorer.io/application/762856134/transactions) |
| **Accept Task** | Single App Call | View on explorer after testing |
| **Submit Work** | Single App Call | View on explorer after testing |
| **Release Payment** | Payment + App Call | View on explorer after testing |

**How to Track Your Transactions:**

1. After any operation, copy the `txId` from the API response
2. Visit: `https://testnet.algoexplorer.io/tx/{YOUR_TX_ID}`
3. Verify:
   - ✅ Status: "Confirmed"
   - ✅ Type: "Application Call" or "Payment"
   - ✅ Application ID: `762856134`
   - ✅ No error messages in logs

**Transaction Anatomy:**

```
Example Create Escrow Group:
├─ Txn 1 (Payment): Client → Contract (5 ALGO)
│  └─ Txn ID: ABCD1234...
└─ Txn 2 (App Call): create_escrow(task_id, freelancer, ...)
   └─ Txn ID: ZYXW9876...
   └─ Box Created: task-{task_id}
   └─ Status: OPEN (1)
```

---

## 🔌 Direct Contract Interaction

For advanced users who want to interact with the contract directly (bypassing the API):

### Using AlgoSDK (JavaScript/TypeScript)

```typescript
import algosdk from 'algosdk';

const algodClient = new algosdk.Algodv2(
  '',
  'https://testnet-api.algonode.cloud',
  443
);

const APP_ID = 762856134;
const CONTRACT_ADDRESS = 'PPBVQIUUEMYH7EYSJ4QJ5HGT2LZADEDAEKJPUZQ4EQQZQ3K6MLRKAHUJOE';

// Example: Call get_status (read-only)
const method = algosdk.ABIMethod.fromSignature('get_status(string)uint64');
const appAddr = algosdk.getApplicationAddress(APP_ID);

// Example: Create atomic transaction group for create_escrow
const suggestedParams = await algodClient.getTransactionParams().do();
const sender = 'YOUR_ALGORAND_ADDRESS';
const taskId = 'task-123';
const amount = 5_000_000; // 5 ALGO

// Payment transaction
const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
  from: sender,
  to: CONTRACT_ADDRESS,
  amount: amount,
  suggestedParams,
});

// Application call transaction
const atc = new algosdk.AtomicTransactionComposer();
atc.addMethodCall({
  appID: APP_ID,
  method: algosdk.ABIMethod.fromSignature(
    'create_escrow(string,address,uint64,uint64,pay)void'
  ),
  methodArgs: [
    taskId,
    'FREELANCER_ADDRESS_OR_ZERO',
    deadline, // Unix timestamp
    0, // 0 for ALGO, ASA ID for USDC
    { txn: paymentTxn, signer: yourSigner }
  ],
  sender: sender,
  signer: yourSigner,
  suggestedParams,
});

const result = await atc.execute(algodClient, 3);
console.log('Transaction IDs:', result.txIDs);
```

### Using AlgoKit CLI

```bash
# Call read-only method
algokit goal app call \
  --app-id 762856134 \
  --method "get_status(string)uint64" \
  --arg "str:task-123" \
  --from YOUR_ADDRESS \
  --network testnet

# View contract global state
algokit goal app info --app-id 762856134 --network testnet

# View box storage
algokit goal app box list --app-id 762856134 --network testnet
algokit goal app box info \
  --app-id 762856134 \
  --name "esc:task-123" \
  --network testnet
```

### Using Python (AlgoSDK)

```python
from algosdk.v2client import algod
from algosdk import logic, transaction
from algosdk.atomic_transaction_composer import (
    AtomicTransactionComposer,
    TransactionWithSigner,
    ABIMethod
)

algod_client = algod.AlgodClient(
    "",
    "https://testnet-api.algonode.cloud",
    headers={"User-Agent": "algosdk"}
)

APP_ID = 762856134
CONTRACT_ADDRESS = logic.get_application_address(APP_ID)

# Example: Get status
method = ABIMethod.from_signature("get_status(string)uint64")
atc = AtomicTransactionComposer()

atc.add_method_call(
    app_id=APP_ID,
    method=method,
    sender=sender_address,
    signer=signer,
    sp=suggested_params,
    method_args=["task-123"]
)

result = atc.execute(algod_client, 3)
status_code = result.abi_results[0].return_value
print(f"Status: {status_code}")
```

### Contract Methods Reference

| Method | Signature | Type |
|--------|-----------|------|
| `configure` | `configure(uint64)void` | Admin |
| `opt_in_asset` | `opt_in_asset(asset)void` | Admin |
| `create_escrow` | `create_escrow(string,address,uint64,uint64,pay)void` | Write |
| `create_escrow_usdc` | `create_escrow_usdc(string,address,uint64,uint64,axfer)void` | Write |
| `accept_task` | `accept_task(string)void` | Write |
| `submit_work` | `submit_work(string,string)void` | Write |
| `approve` | `approve(string)void` | Write |
| `reject_work` | `reject_work(string)void` | Write |
| `release_payment` | `release_payment(string)void` | Write |
| `refund` | `refund(string)void` | Write |
| `get_status` | `get_status(string)uint64` | Read |

### Box Storage Format

Escrow data is stored in boxes with the key format: `esc:{task_id}`

**Example:**
- Box Key: `esc:task-123` (hex: `6573633a7461736b2d313233`)
- Box Size: Variable (depends on task_id and ipfs_hash length)
- MBR Required: 2500 + (key_size + value_size) * 400 microALGOs

**Read Box Data:**
```bash
# Get raw box data
curl "https://testnet-idx.algonode.cloud/v2/applications/762856134/box?name=b64:ZXNjOnRhc2stMTIz"

# Decode using AlgoSDK
const boxValue = await algodClient.getApplicationBoxByName(APP_ID, boxName).do();
```

---

## 🔧 Troubleshooting

### Common Issues

#### Contract Deployment Fails

**Error**: `"insufficient balance"`

**Solution**:
```bash
# Fund deployer account
# Visit: https://bank.testnet.algorand.network/
# Paste DEPLOYER_MNEMONIC address and request ALGOs
```

**Error**: `"asset not opted in"`

**Solution**:
```bash
# Opt contract into USDC after deployment
npm run scripts:deploy  # Will auto opt-in if configured
```

---

#### x402 Payment Not Working

**Error**: `"Payment verification failed"`

**Causes**:
1. **Wrong network**: Ensure wallet is on testnet
2. **Insufficient funds**: Check wallet balance
3. **Facilitator down**: Verify `X402_FACILITATOR_URL` is reachable
4. **Signed txn expired**: Transaction has 1000-round window

**Debug**:
```bash
# Check facilitator health
curl https://facilitator.goplausible.xyz/health

# Verify wallet network matches VITE_ALGORAND_NETWORK
```

---

#### Supabase Connection Error

**Error**: `"Failed to connect to Supabase"`

**Solution**:
1. Verify `SUPABASE_URL` and keys in `.env`
2. Check project is not paused (free tier inactivity)
3. Ensure migrations are applied: `npx supabase db push`

---

#### Frontend Build Errors

**Error**: `"Buffer is not defined"`

**Solution**: Already handled in `frontend/src/lib/browser-polyfills.ts`

If still occurring:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

#### Contract Out of Funds

**Error**: `"insufficient escrow liquidity"`

**Solution**:
```bash
# Fund the contract for box storage + transactions
npm run scripts:fund-app

# Or manually send ALGOs to contract address
# Contract Address: PPBVQIUUEMYH7EYSJ4QJ5HGT2LZADEDAEKJPUZQ4EQQZQ3K6MLRKAHUJOE
```

---

#### Transaction Failed on Chain

**Error**: `"Transaction rejected by network"`

**Debug Steps:**

1. **Get Transaction ID** from error message or API response

2. **Check on AlgoExplorer**:
   ```
   https://testnet.algoexplorer.io/tx/{YOUR_TXN_ID}
   ```

3. **Common Rejection Reasons**:
   - ❌ **Insufficient balance**: Sender needs more ALGOs
   - ❌ **Invalid app call**: Wrong method or parameters
   - ❌ **Box not found**: Task ID doesn't exist
   - ❌ **Logic error**: Contract assertion failed (check inner txns)
   - ❌ **Fee too low**: Increase fee to 1000 microALGOs per txn

4. **View Transaction Logs**:
   - Click transaction on explorer
   - Check "Logs" tab for error messages
   - View "Inner Transactions" for atomic group details

5. **Decode Application Call**:
   ```bash
   # View readable method call
   algokit explore transaction {TXN_ID} --network testnet
   ```

**Example Error on Explorer:**
```
Error: logic eval error: assert failed pc=234
```
This indicates a contract assertion failed. Check the contract state and method requirements.

---

### Debug Mode

Enable debug logging:

```bash
# Backend
NODE_ENV=development DEBUG=* npm run dev:backend

# Frontend (dev tools overlay)
# Press Ctrl+Shift+D in browser to toggle DevPanel
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

### Development Workflow

1. **Fork the repository**
```bash
gh repo fork yourusername/algoease-v2
```

2. **Create feature branch**
```bash
git checkout -b feature/amazing-feature
```

3. **Make changes**
- Follow existing code style
- Add tests for new features
- Update documentation

4. **Run linting**
```bash
npm run lint
```

5. **Test thoroughly**
```bash
npm run contracts:test  # Smart contracts
npm run e2e             # Integration test
```

6. **Commit with clear message**
```bash
git commit -m "feat: add counter-offer negotiation"
```

7. **Push and create PR**
```bash
git push origin feature/amazing-feature
gh pr create
```

### Code Style

- **TypeScript**: ESLint + Prettier
- **Python**: Black formatter, PEP 8
- **Commits**: Conventional Commits format
  - `feat:` new feature
  - `fix:` bug fix
  - `docs:` documentation
  - `refactor:` code restructuring
  - `test:` adding tests

### Areas for Contribution

- 🎨 **UI/UX improvements**: Better mobile experience, animations
- 🔐 **Security audits**: Smart contract review, penetration testing
- 🌐 **Mainnet support**: Production deployment guides
- 📚 **Documentation**: Tutorials, video guides, translations
- 🧪 **Testing**: Unit tests, integration tests, load testing
- ✨ **Features**: Dispute resolution, multi-sig escrows, milestone payments

---

## 📚 Additional Resources

### Algorand Development

- [Algorand Developer Portal](https://developer.algorand.org/)
- [AlgoPy Documentation](https://algorandfoundation.github.io/puya/)
- [AlgoSDK (JavaScript)](https://github.com/algorand/js-algorand-sdk)
- [AlgoKit CLI](https://github.com/algorandfoundation/algokit-cli)

### x402 Payment Protocol

- [x402 Specification](https://github.com/GoPlausible/x402)
- [GoPlausible Facilitator](https://facilitator.goplausible.xyz/)
- [@x402-avm NPM packages](https://www.npmjs.com/search?q=%40x402-avm)

### Tools & Libraries

- [TanStack Router](https://tanstack.com/router)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/docs)
- [Pera Wallet](https://perawallet.app/)
- [NFT.Storage](https://nft.storage/)

---

## 🗺️ Roadmap

### Phase 1: Core Features ✅
- [x] Multi-escrow BoxMap contract
- [x] x402 payment integration
- [x] Supabase backend
- [x] TanStack Router frontend
- [x] Wallet integration (Pera, Defly)
- [x] IPFS work submissions

### Phase 2: Enhanced Features 🚧
- [ ] Milestone-based payments
- [ ] Counter-offer negotiation
- [ ] Dispute resolution mechanism
- [ ] Reputation system
- [ ] Email notifications
- [ ] Mobile app (React Native)

### Phase 3: Production Ready 📋
- [ ] Security audit
- [ ] Mainnet deployment
- [ ] Gas optimization
- [ ] Performance monitoring
- [ ] User analytics
- [ ] Legal compliance (ToS, Privacy)

### Phase 4: Advanced Features 💡
- [ ] Multi-sig escrows
- [ ] DAO governance
- [ ] Integration with freelance platforms
- [ ] AI-powered work verification
- [ ] Cross-chain bridges
- [ ] Staking rewards for arbitrators

---

## 📄 License

**MIT License**

Copyright (c) 2026 Aditya Singh

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## 📬 Contact & Support

**Project Maintainer**: Aditya Singh

**Issues**: [GitHub Issues](https://github.com/yourusername/algoease-v2/issues)

**Discussions**: [GitHub Discussions](https://github.com/yourusername/algoease-v2/discussions)

**Support**: For security vulnerabilities, please email: [security@algoease.dev](mailto:security@algoease.dev)

---

## 📊 Project Stats

<div align="center">

### Contract Information

| Network | App ID | Status | Explorer |
|---------|--------|--------|----------|
| Testnet | `762856134` | 🟢 Active | [View →](https://testnet.algoexplorer.io/application/762856134) |
| Mainnet | TBA | 🔵 Planned | Coming Soon |

### Key Addresses

| Type | Address/ID | Purpose |
|------|-----------|---------|
| **Contract Address** | `PPBVQIUUEMYH7EYSJ4QJ5HGT2LZADEDAEKJPUZQ4EQQZQ3K6MLRKAHUJOE` | Escrow contract |
| **USDC-A (Testnet)** | `10458941` | Testnet stablecoin |
| **x402 Facilitator** | `facilitator.goplausible.xyz` | Payment verification |

### Quick Actions

[![View Contract](https://img.shields.io/badge/View%20Contract-AlgoExplorer-00D494?style=for-the-badge&logo=algorand)](https://testnet.algoexplorer.io/application/762856134)
[![Get Testnet ALGO](https://img.shields.io/badge/Get%20Testnet%20ALGO-Faucet-blue?style=for-the-badge)](https://bank.testnet.algorand.network/)
[![View Docs](https://img.shields.io/badge/Documentation-README-green?style=for-the-badge)](https://github.com/yourusername/algoease-v2#readme)

</div>

---

<div align="center">

**Built with ❤️ on Algorand**

[Website](https://algoease.dev) • [Docs](https://docs.algoease.dev) • [Twitter](https://twitter.com/algoease)

**Contract:** `762856134` | **Network:** Testnet | **Version:** 2.0.0

</div>
