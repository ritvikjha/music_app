/**
 * src/jarvis/memory/notepad.ts
 *
 * Long-term user knowledge store ("Remember X" / "What did I say about X?").
 * Allows Jarvis to store arbitrary personal facts and recall them naturally.
 */

import { getStoredItem, setStoredItem } from './memoryStore';
import type { UserNote } from '../brain/types';

const NOTES_KEY = 'user_notes';
const MAX_NOTES = 100;

export async function getAllNotes(): Promise<UserNote[]> {
  return await getStoredItem<UserNote[]>(NOTES_KEY, []);
}

export async function saveNote(key: string, value: string): Promise<UserNote> {
  const notes = await getAllNotes();
  const cleanKey = key.trim().toLowerCase();
  const cleanValue = value.trim();

  // Update existing note if matching key found, else append
  const existingIdx = notes.findIndex((n) => n.key.toLowerCase() === cleanKey);
  const note: UserNote = {
    key: cleanKey,
    value: cleanValue,
    timestamp: Date.now(),
  };

  if (existingIdx >= 0) {
    notes[existingIdx] = note;
  } else {
    notes.unshift(note);
    if (notes.length > MAX_NOTES) {
      notes.pop();
    }
  }

  await setStoredItem(NOTES_KEY, notes);
  console.log(`[Jarvis Notepad] Saved note: "${cleanKey}" -> "${cleanValue}"`);
  return note;
}

export async function findNote(query: string): Promise<UserNote | null> {
  const notes = await getAllNotes();
  if (notes.length === 0) return null;

  const cleanQuery = query.trim().toLowerCase();

  // 1. Exact match on key
  const exact = notes.find((n) => n.key.toLowerCase() === cleanQuery);
  if (exact) return exact;

  // 2. Query contains key or key contains query
  const substring = notes.find(
    (n) => cleanQuery.includes(n.key.toLowerCase()) || n.key.toLowerCase().includes(cleanQuery)
  );
  if (substring) return substring;

  // 3. Word overlap match
  const words = cleanQuery.split(/\s+/).filter((w) => w.length > 2);
  for (const word of words) {
    const match = notes.find((n) => n.key.toLowerCase().includes(word));
    if (match) return match;
  }

  return null;
}

export async function deleteNote(key: string): Promise<boolean> {
  const notes = await getAllNotes();
  const cleanKey = key.trim().toLowerCase();
  const filtered = notes.filter((n) => n.key.toLowerCase() !== cleanKey);
  if (filtered.length !== notes.length) {
    await setStoredItem(NOTES_KEY, filtered);
    return true;
  }
  return false;
}
