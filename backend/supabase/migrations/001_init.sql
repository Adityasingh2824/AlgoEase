-- AlgoEase v2 — Initial schema
-- Bounties table (off-chain metadata for each escrow)
create table bounties (
  id                 uuid primary key default gen_random_uuid(),
  task_id            text unique not null,
  title              text not null,
  description        text not null,
  client_address     text not null,
  freelancer_address text,
  amount             text not null,
  asset              text not null default 'ALGO',
  status             text not null default 'OPEN'
                     check (status in ('OPEN','ACCEPTED','SUBMITTED','APPROVED','RELEASED','REFUNDED')),
  app_id             text,
  ipfs_cid           text,
  deposit_tx_id      text,
  release_tx_id      text,
  refund_tx_id       text,
  deadline_at        timestamptz not null,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- Escrow events log (every status change gets a row)
create table escrow_events (
  id         uuid primary key default gen_random_uuid(),
  task_id    text not null references bounties(task_id),
  event_type text not null
             check (event_type in ('DEPOSIT','ACCEPTED','SUBMITTED','APPROVED','RELEASED','REFUNDED')),
  tx_id      text,
  actor      text,
  metadata   jsonb,
  created_at timestamptz default now()
);

-- Enable Realtime on both tables
alter publication supabase_realtime add table bounties;
alter publication supabase_realtime add table escrow_events;

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger bounties_updated_at
  before update on bounties
  for each row execute function update_updated_at();

-- RLS policies
alter table bounties enable row level security;
alter table escrow_events enable row level security;

-- Public read access for bounties
create policy "bounties_public_read" on bounties
  for select using (true);

-- Only service role (backend) can insert/update bounties
create policy "bounties_service_write" on bounties
  for all using (auth.role() = 'service_role');

-- Public read access for escrow_events
create policy "escrow_events_public_read" on escrow_events
  for select using (true);

-- Only service role can insert events
create policy "escrow_events_service_write" on escrow_events
  for insert with check (auth.role() = 'service_role');

-- Indexes
create index idx_bounties_task_id on bounties(task_id);
create index idx_bounties_status on bounties(status);
create index idx_bounties_client on bounties(client_address);
create index idx_escrow_events_task_id on escrow_events(task_id);
