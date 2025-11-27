import { supabase } from '@/lib/supabase';
import { Crypto } from 'expo-crypto';

export async function getProfileIdOrThrow() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw new Error('Not authenticated');
  }

  return data.session.user.id;
}

/**
 * Generate a Gravatar URL from an email address
 * @param email - User's email address
 * @param size - Avatar size in pixels (default: 200)
 * @returns Gravatar URL
 */
export async function getGravatarUrl(email: string, size: number = 200): Promise<string> {
  // Normalize email: trim whitespace and convert to lowercase
  const normalizedEmail = email.trim().toLowerCase();
  
  // Generate MD5 hash of the email
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.MD5,
    normalizedEmail
  );
  
  // Return Gravatar URL with default image as identicon
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
}

