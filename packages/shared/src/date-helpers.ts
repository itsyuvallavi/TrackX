// Owner: packages/shared. Timezone-aware period helpers for budget windows.
import type { BudgetPeriod } from "./budget-schemas.js";

export type PeriodWindow = {
  start: Date;
  end: Date;
};

export function getPeriodWindow(
  date: Date,
  period: BudgetPeriod,
  timezone: string,
): PeriodWindow {
  const local = getLocalDateParts(date, timezone);

  if (period === "month") {
    return {
      start: zonedDateToUtc(local.year, local.month, 1, timezone),
      end: zonedDateToUtc(
        local.month === 12 ? local.year + 1 : local.year,
        local.month === 12 ? 1 : local.month + 1,
        1,
        timezone,
      ),
    };
  }

  const localMidday = new Date(
    Date.UTC(local.year, local.month - 1, local.day, 12),
  );
  const mondayOffset = (localMidday.getUTCDay() + 6) % 7;
  const monday = new Date(localMidday);
  monday.setUTCDate(localMidday.getUTCDate() - mondayOffset);

  return {
    start: zonedDateToUtc(
      monday.getUTCFullYear(),
      monday.getUTCMonth() + 1,
      monday.getUTCDate(),
      timezone,
    ),
    end: zonedDateToUtc(
      monday.getUTCFullYear(),
      monday.getUTCMonth() + 1,
      monday.getUTCDate() + 7,
      timezone,
    ),
  };
}

function getLocalDateParts(
  date: Date,
  timezone: string,
): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

function zonedDateToUtc(
  year: number,
  month: number,
  day: number,
  timezone: string,
): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day));
  const local = getLocalDateParts(utcGuess, timezone);
  const offsetDays = dayDifference({ year, month, day }, local);

  return new Date(Date.UTC(year, month - 1, day + offsetDays));
}

function dayDifference(
  target: { year: number; month: number; day: number },
  actual: { year: number; month: number; day: number },
): number {
  const targetUtc = Date.UTC(target.year, target.month - 1, target.day);
  const actualUtc = Date.UTC(actual.year, actual.month - 1, actual.day);

  return Math.round((targetUtc - actualUtc) / 86_400_000);
}
