/**
 * src/jarvis/tools/toolRegistry.ts
 *
 * Central dispatcher for all Level 4 Jarvis Tools.
 */

import { getCurrentTime, getCurrentDate, getTimeOfDay } from './timeDateTool';
import { calculateExpression } from './mathTool';
import { convertUnits } from './unitConvertTool';
import { fetchWeather } from './weatherTool';
import { searchWebKnowledge } from './webSearchTool';
import { executeAppAutomation } from './appAutomationTool';

export interface ToolExecutionResult {
  spokenReply: string;
  data?: any;
}

export async function executeTool(name: string, slots: Record<string, any>): Promise<ToolExecutionResult> {
  switch (name) {
    case 'APP_AUTOMATION':
    case 'START_AUTO_SCROLL':
    case 'STOP_AUTOMATION':
    case 'TAP_ELEMENT':
    case 'TYPE_TEXT': {
      const autoRes = await executeAppAutomation({
        ...slots,
        action:
          name === 'START_AUTO_SCROLL'
            ? 'scroll'
            : name === 'STOP_AUTOMATION'
            ? 'stop'
            : name === 'TAP_ELEMENT'
            ? 'tap'
            : name === 'TYPE_TEXT'
            ? 'type'
            : slots?.action || 'scroll',
      });
      return { spokenReply: autoRes.spokenReply, data: autoRes.data };
    }

    case 'GET_WEATHER': {
      const city = slots?.location || slots?.city || slots?.query;
      const weatherText = await fetchWeather(city);
      return { spokenReply: `${weatherText}` };
    }

    case 'GET_TIME': {
      const timeStr = getCurrentTime(slots?.timezone);
      return { spokenReply: `${timeStr}, sir.` };
    }

    case 'GET_DATE': {
      const dateStr = getCurrentDate();
      return { spokenReply: `${dateStr}, sir.` };
    }

    case 'CALCULATE': {
      const expr = slots?.expression || slots?.query || '';
      const ans = calculateExpression(expr);
      return { spokenReply: `${ans}` };
    }

    case 'CONVERT_UNITS': {
      const val = parseFloat(slots?.value) || 1;
      const from = slots?.from || '';
      const to = slots?.to || '';
      const ans = convertUnits(val, from, to);
      return { spokenReply: `${ans}` };
    }

    case 'WEB_SEARCH': {
      const query = slots?.query || slots?.raw || '';
      const ans = await searchWebKnowledge(query);
      return { spokenReply: ans };
    }

    default:
      return { spokenReply: "I don't have that tool available yet, sir." };
  }
}

export {
  getCurrentTime,
  getCurrentDate,
  getTimeOfDay,
  calculateExpression,
  convertUnits,
  fetchWeather,
  searchWebKnowledge,
  executeAppAutomation,
};
