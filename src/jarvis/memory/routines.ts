/**
 * src/jarvis/memory/routines.ts
 *
 * User-Defined Routines & Phrase Aliases Store.
 * Allows users to create multi-command macros (e.g. "leaving home" -> [WiFi off, BT on, play music])
 * and custom phrase aliases (e.g. "go dark" -> "night protocol").
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const ROUTINES_STORAGE_KEY = '@jarvis_user_routines';
const ALIASES_STORAGE_KEY = '@jarvis_phrase_aliases';

export interface RoutineDefinition {
  name: string;
  actions: string[];
  createdAt: number;
}

/**
 * Get all stored user routines.
 */
export async function getAllRoutines(): Promise<Record<string, string[]>> {
  try {
    const raw = await AsyncStorage.getItem(ROUTINES_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[Jarvis Routines] Failed to load routines:', err);
    return {};
  }
}

/**
 * Save or update a named routine sequence.
 */
export async function saveRoutine(name: string, actions: string[]): Promise<boolean> {
  try {
    const cleanName = name.trim().toLowerCase();
    const cleanActions = actions.map((a) => a.trim()).filter((a) => a.length > 0);
    if (!cleanName || cleanActions.length === 0) return false;

    const routines = await getAllRoutines();
    routines[cleanName] = cleanActions;
    await AsyncStorage.setItem(ROUTINES_STORAGE_KEY, JSON.stringify(routines));
    console.log(`[Jarvis Routines] Saved routine "${cleanName}" with ${cleanActions.length} actions`);
    return true;
  } catch (err) {
    console.error('[Jarvis Routines] Error saving routine:', err);
    return false;
  }
}

/**
 * Retrieve actions for a given routine name.
 */
export async function getRoutine(name: string): Promise<string[] | null> {
  const cleanName = name.trim().toLowerCase();
  const routines = await getAllRoutines();
  return routines[cleanName] || null;
}

/**
 * Delete a user routine.
 */
export async function deleteRoutine(name: string): Promise<boolean> {
  try {
    const cleanName = name.trim().toLowerCase();
    const routines = await getAllRoutines();
    if (cleanName in routines) {
      delete routines[cleanName];
      await AsyncStorage.setItem(ROUTINES_STORAGE_KEY, JSON.stringify(routines));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Get all custom phrase aliases.
 */
export async function getAllAliases(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(ALIASES_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[Jarvis Aliases] Failed to load aliases:', err);
    return {};
  }
}

/**
 * Save a custom phrase alias (e.g. "go dark" -> "night protocol").
 */
export async function saveAlias(phrase: string, targetPhrase: string): Promise<boolean> {
  try {
    const cleanPhrase = phrase.trim().toLowerCase();
    const cleanTarget = targetPhrase.trim();
    if (!cleanPhrase || !cleanTarget) return false;

    const aliases = await getAllAliases();
    aliases[cleanPhrase] = cleanTarget;
    await AsyncStorage.setItem(ALIASES_STORAGE_KEY, JSON.stringify(aliases));
    console.log(`[Jarvis Aliases] Saved alias: "${cleanPhrase}" -> "${cleanTarget}"`);
    return true;
  } catch (err) {
    console.error('[Jarvis Aliases] Error saving alias:', err);
    return false;
  }
}

/**
 * Resolve a custom phrase alias if one is registered.
 */
export async function resolveAlias(phrase: string): Promise<string | null> {
  const clean = phrase.trim().toLowerCase();
  const aliases = await getAllAliases();
  return aliases[clean] || null;
}
