/**
 * Lightweight Playback Latency & Diagnostics Logger.
 * Records time-to-first-sound and buffering latency without third-party analytics bloat.
 */
class PlaybackLatencyLogger {
  private startTime = 0;
  private trackTitle = '';
  private recentLogs: Array<{ track: string; latencyMs: number; timestamp: number }> = [];

  markStart(trackTitle: string): void {
    this.startTime = Date.now();
    this.trackTitle = trackTitle;
  }

  markPlaybackStarted(): number {
    if (!this.startTime) return 0;
    const latencyMs = Date.now() - this.startTime;
    this.recentLogs.unshift({
      track: this.trackTitle,
      latencyMs,
      timestamp: Date.now(),
    });
    if (this.recentLogs.length > 25) this.recentLogs.pop();
    this.startTime = 0;
    console.log(`[Audio Diagnostics] Track "${this.trackTitle}" started playback in ${latencyMs}ms`);
    return latencyMs;
  }

  getRecentLogs() {
    return this.recentLogs;
  }

  getAverageLatency(): number {
    if (this.recentLogs.length === 0) return 0;
    const sum = this.recentLogs.reduce((acc, curr) => acc + curr.latencyMs, 0);
    return Math.round(sum / this.recentLogs.length);
  }
}

export const latencyLogger = new PlaybackLatencyLogger();
