alter table public.foods
  add column if not exists calories integer not null default 0,
  add column if not exists total_fat numeric(6,2),
  add column if not exists saturated_fat numeric(6,2),
  add column if not exists polyunsaturated_fat numeric(6,2),
  add column if not exists monounsaturated_fat numeric(6,2),
  add column if not exists trans_fat numeric(6,2),
  add column if not exists cholesterol integer,
  add column if not exists sodium integer,
  add column if not exists potassium integer,
  add column if not exists total_carbohydrates numeric(6,2),
  add column if not exists dietary_fiber numeric(6,2),
  add column if not exists sugars numeric(6,2),
  add column if not exists added_sugars numeric(6,2),
  add column if not exists sugar_alcohols numeric(6,2),
  add column if not exists protein numeric(6,2);

