-- Adds weight and activity goal fields to the profiles table.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS starting_weight numeric(6, 2),
  ADD COLUMN IF NOT EXISTS starting_weight_unit text DEFAULT 'lb' CHECK (starting_weight_unit IN ('lb', 'kg')),
  ADD COLUMN IF NOT EXISTS starting_weight_recorded_at timestamptz,
  ADD COLUMN IF NOT EXISTS goal_weight numeric(6, 2),
  ADD COLUMN IF NOT EXISTS goal_weight_unit text DEFAULT 'lb' CHECK (goal_weight_unit IN ('lb', 'kg')),
  ADD COLUMN IF NOT EXISTS weekly_goal_rate numeric(4, 2),
  ADD COLUMN IF NOT EXISTS weekly_goal_type text DEFAULT 'maintain' CHECK (weekly_goal_type IN ('lose', 'gain', 'maintain')),
  ADD COLUMN IF NOT EXISTS activity_level text DEFAULT 'not_active'
    CHECK (activity_level IN ('not_active', 'lightly_active', 'moderately_active', 'very_active'));


