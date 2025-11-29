alter table public.ai_food_search_cache enable row level security;

create policy "service role full access"
on public.ai_food_search_cache
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

