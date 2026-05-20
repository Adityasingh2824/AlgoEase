import type { SupabaseClient } from "@supabase/supabase-js";
import { createLocalDb, type LocalDb } from "./local-store.js";
import type { Database } from "./database.types.js";
import { dbStub, supabase } from "./supabase.js";

export { supabase } from "./supabase.js";

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

export function isLocalDbEnabled(): boolean {
  return (
    !supabase &&
    (process.env.USE_LOCAL_DB === "1" ||
      process.env.NODE_ENV === "development" ||
      process.env.NODE_ENV === "test")
  );
}

let localDb: LocalDb | null = null;

function getLocalDb(): LocalDb {
  if (!localDb) {
    localDb = createLocalDb();
    console.info("[db] Using file store at backend/.data/db.json (Supabase not configured)");
  }
  return localDb;
}

/** Supabase client, local JSON store (dev), or no-op stub. */
export function getDb(): SupabaseClient<Database> {
  if (supabase) return supabase;
  if (isLocalDbEnabled()) return getLocalDb() as unknown as SupabaseClient<Database>;
  return dbStub() as unknown as SupabaseClient<Database>;
}
