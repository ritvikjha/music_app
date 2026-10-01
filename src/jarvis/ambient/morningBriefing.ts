/**
 * src/jarvis/ambient/morningBriefing.ts
 *
 * Proactive Morning Briefing for Jarvis (Tony Stark style):
 * Combines greeting, current time/date, weather, battery state, and active reminders.
 */

import { getCurrentTime, getCurrentDate } from '../tools/timeDateTool';
import { fetchWeather } from '../tools/weatherTool';
import { getAllNotes } from '../memory/notepad';

export async function generateMorningBriefing(batteryPercent?: number): Promise<string> {
  const parts: string[] = [];

  parts.push("Good morning, sir. Systems online.");

  const dateStr = getCurrentDate();
  parts.push(`${dateStr}.`);

  const weather = await fetchWeather();
  parts.push(weather);

  if (batteryPercent !== undefined) {
    parts.push(`Device battery is at ${batteryPercent}%.`);
  }

  const notes = await getAllNotes();
  if (notes.length > 0) {
    const recent = notes.slice(0, 2).map((n) => `${n.key}: ${n.value}`).join('; ');
    parts.push(`Reminder from your notes: ${recent}.`);
  }

  parts.push("Ready for your instructions.");

  return parts.join(' ');
}
