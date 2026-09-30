import CryptoJS from 'crypto-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';
import type { Song } from '../types';

const DES_KEY = CryptoJS.enc.Utf8.parse('38346591');
let preferredBitrate: '160' | '320' = '320';
let qualityLoaded = false;
let qualityLoad: Promise<void> | null = null;
let qualityOverridden = false;

async function ensureAudioQualityLoaded(): Promise<void> {
  if (qualityLoaded) return;
  if (!qualityLoad) {
    qualityLoad = AsyncStorage.getItem('@jam_audio_quality')
      .then((saved) => { if (!qualityOverridden) preferredBitrate = saved === 'Normal (160k)' ? '160' : '320'; })
      .catch(() => {})
      .finally(() => { qualityLoaded = true; });
  }
  await qualityLoad;
}

export function setPreferredAudioQuality(label: string): void {
  preferredBitrate = label === 'Normal (160k)' ? '160' : '320';
  qualityOverridden = true;
  qualityLoaded = true;
}

/**
 * Decrypt JioSaavn encrypted_media_url to get direct AAC/MP4 streaming link.
 */
export function decryptMediaUrl(encryptedMediaUrl: string, bitrate = preferredBitrate): string {
  if (!encryptedMediaUrl) return '';
  try {
    const decrypted = CryptoJS.DES.decrypt(
      encryptedMediaUrl,
      DES_KEY,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    );
    const link = decrypted.toString(CryptoJS.enc.Utf8);
    if (!link) return '';
    return link.replace(/_(96|160|320)(?=\.)/, `_${bitrate}`);
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
 * High-resolution fallback artwork placeholder for music player notifications and lock-screen widgets.
 */
export const DEFAULT_FALLBACK_ARTWORK =
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80';

/**
 * Convert 50x50 or 150x150 thumbnail to 500x500 high-resolution artwork,
 * enforces HTTPS for Android network security policy, and provides fallback.
 */
export function getHighResImage(imageUrl?: string | null): string {
  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) {
    return DEFAULT_FALLBACK_ARTWORK;
  }
  let resolved = imageUrl
    .trim()
    .replace(/150x150/gi, '500x500')
    .replace(/50x50/gi, '500x500');

  if (resolved.startsWith('http://')) {
    resolved = resolved.replace(/^http:\/\//i, 'https://');
  }
  if (resolved.startsWith('//')) {
    resolved = `https:${resolved}`;
  }
  return resolved;
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
  more_info?: { album_id?: string; artistMap?: { primary_artists?: { id?: string }[] } };
  artistMap?: { primary_artists?: { id?: string }[] };
  album_id?: string;
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
    albumId: item.album_id || item.more_info?.album_id,
    artistId: item.artistMap?.primary_artists?.[0]?.id || item.more_info?.artistMap?.primary_artists?.[0]?.id,
  };
}

/**
 * Search for songs on JioSaavn directly using official API endpoints.
 */
export async function searchSongs(query: string): Promise<Song[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  await ensureAudioQualityLoaded();

  try {
    const url = `${CONFIG.SAAVN_API_URL}/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&includeMetaTags=1&q=${encodeURIComponent(
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
    throw new Error('Could not reach the music service. Please try again.', { cause: error });
  }
}

/**
 * Fetch a single song by its JioSaavn ID.
 */
export async function getSongById(id: string): Promise<Song | null> {
  if (!id) return null;
  await ensureAudioQualityLoaded();

  try {
    const url = `${CONFIG.SAAVN_API_URL}/api.php?__call=song.getDetails&cc=in&_marker=0&_format=json&pids=${encodeURIComponent(
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

function extractCollectionSongs(data: any): Song[] {
  const candidates = [
    data?.songs,
    data?.songs?.data,
    data?.topSongs,
    data?.topSongs?.data,
    data?.data?.songs,
    data?.data?.topSongs,
    data?.album?.songs,
  ];
  const raw = candidates.find(Array.isArray) as RawJioSaavnSong[] | undefined;
  return (raw || [])
    .map((item: any) => mapRawToSong(item?.song || item))
    .filter((song) => Boolean(song.id && song.streamUrl));
}

/** Fetch album tracks using JioSaavn's content.getAlbumDetails endpoint. */
export async function getAlbumSongs(albumIdOrQuery: string): Promise<Song[]> {
  const value = albumIdOrQuery.trim();
  if (!value) return [];
  await ensureAudioQualityLoaded();
  if (!/^[a-zA-Z0-9_-]{5,}$/.test(value)) {
    const found = await searchSongs(value);
    return found.filter((song) => song.album.toLowerCase().includes(value.toLowerCase()));
  }
  try {
    const url = `${CONFIG.SAAVN_API_URL}/api.php?__call=content.getAlbumDetails&_format=json&cc=in&_marker=0&albumid=${encodeURIComponent(value)}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Album request failed (${response.status})`);
    return extractCollectionSongs(await response.json());
  } catch (error) {
    console.warn('[Saavn] Album fetch error:', error);
    return [];
  }
}

/** Fetch an artist's top tracks; falls back to song search for a plain-text artist name. */
export async function getArtistSongs(artistIdOrQuery: string): Promise<Song[]> {
  const value = artistIdOrQuery.trim();
  if (!value) return [];
  await ensureAudioQualityLoaded();
  if (!/^[a-zA-Z0-9_-]{5,}$/.test(value)) return searchSongs(value);
  try {
    const url = `${CONFIG.SAAVN_API_URL}/api.php?__call=artist.getArtistPageDetails&_format=json&cc=in&_marker=0&artistId=${encodeURIComponent(value)}&page=0&n_song=50`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Artist request failed (${response.status})`);
    const songs = extractCollectionSongs(await response.json());
    return songs.length ? songs : searchSongs(value);
  } catch (error) {
    console.warn('[Saavn] Artist fetch error:', error);
    return [];
  }
}

/**
 * Fetch trending songs from JioSaavn.
 * Uses the search API with popular queries as a reliable fallback.
 */
export async function getTrending(): Promise<Song[]> {
  await ensureAudioQualityLoaded();
  try {
    // JioSaavn's trending content endpoint
    const url = `${CONFIG.SAAVN_API_URL}/api.php?__call=content.getTrending&api_version=4&_format=json&_marker=0&cc=in&type=song&n=20`;

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
    const url = `${CONFIG.SAAVN_API_URL}/api.php?__call=content.getTopSearches&api_version=4&_format=json&_marker=0&cc=in`;

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
    const stationUrl = `${CONFIG.SAAVN_API_URL}/api.php?__call=webradio.createEntityStation&_format=json&_marker=0&ctx=android&entity_id=%5B%22${encodeURIComponent(
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
        const songsUrl = `${CONFIG.SAAVN_API_URL}/api.php?__call=webradio.getSong&_format=json&_marker=0&ctx=android&stationid=${encodeURIComponent(
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
/**
 * Fetch live search autocomplete suggestions directly from JioSaavn.
 */
export async function getSearchSuggestions(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  try {
    const url = `${CONFIG.SAAVN_API_URL}/api.php?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMetaTags=1&query=${encodeURIComponent(
      trimmed
    )}`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    if (!response.ok) return [];

    const data = await response.json();
    const suggestions: string[] = [];

    // 1. Top query suggestion
    if (data.topquery?.data && Array.isArray(data.topquery.data)) {
      data.topquery.data.forEach((item: any) => {
        const text = unescapeHtml(item.title || item.song || item.name || '');
        if (text && !suggestions.includes(text)) suggestions.push(text);
      });
    }

    // 2. Songs autocomplete
    if (data.songs?.data && Array.isArray(data.songs.data)) {
      data.songs.data.forEach((item: any) => {
        const text = unescapeHtml(item.title || item.song || '');
        if (text && !suggestions.includes(text)) suggestions.push(text);
      });
    }

    // 3. Artists & Albums
    if (data.artists?.data && Array.isArray(data.artists.data)) {
      data.artists.data.forEach((item: any) => {
        const text = unescapeHtml(item.title || item.name || '');
        if (text && !suggestions.includes(text)) suggestions.push(text);
      });
    }

    return suggestions.slice(0, 8);
  } catch (error) {
    console.warn('[Saavn] Autocomplete error:', error);
    return [];
  }
}

/**
 * Regional & genre filtered search.
 */
export async function searchSongsWithFilter(
  query: string,
  filter?: string
): Promise<Song[]> {
  let finalQuery = query.trim();
  if (filter && filter !== 'All') {
    finalQuery = `${finalQuery} ${filter}`.trim();
  }
  return searchSongs(finalQuery);
}

export interface VibeResult {
  vibeTitle: string;
  description: string;
  tag: string;
  songs: Song[];
}

/**
 * AI Vibe & Mood Generator: Dynamically builds fresh playback queues
 * matching tempo, genre tags, and contextual prompts using 100% real JioSaavn live streams.
 */
export async function generateVibeQueue(
  vibePrompt: string,
  seedSong?: Song | null
): Promise<VibeResult> {
  const prompt = vibePrompt.toLowerCase().trim();

  // Preset Vibe Profiles with targeted queries for JioSaavn
  const vibeProfiles: Record<
    string,
    { title: string; description: string; queries: string[]; tag: string }
  > = {
    cyberpunk: {
      title: 'Neon Cyberpunk Overdrive',
      description: 'High-octane synths, dark electro-pop & futuristic basslines',
      queries: ['synthwave cyberpunk', 'electronic bass hits', 'gaming edm 2025'],
      tag: 'Cyberpunk / High BPM',
    },
    lofi: {
      title: 'Midnight Rain Lo-Fi',
      description: 'Mellow chillhop, nostalgic chords & midnight introspection',
      queries: ['lofi chillhop beats', 'hindi lofi acoustic', 'midnight chill study'],
      tag: 'Lo-Fi / Chill',
    },
    workout: {
      title: 'Adrenaline Rush Gym Club',
      description: 'Explosive workout anthems and high-tempo beats',
      queries: ['gym workout motivation', 'punjabi bass workout', 'hardstyle edm'],
      tag: 'High Energy / Workout',
    },
    monsoon: {
      title: 'Monsoon Melancholy & Chai',
      description: 'Soulful acoustic ballads, soft guitars & rainy afternoon nostalgia',
      queries: ['rain acoustic bollywood', 'arijit singh unplugged', 'soft indie hindi'],
      tag: 'Melodic / Emotional',
    },
    party: {
      title: 'Club Euphoria & Desi Heat',
      description: 'Floor-burning Punjabi beats, dancehall & club bangers',
      queries: ['punjabi club party', 'badshah honey singh party hits', 'dance hits 2025'],
      tag: 'Club / Party',
    },
    sunset: {
      title: 'Golden Hour Sunset Drive',
      description: 'Dreamy synth-pop, smooth R&B and breeze-riding melodies',
      queries: ['sunset drive chill', 'english indie pop hits', 'prateek kuhad acoustic'],
      tag: 'Smooth / Ambient',
    },
  };

  // Detect matching profile or build custom context
  let selected = vibeProfiles.lofi;
  if (prompt.includes('cyber') || prompt.includes('neon') || prompt.includes('futuristic')) {
    selected = vibeProfiles.cyberpunk;
  } else if (prompt.includes('work') || prompt.includes('gym') || prompt.includes('energy') || prompt.includes('run')) {
    selected = vibeProfiles.workout;
  } else if (prompt.includes('party') || prompt.includes('club') || prompt.includes('dance')) {
    selected = vibeProfiles.party;
  } else if (prompt.includes('rain') || prompt.includes('monsoon') || prompt.includes('sad') || prompt.includes('love')) {
    selected = vibeProfiles.monsoon;
  } else if (prompt.includes('drive') || prompt.includes('sunset') || prompt.includes('chill') || prompt.includes('relax')) {
    selected = vibeProfiles.sunset;
  } else if (vibePrompt.length > 0) {
    selected = {
      title: `${vibePrompt.charAt(0).toUpperCase() + vibePrompt.slice(1)} Sonic Vibe`,
      description: `Custom curated vibe queue powered by JioSaavn audio streams`,
      queries: [`${vibePrompt} hits`, `${vibePrompt} songs`],
      tag: 'Dynamic Vibe',
    };
  }

  // If a seed song is provided, add artist context into queries
  const searchPromises = selected.queries.map((q) => searchSongs(q));
  if (seedSong?.artist) {
    const artistSeed = seedSong.artist.split(/,|&/)[0].trim();
    searchPromises.push(searchSongs(artistSeed));
  }

  const results = await Promise.allSettled(searchPromises);
  const songPool: Song[] = [];
  const seenIds = new Set<string>();

  for (const res of results) {
    if (res.status === 'fulfilled') {
      for (const song of res.value) {
        if (!seenIds.has(song.id) && song.streamUrl) {
          seenIds.add(song.id);
          songPool.push(song);
        }
      }
    }
  }

  // Shuffle song pool for fresh vibe feeling
  const shuffled = songPool.sort(() => Math.random() - 0.5);

  return {
    vibeTitle: selected.title,
    description: selected.description,
    tag: selected.tag,
    songs: shuffled.slice(0, 20),
  };
}
