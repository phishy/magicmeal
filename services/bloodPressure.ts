import { supabase } from '@/lib/supabase';
import { getProfileIdOrThrow } from '@/services/helpers';
import type { BloodPressureEntry } from '@/types';

const TABLE = 'blood_pressure_entries';

export interface BloodPressureInput {
  systolic: number;
  diastolic: number;
  pulse?: number;
  recordedAt?: string;
}

const mapEntry = (record: any): BloodPressureEntry => ({
  id: record.id,
  profileId: record.profile_id,
  systolic: record.systolic,
  diastolic: record.diastolic,
  pulse: record.pulse ?? undefined,
  recordedAt: record.recorded_at,
});

export async function fetchBloodPressureEntries(limit = 50): Promise<BloodPressureEntry[]> {
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

export async function createBloodPressureEntry(input: BloodPressureInput): Promise<BloodPressureEntry> {
  const profileId = await getProfileIdOrThrow();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      profile_id: profileId,
      systolic: input.systolic,
      diastolic: input.diastolic,
      pulse: input.pulse ?? null,
      recorded_at: input.recordedAt ?? new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapEntry(data);
}

export async function removeBloodPressureEntry(id: string) {
  const profileId = await getProfileIdOrThrow();
  const { error } = await supabase.from(TABLE).delete().eq('id', id).eq('profile_id', profileId);
  if (error) throw error;
}

