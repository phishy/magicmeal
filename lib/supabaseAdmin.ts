import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { AiFoodSearchCacheRecord } from '@/types';

type AiFoodSearchCacheInsert = Omit<AiFoodSearchCacheRecord, 'id' | 'created_at' | 'updated_at'> & {
  hit_count?: number;
  last_hit_at?: string;
  expires_at?: string;
};

type AiFoodSearchCacheUpdate = Partial<Omit<AiFoodSearchCacheRecord, 'id' | 'created_at' | 'updated_at'>>;

export type SupabaseDatabase = {
  public: {
    Tables: {
      ai_food_search_cache: {
        Row: AiFoodSearchCacheRecord;
        Insert: AiFoodSearchCacheInsert;
        Update: AiFoodSearchCacheUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type TypedSupabaseClient = SupabaseClient<SupabaseDatabase>;

let supabaseAdminClient: TypedSupabaseClient | null = null;

export function getSupabaseServiceRoleClient(): TypedSupabaseClient {
  if (supabaseAdminClient) {
    return supabaseAdminClient;
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service-role credentials.');
  }

  supabaseAdminClient = createClient<SupabaseDatabase>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return supabaseAdminClient;
}

