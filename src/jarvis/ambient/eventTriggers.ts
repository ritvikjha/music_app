/**
 * src/jarvis/ambient/eventTriggers.ts
 *
 * Ambient event triggers that Jarvis can respond to proactively:
 * - Charger connected/disconnected
 * - Battery low
 * - Headphones connected
 */

export type AmbientEvent =
  | { type: 'CHARGER_CONNECTED'; batteryPercent?: number }
  | { type: 'CHARGER_DISCONNECTED' }
  | { type: 'BATTERY_LOW'; batteryPercent: number }
  | { type: 'HEADPHONES_CONNECTED' };

export function evaluateAmbientEvent(event: AmbientEvent): string | null {
  switch (event.type) {
    case 'CHARGER_CONNECTED':
      return event.batteryPercent !== undefined
        ? `Power source connected, sir. Battery at ${event.batteryPercent}%.`
        : 'Power source connected, sir. Charging initiated.';

    case 'CHARGER_DISCONNECTED':
      return 'Running on internal battery power, sir.';

    case 'BATTERY_LOW':
      return `Power levels critical at ${event.batteryPercent}%, sir. Shall I activate power saving protocols?`;

    case 'HEADPHONES_CONNECTED':
      return 'Audio output routed to headphones, sir.';

    default:
      return null;
  }
}
