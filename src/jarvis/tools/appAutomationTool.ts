/**
 * src/jarvis/tools/appAutomationTool.ts
 *
 * Level 6: General App UI Automation Tool for Jarvis Agent.
 * Reusable, general framework for opening apps, auto-scrolling, tapping elements,
 * typing into fields, and inspecting screens via Android AccessibilityService.
 */

import {
  openApp,
  startAutoScroll,
  stopAutomation,
  isAutomationRunning,
  tapElement,
  typeText,
  getForegroundApp,
  inspectScreen,
  isAccessibilityServiceActive,
} from '../JarvisService';

export interface AutomationStep {
  action: 'open_app' | 'scroll' | 'tap' | 'type' | 'stop' | 'wait' | 'inspect';
  appName?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  intervalSeconds?: number;
  durationSeconds?: number;
  query?: string;
  text?: string;
  delayMs?: number;
}

export interface AutomationToolResult {
  success: boolean;
  spokenReply: string;
  data?: any;
}

/**
 * Execute an automation action or multi-step workflow.
 */
export async function executeAppAutomation(
  slots: Record<string, any>
): Promise<AutomationToolResult> {
  const isA11yEnabled = isAccessibilityServiceActive();
  if (!isA11yEnabled) {
    return {
      success: false,
      spokenReply:
        'Please enable Jarvis Automation under Accessibility Settings first, sir.',
      data: { error: 'ACCESSIBILITY_DISABLED' },
    };
  }

  const action = (slots?.action || 'scroll').toLowerCase().trim();

  // 1. STOP AUTOMATION
  if (action === 'stop' || action === 'cancel') {
    const stopped = stopAutomation();
    return {
      success: true,
      spokenReply: stopped
        ? 'Automation stopped, sir.'
        : 'No automation was actively running, sir.',
      data: { stopped },
    };
  }

  // 2. OPEN APP
  if (action === 'open_app' || action === 'open') {
    const appName = (slots?.appName || slots?.app || slots?.query || '').trim();
    if (!appName) {
      return {
        success: false,
        spokenReply: 'Which app would you like me to open, sir?',
      };
    }
    const opened = openApp(appName);
    return {
      success: opened,
      spokenReply: opened
        ? `Opening ${appName}, sir.`
        : `Could not find ${appName} installed, sir.`,
      data: { appName, opened },
    };
  }

  // 3. START AUTO-SCROLL
  if (action === 'scroll' || action === 'start_scroll') {
    const direction = (slots?.direction || 'up').toLowerCase().trim() as
      | 'up'
      | 'down'
      | 'left'
      | 'right';
    const interval = Math.max(1.5, parseFloat(slots?.intervalSeconds || slots?.interval) || 10);
    const duration = parseInt(slots?.durationSeconds || slots?.duration, 10) || 0;
    const appName = (slots?.appName || slots?.app || '').trim();

    // If an app was specified (e.g. "scroll Instagram reels"), open the app first
    if (appName) {
      openApp(appName);
      // Give app time to launch before starting swipe gestures
      await new Promise((res) => setTimeout(res, 1800));
    }

    const started = startAutoScroll(direction, interval, duration);
    return {
      success: started,
      spokenReply: started
        ? `Auto-scrolling every ${Math.round(interval)} seconds, sir. Say "stop" anytime.`
        : 'Failed to start auto-scroll. Please verify accessibility permissions.',
      data: { direction, interval, duration, started },
    };
  }

  // 4. TAP ELEMENT
  if (action === 'tap' || action === 'click') {
    const query = (slots?.query || slots?.target || slots?.text || '').trim();
    if (!query) {
      return {
        success: false,
        spokenReply: 'What element should I tap, sir?',
      };
    }
    const tapped = tapElement(query);
    return {
      success: tapped,
      spokenReply: tapped
        ? `Tapped ${query}, sir.`
        : `Could not find "${query}" on the screen, sir.`,
      data: { query, tapped },
    };
  }

  // 5. TYPE TEXT
  if (action === 'type' || action === 'input' || action === 'write') {
    const textToType = (slots?.text || slots?.value || '').trim();
    const fieldQuery = (slots?.query || slots?.target || '').trim();
    if (!textToType) {
      return {
        success: false,
        spokenReply: 'What text should I type, sir?',
      };
    }
    const typed = typeText(fieldQuery, textToType);
    return {
      success: typed,
      spokenReply: typed
        ? `Typed "${textToType}", sir.`
        : 'Could not find an editable input field on the screen, sir.',
      data: { text: textToType, field: fieldQuery, typed },
    };
  }

  // 6. GET FOREGROUND APP
  if (action === 'get_foreground' || action === 'active_app') {
    const info = getForegroundApp();
    return {
      success: true,
      spokenReply: info.appName
        ? `Active app is ${info.appName}, sir.`
        : 'Could not determine the foreground app, sir.',
      data: info,
    };
  }

  // 7. INSPECT SCREEN
  if (action === 'inspect' || action === 'read_screen') {
    const elements = inspectScreen();
    return {
      success: true,
      spokenReply: `Detected ${elements.length} interactive elements on the screen, sir.`,
      data: { elements },
    };
  }

  // 8. MULTI-STEP WORKFLOW
  if (action === 'workflow' || Array.isArray(slots?.steps)) {
    const steps: AutomationStep[] = slots?.steps || [];
    for (const step of steps) {
      if (step.action === 'open_app' && step.appName) {
        openApp(step.appName);
        await new Promise((res) => setTimeout(res, step.delayMs || 1500));
      } else if (step.action === 'tap' && step.query) {
        tapElement(step.query);
        await new Promise((res) => setTimeout(res, step.delayMs || 800));
      } else if (step.action === 'type' && step.text) {
        typeText(step.query || '', step.text);
        await new Promise((res) => setTimeout(res, step.delayMs || 800));
      } else if (step.action === 'scroll') {
        startAutoScroll(step.direction || 'up', step.intervalSeconds || 10, step.durationSeconds || 0);
      } else if (step.action === 'stop') {
        stopAutomation();
      }
    }
    return {
      success: true,
      spokenReply: 'Executed automation workflow, sir.',
      data: { executedSteps: steps.length },
    };
  }

  return {
    success: false,
    spokenReply: `Unknown automation action "${action}", sir.`,
  };
}
