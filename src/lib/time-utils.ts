/**
 * Shared time parsing utilities for task management
 */

/**
 * Convert minutes from midnight to time string (HH:mm)
 */
export function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

/**
 * Convert time string to minutes from midnight
 */
export function parseTimeToMinutes(timeStr: string): number | null {
  const match = timeStr.match(/(\d{1,2})(?:[:.]?(\d{2}))?\s*(am|pm)?/i);
  if (!match) return null;

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2] || "0");
  const period = match[3]?.toLowerCase();

  if (period === "pm" && hours !== 12) hours += 12;
  if (period === "am" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Parse time from text using time patterns
 */
export function parseTime(text: string): { hours: number; minutes: number } | null {
  // Match times like "2pm", "2:30pm", "14:00", "2:30"
  const ampmMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1]);
    const minutes = parseInt(ampmMatch[2] || "0");
    const period = ampmMatch[3].toLowerCase();
    if (period === "pm" && hours !== 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;
    return { hours, minutes };
  }

  const match = text.match(/(\d{1,2})[:\s](\d{2})/);
  if (match) {
    return { hours: parseInt(match[1]), minutes: parseInt(match[2]) };
  }
  return null;
}

/**
 * Parse time range from text (e.g., "from 2pm to 4pm", "9am-11am")
 */
export function parseTimeRange(text: string): { start_time?: string; end_time?: string } | null {
  // Match "from X to Y" pattern
  const fromToMatch = text.match(/from\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s+to\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  if (fromToMatch) {
    const startHour = parseTimeToMinutes(fromToMatch[1]);
    const endHour = parseTimeToMinutes(fromToMatch[2]);
    if (startHour !== null && endHour !== null) {
      return {
        start_time: formatMinutesToTime(startHour),
        end_time: formatMinutesToTime(endHour),
      };
    }
  }

  // Match "X-Y" time range pattern (e.g., "2-4pm", "9am-11am")
  const rangeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (rangeMatch) {
    const startHour = parseInt(rangeMatch[1]);
    const startMin = parseInt(rangeMatch[2] || "0");
    const endHour = parseInt(rangeMatch[3]);
    const endMin = parseInt(rangeMatch[4] || "0");
    const period = rangeMatch[5]?.toLowerCase();

    let startTotal = startHour * 60 + startMin;
    let endTotal = endHour * 60 + endMin;

    if (period === "pm" && startHour !== 12) startTotal += 12 * 60;
    if (period === "pm" && endHour !== 12) endTotal += 12 * 60;
    if (period === "am" && startHour === 12) startTotal = 0;
    if (period === "am" && endHour === 12) endTotal = 0;

    return {
      start_time: formatMinutesToTime(startTotal),
      end_time: formatMinutesToTime(endTotal),
    };
  }

  return null;
}

/**
 * Find the next occurrence of a specific day
 */
export function getNextDay(dayName: string): Date {
  const dayMap: Record<string, number> = {
    "monday": 1, "tuesday": 2, "wednesday": 3, "thursday": 4,
    "friday": 5, "saturday": 6, "sunday": 0
  };
  const targetDay = dayMap[dayName.toLowerCase()] ?? 1;
  const today = new Date();
  const currentDay = today.getDay();
  const daysAhead = (targetDay - currentDay + 7) % 7 || 7;
  const nextDay = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  return nextDay;
}

/**
 * Parse "January 15" or "Feb 3rd" style dates
 */
export function parseMonthDayDate(text: string): Date | null {
  const monthMap: Record<string, number> = {
    "january": 0, "february": 1, "march": 2, "april": 3,
    "may": 4, "june": 5, "july": 6, "august": 7,
    "september": 8, "october": 9, "november": 10, "december": 11
  };

  const shortMonthMap: Record<string, number> = {
    "jan": 0, "feb": 1, "mar": 2, "apr": 3,
    "jun": 4, "jul": 5, "aug": 6, "sep": 7,
    "oct": 8, "nov": 9, "dec": 10
  };

  for (const [monthName, monthNum] of Object.entries({ ...monthMap, ...shortMonthMap })) {
    if (text.toLowerCase().includes(monthName)) {
      const dayMatch = text.match(/(\d{1,2})(?:st|nd|rd|th)?/);
      if (dayMatch) {
        const day = parseInt(dayMatch[1]);
        const now = new Date();
        const year = now.getFullYear();
        let date = new Date(year, monthNum, day);

        // If date has passed, move to next year
        if (date < now) {
          date = new Date(year + 1, monthNum, day);
        }

        return date;
      }
    }
  }

  return null;
}