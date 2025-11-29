create table if not exists public.foods (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid default auth.uid() not null references public.profiles(id) on delete cascade,
  brand_name text,
  description text not null,
  serving_size text not null,
  servings_per_container numeric(6,2) not null default 1 constraint servings_per_container_positive check (servings_per_container > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists foods_profile_description_idx on public.foods (profile_id, description);

alter table public.foods enable row level security;

create policy "Insert own foods" on public.foods
  for insert
  to authenticated
  with check ((select auth.uid()) = profile_id);

create policy "Select own foods" on public.foods
  for select
  to authenticated
  using ((select auth.uid()) = profile_id);

create policy "Update own foods" on public.foods
  for update
  to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

create policy "Delete own foods" on public.foods
  for delete
  to authenticated
  using ((select auth.uid()) = profile_id);

