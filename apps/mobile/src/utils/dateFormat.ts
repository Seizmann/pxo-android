import { format, parseISO } from 'date-fns';

/** Format an ISO date string (YYYY-MM-DD) for display, e.g. "15 Jun 2024". */
export function formatEntryDate(isoDate: string): string {
  try {
    return format(parseISO(isoDate), 'd MMM yyyy');
  } catch {
    return isoDate;
  }
}

/** Format a full ISO timestamp for display, e.g. "15 Jun 2024, 14:30". */
export function formatTimestamp(isoTs: string): string {
  try {
    return format(parseISO(isoTs), 'd MMM yyyy, HH:mm');
  } catch {
    return isoTs;
  }
}

/** Today's date as YYYY-MM-DD (local time). */
export function todayIsoDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/** Generate the backup filename: pta_backup_YYYY-MM-DD_HHMM.json */
export function backupFileName(): string {
  return `pta_backup_${format(new Date(), 'yyyy-MM-dd_HHmm')}.json`;
}

/** Check if an ISO date string is today. */
export function isToday(isoDate: string): boolean {
  return isoDate === todayIsoDate();
}
