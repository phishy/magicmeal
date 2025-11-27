import { supabase } from '@/lib/supabase';

export async function getProfileIdOrThrow() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw new Error('Not authenticated');
  }

  return data.session.user.id;
}

