/**
 * src/jarvis/ambient/proactiveEngine.ts
 *
 * Coordinates ambient awareness, morning briefings, and proactive responses.
 */

import { generateMorningBriefing } from './morningBriefing';
import { evaluateAmbientEvent, type AmbientEvent } from './eventTriggers';

type SpokenOutputCallback = (text: string) => Promise<void> | void;

class ProactiveEngine {
  private speaker: SpokenOutputCallback | null = null;
  private lastBriefingDate: string | null = null;

  public registerSpeaker(callback: SpokenOutputCallback) {
    this.speaker = callback;
  }

  public async triggerEvent(event: AmbientEvent) {
    const text = evaluateAmbientEvent(event);
    if (text && this.speaker) {
      await this.speaker(text);
    }
  }

  public async triggerMorningBriefing(batteryPercent?: number): Promise<string> {
    const today = new Date().toDateString();
    this.lastBriefingDate = today;
    const briefing = await generateMorningBriefing(batteryPercent);
    if (this.speaker) {
      await this.speaker(briefing);
    }
    return briefing;
  }

  public hasBriefedToday(): boolean {
    return this.lastBriefingDate === new Date().toDateString();
  }
}

export const proactiveEngine = new ProactiveEngine();
