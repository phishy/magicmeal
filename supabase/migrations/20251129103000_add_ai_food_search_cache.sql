-- Cache table for AI food search responses
create extension if not exists "pgcrypto";

create table if not exists public.ai_food_search_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  query_text text not null,
  page integer not null default 1,
  provider_id text null,
  model_id text null,
  response jsonb not null,
  hit_count integer not null default 1,
  last_hit_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists ai_food_search_cache_expires_idx
  on public.ai_food_search_cache (expires_at);

create index if not exists ai_food_search_cache_query_idx
  on public.ai_food_search_cache (query_text);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists ai_food_search_cache_set_updated_at
  on public.ai_food_search_cache;

create trigger ai_food_search_cache_set_updated_at
before update on public.ai_food_search_cache
for each row execute function public.set_updated_at();

