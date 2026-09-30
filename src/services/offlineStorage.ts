import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Song } from '../types';

const STASH_INDEX_KEY = '@jam_offline_stash_index';
const STASH_DIR = `${FileSystem.documentDirectory || ''}jam_stash/`;

export interface StashProgress {
  songId: string;
  transferredBytes: number;
  totalBytes: number;
  fraction: number;
}

interface StashIndex {
  [songId: string]: {
    song: Song;
    localAudioUri: string;
    localImageUri?: string;
    stashedAt: number;
    fileSizeBytes?: number;
  };
}

class OfflineStorageService {
  private isDirInitialized = false;

  private async ensureDir(): Promise<void> {
    if (this.isDirInitialized) return;
    try {
      if (!FileSystem.documentDirectory) return;
      const dirInfo = await FileSystem.getInfoAsync(STASH_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(STASH_DIR, { intermediates: true });
      }
      this.isDirInitialized = true;
    } catch (err) {
      console.warn('[OfflineStorage] Error ensuring stash directory:', err);
    }
  }

  private async getIndex(): Promise<StashIndex> {
    try {
      const raw = await AsyncStorage.getItem(STASH_INDEX_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private async saveIndex(index: StashIndex): Promise<void> {
    try {
      await AsyncStorage.setItem(STASH_INDEX_KEY, JSON.stringify(index));
    } catch (err) {
      console.warn('[OfflineStorage] Error saving index:', err);
    }
  }

  /**
   * Check if a song is already stashed locally.
   */
  async isStashed(songId: string): Promise<boolean> {
    if (!songId) return false;
    const index = await this.getIndex();
    const entry = index[songId];
    if (!entry) return false;

    try {
      const info = await FileSystem.getInfoAsync(entry.localAudioUri);
      return info.exists;
    } catch {
      return false;
    }
  }

  /**
   * Stash a track locally (audio stream + metadata).
   */
  async stashTrack(song: Song, onProgress?: (progress: StashProgress) => void): Promise<string> {
    await this.ensureDir();
    if (!FileSystem.documentDirectory) {
      throw new Error('Offline downloads are unavailable on this platform.');
    }
    if (!song.streamUrl || !/^https?:\/\//i.test(song.streamUrl)) {
      throw new Error('This track does not have a valid download URL.');
    }

    const localAudioUri = `${STASH_DIR}${song.id}.m4a`;
    try {
      await FileSystem.deleteAsync(localAudioUri, { idempotent: true });
      const download = FileSystem.createDownloadResumable(
        song.streamUrl,
        localAudioUri,
        {},
        (event) => onProgress?.({
          songId: song.id,
          transferredBytes: event.totalBytesWritten,
          totalBytes: event.totalBytesExpectedToWrite,
          fraction: event.totalBytesExpectedToWrite > 0
            ? event.totalBytesWritten / event.totalBytesExpectedToWrite
            : 0,
        })
      );
      const result = await download.downloadAsync();
      if (!result?.uri) throw new Error('The download was interrupted. Please try again.');
      const info = await FileSystem.getInfoAsync(result.uri);

      const index = await this.getIndex();
      index[song.id] = {
        song,
        localAudioUri: result.uri,
        stashedAt: Date.now(),
        fileSizeBytes: info.exists && 'size' in info ? Number(info.size) : undefined,
      };
      await this.saveIndex(index);

      return result.uri;
    } catch (error) {
      try { await FileSystem.deleteAsync(localAudioUri, { idempotent: true }); } catch {}
      const message = error instanceof Error ? error.message : '';
      if (/space|disk|quota/i.test(message)) throw new Error('Not enough storage space to stash this track.');
      if (/network|fetch|request|connection/i.test(message)) throw new Error('Download failed. Check your connection and try again.');
      throw new Error(message || 'Could not stash this track. Please try again.');
    }
  }

  /**
   * Remove a stashed track from local storage.
   */
  async removeStash(songId: string): Promise<void> {
    const index = await this.getIndex();
    const entry = index[songId];
    if (!entry) return;

    try {
      const info = await FileSystem.getInfoAsync(entry.localAudioUri);
      if (info.exists) {
        await FileSystem.deleteAsync(entry.localAudioUri, { idempotent: true });
      }
    } catch (err) {
      console.warn('[OfflineStorage] Delete error:', err);
    }

    delete index[songId];
    await this.saveIndex(index);
  }

  /**
   * Return local file URI if stashed, otherwise the remote streamUrl.
   */
  async getPlaybackUri(song: Song): Promise<string> {
    if (!song || !song.id) return song?.streamUrl || '';
    const index = await this.getIndex();
    const entry = index[song.id];
    if (!entry) return song.streamUrl;

    try {
      const info = await FileSystem.getInfoAsync(entry.localAudioUri);
      if (info.exists) {
        return entry.localAudioUri;
      }
    } catch {}

    return song.streamUrl;
  }

  /**
   * Retrieve all stashed songs.
   */
  async getAllStashedSongs(): Promise<Song[]> {
    const index = await this.getIndex();
    const entries = await Promise.all(Object.values(index).map(async (item) => {
      try {
        const info = await FileSystem.getInfoAsync(item.localAudioUri);
        return info.exists ? { ...item.song, streamUrl: item.localAudioUri } : null;
      } catch {
        return null;
      }
    }));
    return entries.filter((song): song is Song => song !== null);
  }

  async getStashedSongs(): Promise<Song[]> {
    return this.getAllStashedSongs();
  }

  async getStashSummary(): Promise<{ count: number; totalBytes: number }> {
    const index = await this.getIndex();
    return Object.values(index).reduce((summary, item) => ({
      count: summary.count + 1,
      totalBytes: summary.totalBytes + (item.fileSizeBytes || 0),
    }), { count: 0, totalBytes: 0 });
  }

  /**
   * Get total stashed tracks count.
   */
  async getStashCount(): Promise<number> {
    const index = await this.getIndex();
    return Object.keys(index).length;
  }

  /**
   * Clear all stashed tracks.
   */
  async clearAll(): Promise<void> {
    try {
      await FileSystem.deleteAsync(STASH_DIR, { idempotent: true });
      this.isDirInitialized = false;
      await AsyncStorage.removeItem(STASH_INDEX_KEY);
    } catch (err) {
      console.warn('[OfflineStorage] Clear error:', err);
    }
  }
}

export const offlineStorage = new OfflineStorageService();
