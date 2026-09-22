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

/**
 * Fetch trending songs from JioSaavn.
 * Uses the search API with popular queries as a reliable fallback.
 */
export async function getTrending(): Promise<Song[]> {
  try {
    // JioSaavn's trending content endpoint
    const url = `https://www.jiosaavn.com/api.php?__call=content.getTrending&api_version=4&_format=json&_marker=0&cc=in&type=song&n=20`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    if (!response.ok) {
      throw new Error(`Trending fetch failed with status ${response.status}`);
    }

    const data = await response.json();

    // The response can vary — try common shapes
    let rawItems: RawJioSaavnSong[] = [];
    if (Array.isArray(data)) {
      rawItems = data;
    } else if (data.results && Array.isArray(data.results)) {
      rawItems = data.results;
    } else if (data.data && Array.isArray(data.data)) {
      rawItems = data.data;
    } else {
      // Extract song-like items from any nested structure
      const values = Object.values(data);
      for (const val of values) {
        if (Array.isArray(val) && val.length > 0 && val[0]?.id) {
          rawItems = val as RawJioSaavnSong[];
          break;
        }
      }
    }

    const songs = rawItems
      .map(mapRawToSong)
      .filter((s) => Boolean(s.streamUrl));

    if (songs.length > 0) return songs;

    // Fallback: search for a popular query to simulate trending
    return searchSongs('trending hits 2025');
  } catch (error) {
    console.error('[Saavn] getTrending error:', error);
    // Fallback on any error
    try {
      return await searchSongs('trending hits 2025');
    } catch {
      return [];
    }
  }
}

/**
 * Fetch top search suggestions from JioSaavn.
 * Returns a list of trending search terms.
 */
export async function getTopSearches(): Promise<string[]> {
  try {
    const url = `https://www.jiosaavn.com/api.php?__call=content.getTopSearches&api_version=4&_format=json&_marker=0&cc=in`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    if (!response.ok) return getDefaultSearchChips();

    const data = await response.json();

    // Extract search terms from the response
    let terms: string[] = [];
    if (Array.isArray(data)) {
      terms = data
        .filter((item: any) => item?.title || item?.name)
        .map((item: any) => unescapeHtml(item.title || item.name))
        .slice(0, 10);
    }

    return terms.length > 0 ? terms : getDefaultSearchChips();
  } catch (error) {
    console.error('[Saavn] getTopSearches error:', error);
    return getDefaultSearchChips();
  }
}

function getDefaultSearchChips(): string[] {
  return [
    'Arijit Singh', 'Diljit Dosanjh', 'AP Dhillon',
    'Shreya Ghoshal', 'Bollywood Hits', 'Punjabi Hits',
    'Love Songs', 'Party Songs', 'Sad Songs', 'English Pop',
  ];
}

/**
 * Fetch related / recommended songs for Endless Radio and Smart Autoplay.
 * 1. Uses JioSaavn's dynamic entity station (webradio.createEntityStation & webradio.getSong).
 * 2. If station unavailable or returns empty, falls back to searching by primary artist.
 * 3. Fallback to trending hits if needed.
 * Filters out the current playing song ID and guarantees valid streamUrls.
 */
export async function getRelatedSongs(song: Song, count = 10): Promise<Song[]> {
  if (!song) return [];

  // Attempt 1: JioSaavn WebRadio / Entity Station
  try {
    const stationUrl = `https://www.jiosaavn.com/api.php?__call=webradio.createEntityStation&_format=json&_marker=0&ctx=android&entity_id=%5B%22${encodeURIComponent(
      song.id
    )}%22%5D&entity_type=queue`;

    const stationRes = await fetch(stationUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    if (stationRes.ok) {
      const stationData = await stationRes.json();
      const stationId = stationData?.stationid;

      if (stationId) {
        const songsUrl = `https://www.jiosaavn.com/api.php?__call=webradio.getSong&_format=json&_marker=0&ctx=android&stationid=${encodeURIComponent(
          stationId
        )}&k=${count}`;

        const songsRes = await fetch(songsUrl, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          },
        });

        if (songsRes.ok) {
          const songsData = await songsRes.json();
          const rawItems: RawJioSaavnSong[] = [];
          Object.keys(songsData).forEach((key) => {
            const item = songsData[key];
            if (item?.song && item.song.id) {
              rawItems.push(item.song);
            } else if (item?.id) {
              rawItems.push(item);
            }
          });

          const mapped = rawItems
            .map(mapRawToSong)
            .filter((s) => s.id !== song.id && Boolean(s.streamUrl));

          if (mapped.length > 0) {
            return mapped.slice(0, count);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Saavn] webradio error, trying fallback:', err);
  }

  // Attempt 2: Fallback search based on artist name
  try {
    const artistQuery = song.artist?.split(/,|&|\//)[0]?.trim() || song.artist;
    if (artistQuery && artistQuery.length > 2) {
      const artistSongs = await searchSongs(artistQuery);
      const filtered = artistSongs.filter((s) => s.id !== song.id && Boolean(s.streamUrl));
      if (filtered.length > 0) {
        return filtered.slice(0, count);
      }
    }
  } catch (err) {
    console.warn('[Saavn] artist fallback error:', err);
  }

  // Attempt 3: Trending songs fallback
  try {
    const trending = await getTrending();
    return trending.filter((s) => s.id !== song.id && Boolean(s.streamUrl)).slice(0, count);
  } catch {
    return [];
  }
}

