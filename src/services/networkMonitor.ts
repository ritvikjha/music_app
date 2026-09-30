import { CONFIG } from '../config';

type NetworkCallback = (isOnline: boolean) => void;

/**
 * Lightweight, crash-proof Network Monitor.
 * Uses lightweight connectivity heartbeats without requiring unlinked native libraries,
 * ensuring 100% safety for EAS OTA updates.
 */
class NetworkMonitor {
  private _isOnline = true;
  private listeners = new Set<NetworkCallback>();
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startMonitoring();
  }

  get isOnline(): boolean {
    return this._isOnline;
  }

  /**
   * Check connection via lightweight head request
   */
  async checkConnectivity(): Promise<boolean> {
    try {
      // Ping the server health endpoint or fallback
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const targetUrl = CONFIG.SYNC_SERVER_URL.startsWith('http')
        ? `${CONFIG.SYNC_SERVER_URL}/`
        : 'https://www.google.com/generate_204';

      const res = await fetch(targetUrl, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const online = res.status < 500;
      this.updateStatus(online);
      return online;
    } catch {
      this.updateStatus(false);
      return false;
    }
  }

  private updateStatus(online: boolean) {
    if (this._isOnline !== online) {
      this._isOnline = online;
      this.listeners.forEach((cb) => cb(online));
    }
  }

  startMonitoring(intervalMs = 12000): void {
    if (this.checkInterval) clearInterval(this.checkInterval);
    // Initial check
    this.checkConnectivity();
    this.checkInterval = setInterval(() => {
      this.checkConnectivity();
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  addListener(cb: NetworkCallback): () => void {
    this.listeners.add(cb);
    cb(this._isOnline);
    return () => this.listeners.delete(cb);
  }
}

export const networkMonitor = new NetworkMonitor();
