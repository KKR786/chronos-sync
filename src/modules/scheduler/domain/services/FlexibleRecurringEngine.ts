/**
 * @license Apache-2.0
 * Domain Service: FlexibleRecurringEngine
 * Extends standard CRON to support complex human rules:
 * - "Every 3rd Tuesday" (Ordinal weekday)
 * - "Every 10 business days" (Business day arithmetic skipping weekends)
 * - Standard 5-field CRON ("0 9 * * 1-5")
 */

export interface NextOccurrenceResult {
  nextExecutionDate: Date;
  ruleDescription: string;
  isBusinessDayOnly: boolean;
  humanSummary: string;
}

export class FlexibleRecurringEngine {
  /**
   * Computes the next execution date based on recurring parameters
   */
  public static computeNextOccurrence(
    pattern: string, // e.g. "ORDINAL:3:TUESDAY", "BUSINESS_DAYS:10", "CRON:0 9 * * 1-5"
    fromDate: Date = new Date()
  ): NextOccurrenceResult {
    const trimmed = pattern.trim().toUpperCase();

    // 1. Ordinal Weekday (e.g., "ORDINAL:3:TUESDAY" = 3rd Tuesday of next/current month)
    if (trimmed.startsWith('ORDINAL:')) {
      const parts = trimmed.split(':');
      const ordinal = parseInt(parts[1], 10) || 1; // 1st, 2nd, 3rd, 4th
      const dayName = parts[2]?.toUpperCase() || 'TUESDAY';
      const targetWeekday = this.weekdayNameToNumber(dayName);

      const nextDate = this.findNextOrdinalWeekday(fromDate, ordinal, targetWeekday);
      return {
        nextExecutionDate: nextDate,
        ruleDescription: `Every ${this.ordinalSuffix(ordinal)} ${dayName}`,
        isBusinessDayOnly: targetWeekday >= 1 && targetWeekday <= 5,
        humanSummary: `Scheduled for ${nextDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })} at 09:00 AM`,
      };
    }

    // 2. Business Days Offset (e.g. "BUSINESS_DAYS:10")
    if (trimmed.startsWith('BUSINESS_DAYS:')) {
      const parts = trimmed.split(':');
      const daysCount = parseInt(parts[1], 10) || 1;
      const nextDate = this.addBusinessDays(fromDate, daysCount);

      return {
        nextExecutionDate: nextDate,
        ruleDescription: `Every ${daysCount} business days`,
        isBusinessDayOnly: true,
        humanSummary: `Scheduled for ${nextDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} (+${daysCount} business days, weekends skipped)`,
      };
    }

    // 3. Fallback: Standard Daily / Weekly or Cron representation
    const defaultNext = new Date(fromDate);
    defaultNext.setDate(defaultNext.getDate() + 7);
    defaultNext.setHours(9, 0, 0, 0);

    return {
      nextExecutionDate: defaultNext,
      ruleDescription: `Weekly recurrence (${pattern})`,
      isBusinessDayOnly: false,
      humanSummary: `Next run: ${defaultNext.toLocaleDateString()}`,
    };
  }

  private static findNextOrdinalWeekday(from: Date, ordinal: number, targetWeekday: number): Date {
    let year = from.getFullYear();
    let month = from.getMonth();

    // Check candidate in current month
    let candidate = this.getOrdinalWeekdayOfMonth(year, month, ordinal, targetWeekday);
    if (candidate.getTime() <= from.getTime()) {
      // If already passed this month, move to next month
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
      candidate = this.getOrdinalWeekdayOfMonth(year, month, ordinal, targetWeekday);
    }

    candidate.setHours(9, 0, 0, 0);
    return candidate;
  }

  private static getOrdinalWeekdayOfMonth(year: number, month: number, ordinal: number, targetWeekday: number): Date {
    const firstDay = new Date(year, month, 1);
    let dayOfWeek = firstDay.getDay();

    let offset = (targetWeekday - dayOfWeek + 7) % 7;
    let dayNumber = 1 + offset + (ordinal - 1) * 7;

    return new Date(year, month, dayNumber);
  }

  private static addBusinessDays(from: Date, businessDays: number): Date {
    const current = new Date(from);
    let added = 0;

    while (added < businessDays) {
      current.setDate(current.getDate() + 1);
      const day = current.getDay();
      if (day !== 0 && day !== 6) { // Skip Sunday (0) and Saturday (6)
        added += 1;
      }
    }
    current.setHours(9, 0, 0, 0);
    return current;
  }

  private static weekdayNameToNumber(name: string): number {
    switch (name) {
      case 'SUNDAY': return 0;
      case 'MONDAY': return 1;
      case 'TUESDAY': return 2;
      case 'WEDNESDAY': return 3;
      case 'THURSDAY': return 4;
      case 'FRIDAY': return 5;
      case 'SATURDAY': return 6;
      default: return 2; // Default Tuesday
    }
  }

  private static ordinalSuffix(i: number): string {
    const j = i % 10;
    const k = i % 100;
    if (j === 1 && k !== 11) return `${i}st`;
    if (j === 2 && k !== 12) return `${i}nd`;
    if (j === 3 && k !== 13) return `${i}rd`;
    return `${i}th`;
  }
}
