/**
 * src/jarvis/tools/timeDateTool.ts
 *
 * Current time, date, day of the week, and timezone calculations.
 */

export function getCurrentTime(timezone?: string): string {
  const now = new Date();
  try {
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone || undefined,
    });
    return `It is currently ${timeStr}`;
  } catch {
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return `It is ${displayHour}:${minutes} ${ampm}`;
  }
}

export function getCurrentDate(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return `Today is ${now.toLocaleDateString('en-US', options)}`;
}

export function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}
