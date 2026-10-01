/**
 * src/jarvis/memory/conversationHistory.ts
 *
 * Persists recent multi-turn conversation context across app lifecycles.
 */

import { getStoredItem, setStoredItem } from './memoryStore';
import type { ConversationTurn } from '../brain/types';

const HISTORY_KEY = 'convo_history';
const MAX_STORED_TURNS = 20;

export async function getConversationHistory(): Promise<ConversationTurn[]> {
  return await getStoredItem<ConversationTurn[]>(HISTORY_KEY, []);
}

export async function appendConversationTurn(turn: ConversationTurn): Promise<void> {
  const history = await getConversationHistory();
  history.push(turn);
  if (history.length > MAX_STORED_TURNS) {
    history.splice(0, history.length - MAX_STORED_TURNS);
  }
  await setStoredItem(HISTORY_KEY, history);
}

export async function clearConversationHistory(): Promise<void> {
  await setStoredItem(HISTORY_KEY, []);
}
