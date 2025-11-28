import { supabase } from '@/lib/supabase';
import { getProfileIdOrThrow } from '@/services/helpers';
import type { WeightEntry, WeightEntryRecord, WeightInput, WeightUnit } from '@/types';

const TABLE = 'weight_entries';

const mapEntry = (record: WeightEntryRecord): WeightEntry => ({
  id: record.id,
  profileId: record.profile_id,
  weight: Number(record.weight),
  unit: record.unit,
  recordedAt: record.recorded_at,
});

export async function fetchWeightEntries(limit = 50): Promise<WeightEntry[]> {
  const profileId = await getProfileIdOrThrow();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('profile_id', profileId)
    .order('recorded_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data.map(mapEntry);
}

export async function createWeightEntry(input: WeightInput): Promise<WeightEntry> {
  const profileId = await getProfileIdOrThrow();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      profile_id: profileId,
      weight: input.weight,
      unit: input.unit ?? 'lb',
      recorded_at: input.recordedAt ?? new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapEntry(data);
}

export async function createWeightEntries(inputs: WeightInput[]) {
  if (!inputs.length) {
    return [];
  }

  const profileId = await getProfileIdOrThrow();
  const payload = inputs.map((input) => ({
    profile_id: profileId,
    weight: input.weight,
    unit: input.unit ?? 'lb',
    recorded_at: input.recordedAt ?? new Date().toISOString(),
  }));

  const { data, error } = await supabase.from(TABLE).insert(payload).select('*');
  if (error) throw error;
  return data.map(mapEntry);
}

export async function removeWeightEntry(id: string) {
  const profileId = await getProfileIdOrThrow();
  const { error } = await supabase.from(TABLE).delete().eq('id', id).eq('profile_id', profileId);
  if (error) throw error;
}

