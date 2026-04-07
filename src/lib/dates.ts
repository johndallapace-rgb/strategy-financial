import { addMonths, endOfMonth, format, startOfMonth } from "date-fns";

export function monthRange(base: Date) {
  return {
    start: startOfMonth(base),
    end: endOfMonth(base),
  };
}

export function monthId(base: Date) {
  return format(base, "yyyy-MM");
}

export function addMonth(base: Date, delta: number) {
  return addMonths(base, delta);
}

