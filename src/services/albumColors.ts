import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import jpeg from 'jpeg-js';

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

// Fallback lavender theme color
export const DEFAULT_DOMINANT_COLOR: RGBColor = { r: 184, g: 166, b: 230 };

// In-memory cache to prevent re-extracting artwork colors
const colorCache = new Map<string, RGBColor>();

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_LOOKUP = new Uint8Array(256);
for (let i = 0; i < B64_CHARS.length; i++) {
  B64_LOOKUP[B64_CHARS.charCodeAt(i)] = i;
}

function base64ToUint8Array(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = clean.length;
  const placeHolders = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const byteLength = (len * 3) / 4 - placeHolders;
  const bytes = new Uint8Array(byteLength);

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const a = B64_LOOKUP[clean.charCodeAt(i)];
    const b = B64_LOOKUP[clean.charCodeAt(i + 1)];
    const c = B64_LOOKUP[clean.charCodeAt(i + 2)];
    const d = B64_LOOKUP[clean.charCodeAt(i + 3)];

    bytes[p++] = (a << 2) | (b >> 4);
    if (p < byteLength) bytes[p++] = ((b & 15) << 4) | (c >> 2);
    if (p < byteLength) bytes[p++] = ((c & 3) << 6) | (d & 63);
  }
  return bytes;
}

/**
 * Extracts a dominant, vibrant color from an album artwork URL.
 * Resizes the image to 24x24 JPEG via expo-image-manipulator,
 * decodes with jpeg-js, and quantizes pixels by saturation and vibrancy.
 */
export async function extractDominantColor(imageUrl: string | null | undefined): Promise<RGBColor> {
  if (!imageUrl) return DEFAULT_DOMINANT_COLOR;

  const cached = colorCache.get(imageUrl);
  if (cached) return cached;

  try {
    const manipResult = await manipulateAsync(
      imageUrl,
      [{ resize: { width: 24, height: 24 } }],
      { format: SaveFormat.JPEG, base64: true }
    );

    if (!manipResult.base64) {
      colorCache.set(imageUrl, DEFAULT_DOMINANT_COLOR);
      return DEFAULT_DOMINANT_COLOR;
    }

    const bytes = base64ToUint8Array(manipResult.base64);
    const decoded = jpeg.decode(bytes, { useTArray: true });
    const data = decoded.data;

    // Bucket pixels into hue categories (0-11)
    const buckets: { rSum: number; gSum: number; bSum: number; score: number; count: number }[] =
      Array.from({ length: 12 }, () => ({
        rSum: 0,
        gSum: 0,
        bSum: 0,
        score: 0,
        count: 0,
      }));

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const delta = max - min;
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;

      // Filter out pure black, extremely dark, and pure white
      if (brightness < 35 || brightness > 230) continue;

      const saturation = max === 0 ? 0 : delta / max;
      if (saturation < 0.15) continue; // Skip near-greys

      // Compute hue (0 - 360)
      let hue = 0;
      if (delta !== 0) {
        if (max === r) {
          hue = ((g - b) / delta) % 6;
        } else if (max === g) {
          hue = (b - r) / delta + 2;
        } else {
          hue = (r - g) / delta + 4;
        }
        hue = Math.round(hue * 60);
        if (hue < 0) hue += 360;
      }

      const bucketIndex = Math.min(11, Math.floor(hue / 30));
      // Give higher weight to vibrant, saturated, medium-bright colors
      const weight = saturation * 1.5 + (1 - Math.abs(brightness - 130) / 130);

      const bucket = buckets[bucketIndex];
      bucket.rSum += r * weight;
      bucket.gSum += g * weight;
      bucket.bSum += b * weight;
      bucket.score += weight;
      bucket.count += 1;
    }

    // Find bucket with highest score
    let bestBucket = buckets[0];
    for (const bucket of buckets) {
      if (bucket.score > bestBucket.score) {
        bestBucket = bucket;
      }
    }

    let dominant: RGBColor;
    if (bestBucket.score > 0 && bestBucket.count > 0) {
      dominant = {
        r: Math.round(bestBucket.rSum / bestBucket.score),
        g: Math.round(bestBucket.gSum / bestBucket.score),
        b: Math.round(bestBucket.bSum / bestBucket.score),
      };
    } else {
      dominant = DEFAULT_DOMINANT_COLOR;
    }

    colorCache.set(imageUrl, dominant);
    return dominant;
  } catch (error) {
    console.warn('[albumColors] Extraction failed, using fallback:', error);
    colorCache.set(imageUrl, DEFAULT_DOMINANT_COLOR);
    return DEFAULT_DOMINANT_COLOR;
  }
}
