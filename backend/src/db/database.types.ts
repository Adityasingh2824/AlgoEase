// Generated placeholder — run `npm run db:types` after applying migrations to regenerate.
// This hand-written version matches 001_init.sql and unblocks TypeScript compilation.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      bounties: {
        Relationships: [];
        Row: {
          id: string;
          task_id: string;
          title: string;
          description: string;
          client_address: string;
          freelancer_address: string | null;
          amount: string;
          asset: string;
          status: string;
          app_id: string | null;
          ipfs_cid: string | null;
          deposit_tx_id: string | null;
          release_tx_id: string | null;
          refund_tx_id: string | null;
          deadline_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          title: string;
          description: string;
          client_address: string;
          freelancer_address?: string | null;
          amount: string;
          asset?: string;
          status?: string;
          app_id?: string | null;
          ipfs_cid?: string | null;
          deposit_tx_id?: string | null;
          release_tx_id?: string | null;
          refund_tx_id?: string | null;
          deadline_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          title?: string;
          description?: string;
          client_address?: string;
          freelancer_address?: string | null;
          amount?: string;
          asset?: string;
          status?: string;
          app_id?: string | null;
          ipfs_cid?: string | null;
          deposit_tx_id?: string | null;
          release_tx_id?: string | null;
          refund_tx_id?: string | null;
          deadline_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      escrow_events: {
        Relationships: [];
        Row: {
          id: string;
          task_id: string;
          event_type: string;
          tx_id: string | null;
          actor: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          event_type: string;
          tx_id?: string | null;
          actor?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          event_type?: string;
          tx_id?: string | null;
          actor?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
