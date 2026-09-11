/**
 * Comparison keys for domain vocabulary.
 *
 * The engine compares names constantly — actors, work objects, read models, events.
 * The old rule was `toLowerCase().replace(/[^a-z0-9]+/g, "")`, which maps every CJK
 * string to "". Since `"anything".includes("")` is true, that made any two Chinese
 * actor names "match" and turned several sensors into silent passes. Silent passes are
 * worse than failures: nobody goes looking for them.
 *
 * So: fold case in a Unicode-aware way, strip only punctuation and separators, and
 * return null rather than an empty string. A null key is not a wildcard — callers must
 * report n/a instead of guessing.
 */
export function normalizeKey(raw: string | undefined | null): string | null {
  if (raw == null) return null;
  const folded = raw
    .normalize("NFKC")
    .toLocaleLowerCase()
    // Punctuation, separators and symbols carry no identity: "Low-Stock Alert",
    // "low_stock_alert" and "低庫存 警示" all reduce to the same key.
    .replace(/[\p{P}\p{Z}\p{C}\p{S}]+/gu, "");
  return folded.length > 0 ? folded : null;
}

/**
 * Do two names refer to the same thing?
 *
 * Substring containment is deliberate — "Counter Staff (Cashier)" and "Counter Staff"
 * are one actor — but it is only ever applied to non-empty keys, and a key must be at
 * least two characters before containment is allowed, so a single CJK character does
 * not swallow every name that contains it.
 */
export function namesMatch(a: string | undefined, b: string | undefined): boolean {
  const x = normalizeKey(stripParenthetical(a));
  const y = normalizeKey(stripParenthetical(b));
  if (x === null || y === null) return false;
  if (x === y) return true;
  const shorter = x.length <= y.length ? x : y;
  const longer = shorter === x ? y : x;
  return shorter.length >= 2 && longer.includes(shorter);
}

/** "Counter Staff (Cashier)" → "Counter Staff". */
export function stripParenthetical(s: string | undefined): string | undefined {
  return s?.replace(/[(（][^)）]*[)）]/g, "").trim();
}

/** Does `haystack` contain `needle` as a name? Null-safe, never wildcard. */
export function nameAppearsIn(haystack: string | undefined, needle: string | undefined): boolean {
  const h = normalizeKey(haystack);
  const n = normalizeKey(needle);
  if (h === null || n === null) return false;
  return h.includes(n);
}

/**
 * Split a camelCase or PascalCase identifier into lowercase words.
 * `CompleteCoffeePreparation` → ["complete", "coffee", "preparation"].
 * Returns [] for a name with no Latin letters, so callers can report n/a.
 */
export function splitIdentifier(name: string): string[] {
  if (!/[A-Za-z]/.test(name)) return [];
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}
