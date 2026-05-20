/**
 * File-backed bounty store for local development when Supabase is not configured.
 * Data lives in backend/.data/db.json (gitignored).
 */
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Database } from "./database.types.js";

type BountyRow = Database["public"]["Tables"]["bounties"]["Row"];
type BountyInsert = Database["public"]["Tables"]["bounties"]["Insert"];
type BountyUpdate = Database["public"]["Tables"]["bounties"]["Update"];
type EventRow = Database["public"]["Tables"]["escrow_events"]["Row"];
type EventInsert = Database["public"]["Tables"]["escrow_events"]["Insert"];

type TableName = "bounties" | "escrow_events";

interface DbFile {
  bounties: BountyRow[];
  escrow_events: EventRow[];
}

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dataDir = path.join(backendRoot, ".data");
const dbPath = path.join(dataDir, "db.json");

async function load(): Promise<DbFile> {
  try {
    const raw = await readFile(dbPath, "utf8");
    return JSON.parse(raw) as DbFile;
  } catch {
    return { bounties: [], escrow_events: [] };
  }
}

async function save(store: DbFile): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dbPath, JSON.stringify(store, null, 2), "utf8");
}

function nowIso(): string {
  return new Date().toISOString();
}

function toBountyRow(insert: BountyInsert): BountyRow {
  const ts = nowIso();
  return {
    id: insert.id ?? randomUUID(),
    task_id: insert.task_id,
    title: insert.title,
    description: insert.description,
    client_address: insert.client_address,
    freelancer_address: insert.freelancer_address ?? null,
    amount: insert.amount,
    asset: insert.asset ?? "ALGO",
    status: insert.status ?? "OPEN",
    app_id: insert.app_id ?? null,
    ipfs_cid: insert.ipfs_cid ?? null,
    deposit_tx_id: insert.deposit_tx_id ?? null,
    release_tx_id: insert.release_tx_id ?? null,
    refund_tx_id: insert.refund_tx_id ?? null,
    deadline_at: insert.deadline_at,
    created_at: insert.created_at ?? ts,
    updated_at: insert.updated_at ?? ts,
  };
}

function toEventRow(insert: EventInsert): EventRow {
  return {
    id: insert.id ?? randomUUID(),
    task_id: insert.task_id,
    event_type: insert.event_type,
    tx_id: insert.tx_id ?? null,
    actor: insert.actor ?? null,
    metadata: insert.metadata ?? null,
    created_at: insert.created_at ?? nowIso(),
  };
}

type QueryResult<T> = { data: T; error: null } | { data: null; error: { message: string } };

class LocalQueryBuilder<T extends TableName> {
  private filters: Array<{ column: string; value: string }> = [];
  private orderSpec: { column: string; ascending: boolean } | null = null;
  private singleRow = false;
  private insertPayload: BountyInsert | EventInsert | null = null;
  private updatePayload: BountyUpdate | null = null;

  constructor(private readonly table: T) {}

  select(_columns = "*") {
    return this;
  }

  insert(row: BountyInsert | EventInsert) {
    this.insertPayload = row;
    return this;
  }

  update(row: BountyUpdate) {
    this.updatePayload = row;
    return this;
  }

  eq(column: string, value: string) {
    this.filters.push({ column, value });
    return this;
  }

  order(column: string, opts: { ascending?: boolean }) {
    this.orderSpec = { column, ascending: opts.ascending ?? true };
    return this;
  }

  single() {
    this.singleRow = true;
    return this;
  }

  then<TResult1 = QueryResult<unknown>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<QueryResult<unknown>> {
    const store = await load();

    if (this.insertPayload) {
      if (this.table === "bounties") {
        const row = toBountyRow(this.insertPayload as BountyInsert);
        if (store.bounties.some((b) => b.task_id === row.task_id)) {
          return { data: null, error: { message: `duplicate task_id: ${row.task_id}` } };
        }
        store.bounties.push(row);
        await save(store);
        return { data: row, error: null };
      }
      const row = toEventRow(this.insertPayload as EventInsert);
      store.escrow_events.push(row);
      await save(store);
      return { data: row, error: null };
    }

    if (this.updatePayload) {
      if (this.table !== "bounties") {
        return { data: null, error: { message: "update only supported on bounties" } };
      }
      const idx = store.bounties.findIndex((b) => this.matches(b));
      if (idx < 0) {
        return { data: null, error: { message: "Bounty not found" } };
      }
      const updated: BountyRow = {
        ...store.bounties[idx],
        ...this.updatePayload,
        updated_at: nowIso(),
      };
      store.bounties[idx] = updated;
      await save(store);
      return { data: updated, error: null };
    }

    let rows: (BountyRow | EventRow)[] =
      this.table === "bounties" ? [...store.bounties] : [...store.escrow_events];

    for (const f of this.filters) {
      rows = rows.filter((r) => String((r as Record<string, unknown>)[f.column]) === f.value);
    }

    if (this.orderSpec) {
      const { column, ascending } = this.orderSpec;
      rows.sort((a, b) => {
        const av = String((a as Record<string, unknown>)[column]);
        const bv = String((b as Record<string, unknown>)[column]);
        return ascending ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }

    if (this.singleRow) {
      if (rows.length === 0) {
        return { data: null, error: { message: "Not found" } };
      }
      return { data: rows[0], error: null };
    }

    return { data: rows, error: null };
  }

  private matches(row: BountyRow): boolean {
    return this.filters.every(
      (f) => String((row as Record<string, unknown>)[f.column]) === f.value,
    );
  }
}

export function createLocalDb() {
  return {
    from<T extends TableName>(table: T) {
      return new LocalQueryBuilder(table);
    },
  };
}

export type LocalDb = ReturnType<typeof createLocalDb>;
