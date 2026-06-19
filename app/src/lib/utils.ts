import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseAvailabilityDate(availability: string): Date | undefined {
  if (!availability) return undefined;
  
  // Try YYYY-MM-DD match
  const yyyymmddMatch = availability.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (yyyymmddMatch) {
    const d = new Date(`${yyyymmddMatch[1]}-${yyyymmddMatch[2]}-${yyyymmddMatch[3]}`);
    if (!isNaN(d.getTime())) return d;
  }
  
  // Try DD MMM YYYY or DD Month YYYY (e.g. 26 Jun 2026 or 26 June 2026)
  const textDateMatch = availability.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);
  if (textDateMatch) {
    const d = new Date(`${textDateMatch[1]} ${textDateMatch[2]} ${textDateMatch[3]}`);
    if (!isNaN(d.getTime())) return d;
  }

  // Try DD MMM or DD Month without year (e.g. 26 Jun) - fallback current year
  const textDateNoYearMatch = availability.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/i);
  if (textDateNoYearMatch) {
    const currentYear = new Date().getFullYear();
    const d = new Date(`${textDateNoYearMatch[1]} ${textDateNoYearMatch[2]} ${currentYear}`);
    if (!isNaN(d.getTime())) return d;
  }

  return undefined;
}

export function doesAvailabilityMatchDay(availability: string, dayName: string): boolean {
  if (!availability) return false;
  if (availability.toLowerCase().includes(dayName.toLowerCase())) return true;
  
  // Try YYYY-MM-DD match
  const yyyymmddMatches = availability.match(/(\d{4})[-/](\d{2})[-/](\d{2})/g) || [];
  for (const match of yyyymmddMatches) {
    const d = new Date(match);
    if (!isNaN(d.getTime())) {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      if (days[d.getDay()] === dayName) return true;
    }
  }
  
  // Try DD MMM YYYY or DD Month YYYY
  const textDateMatches = availability.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/gi) || [];
  for (const match of textDateMatches) {
    const d = new Date(match);
    if (!isNaN(d.getTime())) {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      if (days[d.getDay()] === dayName) return true;
    }
  }

  // Try DD MMM or DD Month
  const textDateNoYearMatches = availability.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/gi) || [];
  for (const match of textDateNoYearMatches) {
    const currentYear = new Date().getFullYear();
    const d = new Date(`${match} ${currentYear}`);
    if (!isNaN(d.getTime())) {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      if (days[d.getDay()] === dayName) return true;
    }
  }

  return false;
}
