import type { TruckItem, RawOrder, CompanyConfig } from '../types/logistics';

export interface DailyArchiveSnapshot {
  date: string; // YYYY-MM-DD
  dateDisplay: string; // e.g. "2026-11-06 (昨日)"
  timestamp: number;
  trucks: TruckItem[];
  totalOrdersCount: number;
  grandTotalAmount: number;
}

const ARCHIVE_INDEX_KEY = 'hhy_logistics_archive_index_v1';
const ARCHIVE_PREFIX = 'hhy_archive_';
const MAX_RETENTION_DAYS = 14;

/**
 * Returns formatted date string (YYYY-MM-DD)
 */
export function getFormattedDate(dateObj: Date = new Date()): string {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Saves or updates today's snapshot into local history archive (auto-retaining up to 14 days)
 */
export function saveDailySnapshot(trucks: TruckItem[], targetDate: string = getFormattedDate()): void {
  try {
    const safeTrucks = (trucks || []).filter(Boolean);
    const totalOrdersCount = safeTrucks.reduce((sum, t) => sum + (t?.orders?.length || 0), 0);
    const grandTotalAmount = safeTrucks.reduce(
      (sum, t) => sum + (t?.orders || []).reduce((s, o) => s + (o?.totalAmount || 0), 0),
      0
    );

    const snapshot: DailyArchiveSnapshot = {
      date: targetDate,
      dateDisplay: `${targetDate}`,
      timestamp: Date.now(),
      trucks,
      totalOrdersCount,
      grandTotalAmount,
    };

    // Save snapshot item
    localStorage.setItem(`${ARCHIVE_PREFIX}${targetDate}`, JSON.stringify(snapshot));

    // Update index list
    const indexJson = localStorage.getItem(ARCHIVE_INDEX_KEY);
    let index: string[] = indexJson ? JSON.parse(indexJson) : [];
    if (!index.includes(targetDate)) {
      index.unshift(targetDate);
    }

    // Keep only up to MAX_RETENTION_DAYS (14 days)
    if (index.length > MAX_RETENTION_DAYS) {
      const removedDates = index.slice(MAX_RETENTION_DAYS);
      removedDates.forEach(d => localStorage.removeItem(`${ARCHIVE_PREFIX}${d}`));
      index = index.slice(0, MAX_RETENTION_DAYS);
    }

    localStorage.setItem(ARCHIVE_INDEX_KEY, JSON.stringify(index));
  } catch (err) {
    console.warn('Failed to save daily snapshot:', err);
  }
}

/**
 * Loads available archived dates for the accountant / supervisor
 */
export function getAvailableArchiveDates(): { date: string; label: string; ordersCount: number }[] {
  try {
    const today = getFormattedDate();
    const indexJson = localStorage.getItem(ARCHIVE_INDEX_KEY);
    const index: string[] = indexJson ? JSON.parse(indexJson) : [today];

    return index.map(date => {
      const isToday = date === today;
      const daysDiff = Math.round((new Date(today).getTime() - new Date(date).getTime()) / (1000 * 3600 * 24));

      let relativeText = '';
      if (isToday) {
        relativeText = ' (今日)';
      } else if (daysDiff === 1) {
        relativeText = ' (昨日)';
      } else if (daysDiff === 2) {
        relativeText = ' (前天)';
      } else if (daysDiff === 3) {
        relativeText = ' (3天前/連假)';
      } else {
        relativeText = ` (${daysDiff}天前)`;
      }

      const snapJson = localStorage.getItem(`${ARCHIVE_PREFIX}${date}`);
      let ordersCount = 0;
      if (snapJson) {
        try {
          const snap: DailyArchiveSnapshot = JSON.parse(snapJson);
          ordersCount = snap.totalOrdersCount || 0;
        } catch {}
      }

      return {
        date,
        label: `${date}${relativeText}`,
        ordersCount,
      };
    });
  } catch {
    return [{ date: getFormattedDate(), label: `${getFormattedDate()} (今日)`, ordersCount: 0 }];
  }
}

/**
 * Loads snapshot for a specific date
 */
export function loadSnapshotByDate(date: string): DailyArchiveSnapshot | null {
  try {
    const json = localStorage.getItem(`${ARCHIVE_PREFIX}${date}`);
    if (!json) return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Rollover unfinished orders:
 * Filters out delivered orders and moves/copies pending/in_transit orders to a new truck or next day
 */
export function separateUnfinishedOrders(orders: RawOrder[]): {
  delivered: RawOrder[];
  unfinished: RawOrder[];
} {
  const delivered: RawOrder[] = [];
  const unfinished: RawOrder[] = [];

  orders.forEach(o => {
    if (o.status === 'delivered') {
      delivered.push(o);
    } else {
      unfinished.push(o);
    }
  });

  return { delivered, unfinished };
}
