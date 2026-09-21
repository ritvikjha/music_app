import CryptoJS from 'crypto-js';
import type { Song } from '../types';

const DES_KEY = CryptoJS.enc.Utf8.parse('38346591');

/**
 * Decrypt JioSaavn encrypted_media_url to get direct AAC/MP4 streaming link.
 */
export function decryptMediaUrl(encryptedMediaUrl: string): string {
  if (!encryptedMediaUrl) return '';
  try {
    const decrypted = CryptoJS.DES.decrypt(
      encryptedMediaUrl,
      DES_KEY,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    );
    const link = decrypted.toString(CryptoJS.enc.Utf8);
    if (!link) return '';
    // Request 320kbps high quality stream
    return link.replace('_96', '_320');
  } catch (err) {
    console.warn('[Saavn] Decrypt error:', err);
    return '';
  }
}

/**
 * Unescape HTML entities commonly returned in JioSaavn titles and artist names.
 */
function unescapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

/**
 * Convert 50x50 or 150x150 thumbnail to 500x500 high-resolution artwork.
 */
function getHighResImage(imageUrl: string): string {
  if (!imageUrl) return '';
  return imageUrl
    .replace('150x150', '500x500')
    .replace('50x50', '500x500')
    .replace(/^http:\/\//, 'https://');
}

/**
 * Raw JioSaavn song shape from search.getResults & song.getDetails
 */
interface RawJioSaavnSong {
  id: string;
  song?: string;
  title?: string;
  album?: string;
  primary_artists?: string;
  singers?: string;
  image?: string;
  duration?: string | number;
  encrypted_media_url?: string;
  media_preview_url?: string;
  vlink?: string;
}

/**
 * Map raw JioSaavn item to our app's Song model.
 */
function mapRawToSong(item: RawJioSaavnSong): Song {
  const title = unescapeHtml(item.song || item.title || 'Unknown Title');
  const artist = unescapeHtml(
    item.primary_artists || item.singers || 'Unknown Artist'
  );
  const album = unescapeHtml(item.album || 'Unknown Album');
  const duration = typeof item.duration === 'string'
    ? parseInt(item.duration, 10) || 0
    : item.duration || 0;

  // Prefer decrypted 320kbps stream, fallback to media preview or vlink
  let streamUrl = '';
  if (item.encrypted_media_url) {
    streamUrl = decryptMediaUrl(item.encrypted_media_url);
  }
  if (!streamUrl && item.media_preview_url) {
    streamUrl = item.media_preview_url;
  }
  if (!streamUrl && item.vlink) {
    streamUrl = item.vlink;
  }

  return {
    id: item.id,
    title,
    artist,
    album,
    duration,
    imageUrl: getHighResImage(item.image || ''),
    streamUrl,
  };
}

/**
 * Search for songs on JioSaavn directly using official API endpoints.
 */
export async function searchSongs(query: string): Promise<Song[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const url = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&includeMetaTags=1&q=${encodeURIComponent(
      trimmed
    )}&n=25`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    if (!response.ok) {
      throw new Error(`Search request failed with status ${response.status}`);
    }

    const data = await response.json();
    const results: RawJioSaavnSong[] = data.results || [];

    return results
      .map(mapRawToSong)
      .filter((s) => Boolean(s.streamUrl));
  } catch (error) {
    console.error('[Saavn] Search error:', error);
    return [];
  }
}

/**
 * Fetch a single song by its JioSaavn ID.
 */
export async function getSongById(id: string): Promise<Song | null> {
  if (!id) return null;

  try {
    const url = `https://www.jiosaavn.com/api.php?__call=song.getDetails&cc=in&_marker=0&_format=json&pids=${encodeURIComponent(
      id
    )}`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    if (!response.ok) {
      throw new Error(`Song details fetch failed with status ${response.status}`);
    }

    const data = await response.json();
    const rawSong: RawJioSaavnSong | undefined =
      data[id] || (Object.values(data)[0] as RawJioSaavnSong);

    if (!rawSong || !rawSong.id) return null;

    return mapRawToSong(rawSong);
  } catch (error) {
    console.error('[Saavn] GetSongById error:', error);
    return null;
  }
}
