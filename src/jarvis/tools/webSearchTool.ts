/**
 * src/jarvis/tools/webSearchTool.ts
 *
 * Fast zero-key web search & knowledge lookup using Wikipedia & DuckDuckGo Instant Answer APIs.
 * Returns concise, spoken-friendly knowledge summaries.
 */

export async function searchWebKnowledge(query: string): Promise<string> {
  const clean = query.trim();
  if (!clean) return "What would you like me to look up, sir?";

  // Strip leading question verbs for crisp knowledge search
  const cleanTopic = clean
    .replace(/^(?:explain|tell\s+me\s+about|what\s+is|what\s+are|who\s+is|who\s+was|search\s+for|look\s+up|google\s+for)\s+/i, '')
    .replace(/\s+(?:kya\s+hai|kaun\s+hai|ke\s+baare\s+me\s+batao|explain\s+karo)$/i, '')
    .trim() || clean;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    // 1. Try DuckDuckGo Instant Answer API
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanTopic)}&format=json&no_html=1&skip_disambig=1`;
    const ddgRes = await fetch(ddgUrl, { signal: controller.signal });
    if (ddgRes.ok) {
      const ddgData = await ddgRes.json();
      if (ddgData.AbstractText && ddgData.AbstractText.trim().length > 0) {
        clearTimeout(timer);
        return truncateToTwoSentences(ddgData.AbstractText);
      }
    }

    // 2. Try Wikipedia direct summary
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTopic)}`;
    const wikiRes = await fetch(wikiUrl, { signal: controller.signal });
    if (wikiRes.ok) {
      const wikiData = await wikiRes.json();
      if (
        wikiData.extract &&
        wikiData.type !== 'disambiguation' &&
        !wikiData.extract.toLowerCase().includes('may refer to:')
      ) {
        clearTimeout(timer);
        return truncateToTwoSentences(wikiData.extract);
      }
    }

    // 3. Fallback: Search Wikipedia API with smart disambiguation / music & film awareness
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanTopic)}&srlimit=10&format=json&utf8=1`;
    const searchRes = await fetch(searchUrl, { signal: controller.signal });
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const hits: Array<{ title: string; snippet: string }> = searchData?.query?.search || [];

      // Prioritize media/music/film if available, otherwise first non-disambiguation
      const mediaMatch = hits.find(
        (h) =>
          h.title.toLowerCase().includes('film') ||
          h.title.toLowerCase().includes('song') ||
          h.title.toLowerCase().includes('album') ||
          h.snippet.toLowerCase().includes('film') ||
          h.snippet.toLowerCase().includes('song')
      );

      const bestMatch = mediaMatch || hits.find(
        (h) =>
          !h.snippet.toLowerCase().includes('may refer to') &&
          !h.snippet.toLowerCase().includes('disambiguation')
      ) || hits[0];

      if (bestMatch) {
        const matchRes = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestMatch.title)}`,
          { signal: controller.signal }
        );
        if (matchRes.ok) {
          const matchData = await matchRes.json();
          if (matchData.extract && !matchData.extract.toLowerCase().includes('may refer to:')) {
            clearTimeout(timer);
            return truncateToTwoSentences(matchData.extract);
          }
        }
      }
    }

    clearTimeout(timer);
    return `I searched for ${cleanTopic}, but could not find a definitive summary.`;
  } catch (err: any) {
    clearTimeout(timer);
    return `Unable to complete web search at this time, sir.`;
  }
}

function truncateToTwoSentences(text: string): string {
  // Strip bracketed citations like [1], [note 1]
  const cleanText = text.replace(/\[\d+\]|\[note\s+\d+\]/gi, '').trim();
  const sentences = cleanText.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 2) {
    return sentences.slice(0, 2).join(' ').trim();
  }
  return cleanText;
}
