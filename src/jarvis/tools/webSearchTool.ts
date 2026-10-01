/**
 * src/jarvis/tools/webSearchTool.ts
 *
 * Fast zero-key web search & knowledge lookup using Wikipedia & DuckDuckGo Instant Answer APIs.
 * Returns concise, spoken-friendly knowledge summaries.
 */

export async function searchWebKnowledge(query: string): Promise<string> {
  const clean = query.trim();
  if (!clean) return "What would you like me to look up, sir?";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    // 1. Try DuckDuckGo Instant Answer API
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(clean)}&format=json&no_html=1&skip_disambig=1`;
    const ddgRes = await fetch(ddgUrl, { signal: controller.signal });
    if (ddgRes.ok) {
      const ddgData = await ddgRes.json();
      if (ddgData.AbstractText && ddgData.AbstractText.trim().length > 0) {
        clearTimeout(timer);
        return truncateToTwoSentences(ddgData.AbstractText);
      }
    }

    // 2. Fallback to Wikipedia Summary API
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(clean)}`;
    const wikiRes = await fetch(wikiUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (wikiRes.ok) {
      const wikiData = await wikiRes.json();
      if (wikiData.extract) {
        return truncateToTwoSentences(wikiData.extract);
      }
    }

    return `I searched for ${clean}, but could not find a definitive summary.`;
  } catch (err: any) {
    clearTimeout(timer);
    return `Unable to complete web search at this time, sir.`;
  }
}

function truncateToTwoSentences(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 2) {
    return sentences.slice(0, 2).join(' ').trim();
  }
  return text.trim();
}
