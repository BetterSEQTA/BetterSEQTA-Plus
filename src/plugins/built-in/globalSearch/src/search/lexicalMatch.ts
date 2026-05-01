import type { IndexItem } from "../indexing/types";

/**
 * Maximum bonus a strong lexical title match can contribute on top of the
 * underlying Fuse / hybrid score. Tuned to outweigh small vector reranking
 * deltas so a true assessment-title match cannot be displaced by a vector
 * neighbour as the user types one more character.
 */
export const LEXICAL_TITLE_BONUS = 12;

/**
 * Threshold at or above which a result counts as a "strong lexical match".
 * Strong matches must always be surfaced and protected from vector reranking
 * displacing them.
 */
export const STRONG_LEXICAL_THRESHOLD = 6;

const WORD_SPLIT_RE = /\s+/;
const NON_WORD_RE = /[^a-z0-9]+/gi;

function normalize(value: string | undefined | null): string {
  if (!value) return "";
  return String(value).toLowerCase().trim();
}

function tokens(value: string): string[] {
  return normalize(value)
    .split(WORD_SPLIT_RE)
    .map((t) => t.replace(NON_WORD_RE, ""))
    .filter(Boolean);
}

/**
 * Score how strongly the query lexically matches the title-like fields of an
 * IndexItem. Return value is a non-negative number — 0 means no useful match.
 *
 * Tiers (roughly):
 *   ~12  exact title equality
 *   ~10  title starts with full query string
 *   ~8   title contains full query string, on a word boundary
 *   ~7   ordered token-prefix match (e.g. `world w` vs `World War 2 Essay`)
 *   ~5   subject / metadata title contains query
 *   ~3   any token in title starts with query
 *   ~2   substring anywhere in title
 *   0    no lexical signal
 *
 * The function is intentionally cheap (string ops only, no regex compilation
 * per call beyond the constants above) because it is called for every item in
 * the candidate pool.
 */
export function getLexicalMatchQuality(item: IndexItem, query: string): number {
  const q = normalize(query);
  if (!q) return 0;

  const title = normalize(item.text);
  if (!title) return 0;

  if (title === q) return 12;
  if (title.startsWith(q + " ") || title.startsWith(q)) return 10;

  const queryTokens = tokens(q);
  const titleTokens = tokens(title);

  if (queryTokens.length > 0 && titleTokens.length >= queryTokens.length) {
    let bestStreakStart = -1;
    for (let i = 0; i <= titleTokens.length - queryTokens.length; i++) {
      let ok = true;
      for (let j = 0; j < queryTokens.length; j++) {
        const tt = titleTokens[i + j];
        const qt = queryTokens[j];
        const isLast = j === queryTokens.length - 1;
        if (isLast) {
          if (!tt.startsWith(qt)) {
            ok = false;
            break;
          }
        } else {
          if (tt !== qt) {
            ok = false;
            break;
          }
        }
      }
      if (ok) {
        bestStreakStart = i;
        break;
      }
    }
    if (bestStreakStart === 0) return 9;
    if (bestStreakStart > 0) return 7;
  }

  if (title.includes(" " + q) || title.includes(q + " ")) return 8;

  // Token starts-with anywhere
  for (const t of titleTokens) {
    if (t.startsWith(q)) return 3;
  }

  // Subject / curated metadata title
  const md = (item.metadata ?? {}) as Record<string, unknown>;
  const subjectName = normalize(
    typeof md.subjectName === "string" ? md.subjectName : "",
  );
  const subjectCode = normalize(
    typeof md.subjectCode === "string" ? md.subjectCode : "",
  );
  if (subjectName && (subjectName === q || subjectName.startsWith(q))) return 5;
  if (subjectCode && (subjectCode === q || subjectCode.startsWith(q))) return 5;

  if (title.includes(q)) return 2;

  return 0;
}

export function isStrongLexicalMatch(item: IndexItem, query: string): boolean {
  return getLexicalMatchQuality(item, query) >= STRONG_LEXICAL_THRESHOLD;
}
