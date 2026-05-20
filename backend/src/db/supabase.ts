import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.js";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function createSupabaseClient(): SupabaseClient<Database> | null {
  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      "[supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — using local file DB in development.",
    );
    return null;
  }
  return createClient<Database>(supabaseUrl, supabaseKey);
}

/** Null when Supabase is not configured (local file DB or stub used instead). */
export const supabase = createSupabaseClient();

function chainStub() {
  const chain = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    eq: () => chain,
    order: () => chain,
    single: async () => ({ data: null, error: { message: "Database not configured" } }),
    then: (
      onfulfilled?: (value: { data: null; error: { message: string } }) => unknown,
      onrejected?: (reason: unknown) => unknown,
    ) =>
      Promise.resolve({ data: null, error: { message: "Database not configured" } }).then(
        onfulfilled,
        onrejected,
      ),
  };
  return chain;
}

/** No-op client when neither Supabase nor local DB is available. */
export function dbStub() {
  return {
    from: () => chainStub(),
  };
}
