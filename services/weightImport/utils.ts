export function normalizeWeightImportDate(value: unknown): string | null {
  if (!value) return null;

  const coerceDate = (input: Date) => {
    const hasTime = typeof value === 'string' && /\d{1,2}:\d{2}/.test(value);
    if (!hasTime) {
      input.setHours(9, 0, 0, 0);
    }
    return input.toISOString();
  };

  if (value instanceof Date) {
    return coerceDate(new Date(value.getTime()));
  }

  if (typeof value === 'number') {
    const fromNumber = new Date(value);
    return Number.isNaN(fromNumber.getTime()) ? null : coerceDate(fromNumber);
  }

  const text = String(value).trim();
  if (!text.length) return null;

  let candidate = text;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    candidate = `${text}T09:00:00`;
  }

  const date = new Date(candidate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return coerceDate(date);
}

