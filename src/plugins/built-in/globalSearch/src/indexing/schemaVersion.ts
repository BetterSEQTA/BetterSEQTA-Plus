/**
 * Index schema version. Bump whenever the IndexItem shape, category set,
 * or text construction changes in a way that should invalidate previously
 * stored items (and their embeddings).
 *
 * On mismatch, both the structured IndexedDB store and the embeddiaDB are
 * wiped before the next indexing pass so we don't serve stale results.
 *
 * Kept in its own file (with no imports) so very lightweight callers — the
 * always-loaded plugin shell in `lazy.ts`, the version-check path — can
 * pull it in without bringing the heavy indexer/worker bundle along.
 */
export const INDEX_SCHEMA_VERSION = 6;

/** Key used to track the schema version a previous run wrote out. */
export const SCHEMA_VERSION_KEY = "bsq-index-schema-version";
