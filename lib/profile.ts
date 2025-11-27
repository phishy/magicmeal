import { supabase } from '@/lib/supabase';

export async function getCurrentProfileId() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  const userId = session?.user?.id;
  if (!userId) {
    throw new Error('User is not authenticated.');
  }

  return userId;
}

