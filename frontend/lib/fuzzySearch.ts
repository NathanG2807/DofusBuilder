export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = new Array<number>(b.length + 1);

  for (let i = 0; i < a.length; i++) {
    curr[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      curr[j + 1] = Math.min(
        curr[j]! + 1,
        prev[j + 1]! + 1,
        prev[j]! + cost,
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j]!;
  }

  return prev[b.length]!;
}

function subsequenceScore(needle: string, haystack: string): number {
  if (!needle.length || !haystack.length) return 0;

  let matched = 0;
  let hi = 0;
  let maxRun = 0;
  let run = 0;

  for (const ch of needle) {
    while (hi < haystack.length && haystack[hi] !== ch) hi++;
    if (hi >= haystack.length) return 0;
    matched++;
    run++;
    maxRun = Math.max(maxRun, run);
    hi++;
  }

  const coverage = matched / haystack.length;
  const compactness = maxRun / needle.length;
  return coverage * 0.45 + compactness * 0.55;
}

function singleTokenScore(query: string, target: string): number {
  if (!query || !target) return 0;
  if (target === query) return 1;
  if (target.startsWith(query)) return 0.95;
  if (target.includes(query)) return 0.85;

  const sub = subsequenceScore(query, target);
  if (sub >= 0.35) return 0.55 + sub * 0.35;

  const maxLen = Math.max(query.length, target.length);
  const ratio = 1 - levenshtein(query, target) / maxLen;
  if (ratio >= 0.72) return ratio * 0.7;

  return 0;
}

/** Score ∈ [0, 1] — plus le score est élevé, plus la correspondance est pertinente. */
export function fuzzyMatchScore(query: string, target: string): number {
  const q = normalizeSearchText(query);
  const t = normalizeSearchText(target);
  if (!q || !t) return 0;

  const direct = singleTokenScore(q, t);
  if (direct > 0) return direct;

  const qWords = q.split(/\s+/).filter(Boolean);
  if (qWords.length > 1) {
    const tWords = t.split(/\s+/).filter(Boolean);
    let total = 0;
    for (const word of qWords) {
      const best = Math.max(
        ...tWords.map((tw) => singleTokenScore(word, tw)),
        singleTokenScore(word, t),
      );
      if (best < 0.4) return 0;
      total += best;
    }
    return (total / qWords.length) * 0.92;
  }

  const tWords = t.split(/\s+/).filter(Boolean);
  if (!tWords.length) return 0;
  return Math.max(...tWords.map((word) => singleTokenScore(q, word)), 0);
}

export const FUZZY_MIN_SCORE = 0.42;
