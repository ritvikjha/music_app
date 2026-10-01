/**
 * src/jarvis/actions/songResolver.ts
 *
 * Scores JioSaavn search results against spoken queries to find the best song match.
 * Handles ASR misspellings, colloquial speech, and artist-title combinations.
 *
 * Returns { song, confidence, spokenReply, allResults }
 * If confidence is low (< 0.75), still returns the top result but makes the spokenReply
 * say exactly what is playing ("Playing Kesariya by Arijit Singh") so user gets immediate clarity.
 */

import { searchSongs, getArtistSongs } from '../../services/saavn';
import type { Song } from '../../types';
import { REPLIES, pickVariant } from '../brain/replies';

export interface ResolveSongResult {
  song: Song | null;
  confidence: number;
  spokenReply: string;
  allResults: Song[];
  isAmbiguous?: boolean;
  ambiguousCandidates?: [Song, Song];
}

/**
 * Clean title for fuzzy comparison: removes metadata in parentheses/brackets,
 * extra spaces, and common suffixes.
 */
function cleanSongTitle(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s*\(from\s+[^)]+\)/gi, '')
    .replace(/\s*\(original\s+motion\s+picture\s+soundtrack\)/gi, '')
    .replace(/\s*\[[^\]]+\]/gi, '')
    .replace(/\s*\([^)]*(?:remix|version|mix|feat|ft|audio|video)[^)]*\)/gi, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Standard Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) row[j] = j;

  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      let val: number;
      if (a[i - 1] === b[j - 1]) {
        val = row[j - 1];
      } else {
        val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
      }
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

/**
 * Similarity ratio between 0.0 and 1.0 using Levenshtein distance.
 */
function stringSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(s1, s2);
  return Math.max(0, 1.0 - dist / maxLen);
}

/**
 * Jaccard token overlap between two strings.
 */
function tokenOverlap(s1: string, s2: string): number {
  const tokens1 = new Set(s1.split(' ').filter(Boolean));
  const tokens2 = new Set(s2.split(' ').filter(Boolean));
  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  let intersection = 0;
  for (const t of tokens1) {
    if (tokens2.has(t)) intersection++;
  }
  const union = new Set([...tokens1, ...tokens2]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Score how well a candidate song matches the user's spoken query and artist preference.
 */
function scoreCandidate(song: Song, queryClean: string, requestedArtistClean?: string): number {
  const songTitleClean = cleanSongTitle(song.title);
  const songArtistClean = cleanSongTitle(song.artist);

  // Exact title match
  if (songTitleClean === queryClean) {
    return 1.0;
  }

  // Exact substring containment
  let subScore = 0;
  if (songTitleClean.includes(queryClean) || queryClean.includes(songTitleClean)) {
    subScore = 0.85;
  }

  // Levenshtein similarity on title
  const levScore = stringSimilarity(songTitleClean, queryClean);

  // Token overlap on title
  const overlapTitle = tokenOverlap(songTitleClean, queryClean);

  // Check if query matched "title artist"
  const fullMeta = `${songTitleClean} ${songArtistClean}`;
  const levFull = stringSimilarity(fullMeta, queryClean);
  const overlapFull = tokenOverlap(fullMeta, queryClean);

  let bestTitleScore = Math.max(levScore, subScore, overlapTitle * 0.9, levFull * 0.95, overlapFull * 0.9);

  // Artist bonus
  if (requestedArtistClean) {
    const artistMatch = stringSimilarity(songArtistClean, requestedArtistClean);
    if (artistMatch > 0.7 || songArtistClean.includes(requestedArtistClean)) {
      bestTitleScore = Math.min(1.0, bestTitleScore + 0.15);
    } else {
      bestTitleScore = Math.max(0.2, bestTitleScore - 0.2);
    }
  }

  return Math.min(1.0, bestTitleScore);
}

/**
 * Search JioSaavn and pick the best match for the spoken query.
 */
export async function resolveSong(
  query: string,
  requestedArtist?: string
): Promise<ResolveSongResult> {
  const cleanQ = cleanSongTitle(query);
  const cleanArtist = requestedArtist ? cleanSongTitle(requestedArtist) : undefined;

  if (!cleanQ && !cleanArtist) {
    return {
      song: null,
      confidence: 0,
      spokenReply: "I couldn't hear what song you'd like to play.",
      allResults: [],
    };
  }

  const searchQuery = cleanArtist && !cleanQ.includes(cleanArtist)
    ? `${cleanQ} ${cleanArtist}`
    : cleanQ;

  let results: Song[] = [];
  try {
    results = await searchSongs(searchQuery);
  } catch (err) {
    console.warn('[SongResolver] searchSongs failed:', err);
  }

  // Fallback to searching just artist if nothing found
  if (results.length === 0 && requestedArtist) {
    try {
      results = await getArtistSongs(requestedArtist);
    } catch (err) {
      console.warn('[SongResolver] getArtistSongs fallback failed:', err);
    }
  }

  if (results.length === 0) {
    return {
      song: null,
      confidence: 0,
      spokenReply: `Couldn't find "${query}".`,
      allResults: [],
    };
  }

  // Score each result and sort
  const scoredCandidates: { candidate: Song; score: number }[] = [];

  for (let i = 0; i < Math.min(results.length, 10); i++) {
    const candidate = results[i];
    const score = scoreCandidate(candidate, cleanQ, cleanArtist);
    // Slight bias for higher ranked search results
    const positionPenalty = i * 0.02;
    const finalScore = Math.max(0, score - positionPenalty);
    scoredCandidates.push({ candidate, score: finalScore });
  }

  scoredCandidates.sort((a, b) => b.score - a.score);

  const bestSong = scoredCandidates[0].candidate;
  const bestScore = scoredCandidates[0].score;
  const roundedConf = Math.round(bestScore * 100) / 100;

  // Check for ambiguous match (close scores between two distinct songs)
  if (
    scoredCandidates.length >= 2 &&
    bestScore < 0.88 &&
    scoredCandidates[1].score >= 0.55 &&
    Math.abs(bestScore - scoredCandidates[1].score) <= 0.15
  ) {
    const songA = bestSong;
    const songB = scoredCandidates[1].candidate;
    if (cleanSongTitle(songA.title) !== cleanSongTitle(songB.title)) {
      return {
        song: songA,
        confidence: roundedConf,
        spokenReply: REPLIES.AMBIGUOUS_SONG_PROMPT(songA.title, songB.title),
        allResults: results,
        isAmbiguous: true,
        ambiguousCandidates: [songA, songB],
      };
    }
  }

  // Pick natural spoken reply from REPLIES (<12 words, 3 variants)
  const spokenReply = pickVariant(REPLIES.PLAY_SONG)(
    bestSong.title,
    roundedConf < 0.85 ? bestSong.artist : undefined
  );

  return {
    song: bestSong,
    confidence: Math.max(0.5, roundedConf),
    spokenReply,
    allResults: results,
  };
}
