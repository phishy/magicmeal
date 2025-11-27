import { supabase } from '@/lib/supabase';
import { getProfileIdOrThrow } from '@/services/helpers';
import type { ProfileGoals, ProfileGoalsRecord } from '@/types';

const GOAL_COLUMNS = [
  'starting_weight',
  'starting_weight_recorded_at',
  'starting_weight_unit',
  'goal_weight',
  'goal_weight_unit',
  'weekly_goal_rate',
  'weekly_goal_type',
  'activity_level',
] as const;

export async function fetchProfileGoals(): Promise<ProfileGoals> {
  const profileId = await getProfileIdOrThrow();
  const { data, error } = await supabase
    .from('profiles')
    .select(GOAL_COLUMNS.join(', '))
    .eq('id', profileId)
    .limit(1)
    .maybeSingle<ProfileGoalsRecord>();

  if (error) {
    throw error;
  }

  if (!data) {
    return {};
  }

  return mapRecordToGoals(data);
}

export async function updateProfileGoals(input: Partial<ProfileGoals>): Promise<ProfileGoals> {
  const profileId = await getProfileIdOrThrow();
  const payload = serializeGoals(input);

  if (!Object.keys(payload).length) {
    const current = await fetchProfileGoals();
    return current;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', profileId)
    .select(GOAL_COLUMNS.join(', '))
    .single<ProfileGoalsRecord>();

  if (error) {
    throw error;
  }

  return mapRecordToGoals(data);
}

const columnMap: Record<keyof ProfileGoals, keyof ProfileGoalsRecord> = {
  startingWeight: 'starting_weight',
  startingWeightRecordedAt: 'starting_weight_recorded_at',
  startingWeightUnit: 'starting_weight_unit',
  goalWeight: 'goal_weight',
  goalWeightUnit: 'goal_weight_unit',
  weeklyGoalRate: 'weekly_goal_rate',
  weeklyGoalType: 'weekly_goal_type',
  activityLevel: 'activity_level',
};

const serializeGoals = (input: Partial<ProfileGoals>) => {
  const payload: Partial<ProfileGoalsRecord> = {};

  (Object.keys(columnMap) as (keyof ProfileGoals)[]).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      const column = columnMap[key];
      const value = input[key];
      payload[column] = value ?? null;
    }
  });

  return payload;
};

const parseNumeric = (value: number | string | null | undefined): number | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return undefined;
  }

  return Number(numeric);
};

const mapRecordToGoals = (record: ProfileGoalsRecord): ProfileGoals => ({
  startingWeight: parseNumeric(record.starting_weight),
  startingWeightRecordedAt: record.starting_weight_recorded_at ?? undefined,
  startingWeightUnit: record.starting_weight_unit ?? undefined,
  goalWeight: parseNumeric(record.goal_weight),
  goalWeightUnit: record.goal_weight_unit ?? undefined,
  weeklyGoalRate: parseNumeric(record.weekly_goal_rate),
  weeklyGoalType: record.weekly_goal_type ?? undefined,
  activityLevel: record.activity_level ?? undefined,
});


