# AlgoEase v2 Monorepo

Modern, modular monorepo for AlgoEase.

## Structure

- `frontend/` - React + Tailwind UI (existing app)
- `backend/` - Node.js + Express API
- `contracts/` - AlgoPy smart contracts
- `scripts/` - deployment + testing automation

## Quick Start

```bash
npm install
npm run dev:frontend
```

Backend dev server:

```bash
npm run dev:backend
```

## Workspace Commands

- `npm run build` - build frontend and backend
- `npm run lint` - lint frontend and backend
- `npm run scripts:deploy` - run deployment script workspace
- `npm run contracts:check` - syntax check contract code

## Contracts (Python)

Create and activate a virtual environment, then install:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r contracts/requirements.txt
```
