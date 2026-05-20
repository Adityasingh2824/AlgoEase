import path from "node:path";
import { fileURLToPath } from "node:url";

const migration = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../supabase/migrations/001_init.sql",
);

console.log(`
AlgoEase database setup
=======================

Option A — Supabase Dashboard (recommended)
1. Create a project at https://supabase.com/dashboard
2. SQL Editor → New query → paste and run:
   ${migration}
3. Settings → API: copy Project URL, anon key, service_role key
4. Root .env and backend/.env:
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   SUPABASE_ANON_KEY=...
5. frontend/.env:
   VITE_SUPABASE_URL=... (same URL)
   VITE_SUPABASE_ANON_KEY=... (anon key only)

Option B — Supabase CLI (linked project)
  cd backend && npx supabase link && npx supabase db push

Local dev without Supabase
--------------------------
If SUPABASE_* is unset, the backend uses backend/.data/db.json automatically.
Restart the backend after changing env vars.
`);
