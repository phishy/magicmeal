import type { DateRange, TrendRangePreset } from '@/types';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const TREND_RANGE_PRESETS: TrendRangePreset[] = [
  '1w',
  '1m',
  '3m',
  '1y',
  'all',
  'custom',
];

export function getTrendRangeLabel(range: TrendRangePreset) {
  switch (range) {
    case '1w':
      return '1W';
    case '1m':
      return '1M';
    case '3m':
      return '3M';
    case '1y':
      return '1Y';
    case 'all':
      return 'All';
    case 'custom':
      return 'Custom';
    default:
      return range;
  }
}

export function getTrendRangeSubtitle(range: TrendRangePreset) {
  switch (range) {
    case '1w':
      return 'Last 7 days';
    case '1m':
      return 'Last 30 days';
    case '3m':
      return 'Last 90 days';
    case '1y':
      return 'Last 365 days';
    case 'all':
      return 'All entries';
    case 'custom':
      return 'Custom range';
    default:
      return '';
  }
}

export function filterEntriesByRange<T extends { recordedAt: string }>(
  entries: T[],
  range: TrendRangePreset,
  customRange?: DateRange | null
) {
  if (!entries.length) {
    return [];
  }

  if (range === 'all') {
    return sortEntriesAscending(entries);
  }

  if (range === 'custom' && customRange?.start && customRange?.end) {
    const startTime = new Date(customRange.start).getTime();
    const endTime = new Date(customRange.end).getTime();
    if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
      return [];
    }
    if (startTime > endTime) {
      return [];
    }
    return sortEntriesAscending(
      entries.filter((entry) => {
        const ts = new Date(entry.recordedAt).getTime();
        return ts >= startTime && ts <= endTime;
      })
    );
  }

  const lookbackDays = getLookbackDays(range);
  return sortEntriesAscending(
    entries.filter((entry) => {
      const ts = new Date(entry.recordedAt).getTime();
      return ts >= Date.now() - lookbackDays * DAY_IN_MS;
    })
  );
}

export function getLookbackDays(range: TrendRangePreset) {
  switch (range) {
    case '1w':
      return 7;
    case '1m':
      return 30;
    case '3m':
      return 90;
    case '1y':
      return 365;
    case 'all':
      return Number.MAX_SAFE_INTEGER;
    case 'custom':
    default:
      return 365;
  }
}

function sortEntriesAscending<T extends { recordedAt: string }>(entries: T[]) {
  return [...entries].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );
}

