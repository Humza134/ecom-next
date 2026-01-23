// lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

type DateRange = "7d" | "30d" | "all" | "12m" | "ytd";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Helper ────────────────────────────────────────────────────────────────
export default function calculateStartDate(range: DateRange, reference: Date): Date {
  const start = new Date(reference);

  switch (range) {
    case "7d":
      start.setDate(start.getDate() - 7);
      break;

    case "30d":
      start.setDate(start.getDate() - 30);
      break;

    case "ytd":
      start.setMonth(0);
      start.setDate(1);
      break;

    case "12m":
      start.setFullYear(start.getFullYear() - 1);
      start.setDate(1); // most common UX choice for monthly charts
      break;

    case "all":
      start.setFullYear(2020, 0, 1); // or your business start date
      break;

    default:
      throw new Error(`Unsupported range: ${range}`);
  }

  // Reset time components (important!)
  start.setHours(0, 0, 0, 0);

  return start;
}