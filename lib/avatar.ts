import type { UserAvatarData } from '@/types';

const DEFAULT_AVATAR: UserAvatarData = {
  initials: '?',
  backgroundColor: '#E0E7FF',
  foregroundColor: '#312E81',
};

export function generateAvatarFromEmail(email?: string | null): UserAvatarData {
  if (!email) {
    return { ...DEFAULT_AVATAR };
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return { ...DEFAULT_AVATAR };
  }

  const initials = createInitials(normalized);
  const hash = hashString(normalized);
  const backgroundColor = hslToHex(hash % 360, 65, 72);
  const foregroundColor = hslToHex((hash + 180) % 360, 45, 22);

  return {
    initials,
    backgroundColor,
    foregroundColor,
  };
}

function createInitials(email: string) {
  const localPart = email.split('@')[0];
  const segments = localPart.split(/[^a-z0-9]+/i).filter(Boolean);

  if (segments.length >= 2) {
    return `${segments[0][0]}${segments[1][0]}`.toUpperCase();
  }

  if (segments.length === 1 && segments[0].length >= 2) {
    return segments[0].slice(0, 2).toUpperCase();
  }

  return localPart.slice(0, 2).toUpperCase() || '?';
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
}

function hslToHex(hue: number, saturation: number, lightness: number) {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const s = saturation / 100;
  const l = lightness / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((normalizedHue / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (normalizedHue >= 0 && normalizedHue < 60) {
    r = c;
    g = x;
  } else if (normalizedHue >= 60 && normalizedHue < 120) {
    r = x;
    g = c;
  } else if (normalizedHue >= 120 && normalizedHue < 180) {
    g = c;
    b = x;
  } else if (normalizedHue >= 180 && normalizedHue < 240) {
    g = x;
    b = c;
  } else if (normalizedHue >= 240 && normalizedHue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (value: number) => {
    const channel = Math.round((value + m) * 255);
    return channel.toString(16).padStart(2, '0');
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
