const FILLER_PREFIXES = ['to ', 'a ', 'an ', 'the '];

export function normalizeAnswer(s: string): string {
  let out = s.trim().toLowerCase().replace(/[.,!?;:"']/g, '').replace(/\s+/g, ' ');
  for (const prefix of FILLER_PREFIXES) {
    if (out.startsWith(prefix)) out = out.slice(prefix.length);
  }
  return out.trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export function similarity(a: string, b: string): number {
  const na = normalizeAnswer(a);
  const nb = normalizeAnswer(b);
  if (!na && !nb) return 1;
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length, 1);
  return 1 - dist / maxLen;
}

export function isCloseEnough(answer: string, expected: string, threshold = 0.8): boolean {
  return similarity(answer, expected) >= threshold;
}
