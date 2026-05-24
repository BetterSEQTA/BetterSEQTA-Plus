# BetterSEQTA Cloud — settings sync (server specification)

This document describes the HTTP API the BetterSEQTA+ extension expects for **cloud backup of extension settings**. The client is implemented in the extension repo; the accounts service (`accounts.betterseqta.org`) must implement these endpoints.

## Purpose

- Store **one JSON document per authenticated BetterSEQTA Cloud user** representing a snapshot of the extension’s `chrome.storage.local` data (theme, layout, plugin settings, `plugin.*` keys, etc.).
- The extension **does not upload OAuth tokens** (`bsplus_token`, `bsplus_refresh_token`, `bsplus_client_id`, `bsplus_user`). Those remain only on the client.
- **Download** replaces local storage with the stored snapshot, then the client reapplies the current device’s session tokens so the user stays signed in.

## Base URL

All routes below are relative to:

`https://accounts.betterseqta.org`

## Authentication

Every request must include:

```http
Authorization: Bearer <access_token>
```

Use the same **access tokens** issued by the existing BetterSEQTA+ OAuth flows (`/api/bsplus/login`, `/api/bsplus/refresh`). Resolve the user from the token; the document is scoped to that user.

## Endpoints

### `PUT /api/bsplus/settings/sync`

Upserts the caller’s settings backup.

**Request body (JSON):**

```json
{
  "schemaVersion": 1,
  "themeId": "uuid-string-or-empty",
  "data": {
    "...": "flat key-value map mirroring extension storage (see Payload shape)",
    "selectedTheme": "uuid-or-empty-string"
  }
}
```

- **`schemaVersion`**: integer. The extension currently sends `1`. The server may reject unknown major versions or store it for future migrations.
- **`themeId`**: optional but recommended duplicate of **`data.selectedTheme`**. Should be the UUID of the **installed** BetterSEQTA store theme (`selectedTheme`). This may be a normal theme id **or** a **flavour (slave) variant** id from themes with **`flavours[]`** — the extension uses it after restore to prefetch `theme.json` when missing locally (same **`GET …/themes/{id}/download`** as the store UI). Persist and return **`themeId`** in sync with **`data.selectedTheme`**.
- **`data`**: object whose keys are storage keys (strings) and values are JSON-serializable values (same types as stored in `chrome.storage.local`).

**Success response:** HTTP `200` (or `201` if you prefer create semantics). Example:

```json
{
  "updated_at": "2026-04-07T12:00:00.000Z"
}
```

`updated_at` should be an ISO 8601 timestamp of the save time. The extension displays success without requiring extra fields.

**Error responses:** Standard JSON error body if applicable, e.g. `{ "error": "message" }`, with appropriate HTTP status (`401`, `413`, `422`, etc.).

---

### `GET /api/bsplus/settings/sync`

Returns the caller’s latest settings backup.

**Success response:** HTTP `200` with body:

```json
{
  "schemaVersion": 1,
  "themeId": "uuid-string-or-empty",
  "data": { },
  "updated_at": "2026-04-07T12:00:00.000Z"
}
```

- **`data`**: required for restore; must be the same shape as accepted in `PUT` (flat map of storage keys).
- **`themeId`**: optional; if present must match **`data.selectedTheme`** (see `PUT`).
- **`schemaVersion`**: optional but recommended; should match what was stored.
- **`updated_at`**: optional; included for UX if the client shows “last backup” time.

The extension resolves **`themeId`** (if non-empty), else **`data.selectedTheme`,** to [`resolveThemeIdForPostSyncDownload`](../src/seqta/utils/cloudSettingsSync.ts) after downloading the envelope — used only to reinstall theme assets from **`betterseqta.org`** when IndexedDB lacks that id (see **BetterSEQTA Cloud** flavour note in **[THEME_STORE_FLAVOURS_API](./THEME_STORE_FLAVOURS_API.md)** section “Cloud settings sync compatibility”).

**No backup yet:** HTTP **`404`**. The extension treats this as “nothing in the cloud” and shows an error to the user.

**Error responses:** `401` if the token is invalid, etc.

---

## Suggested database shape

Example relational layout:

| Column        | Type        | Notes |
|---------------|-------------|--------|
| `user_id`     | FK → users  | Unique per backup row (one row per user). |
| `payload`     | JSON / JSONB| Store `{ "schemaVersion", "data" }` or only `data` + separate `schema_version` column. |
| `updated_at`  | timestamptz | Set on each successful `PUT`. |

Unique constraint on `user_id`.

## Semantics

- **Last write wins:** each `PUT` replaces the stored backup for that user.
- **Optional later:** `If-Unmodified-Since` or a `revision` field for conflict detection (not required for v1).

## Security and privacy

- **Encryption at rest** for `payload` is recommended.
- Payload may contain **school-related UI preferences** and plugin data; treat as **user data** under your privacy policy.
- **Do not require or store** refresh/access tokens in the payload; the extension already strips them on upload.

### Never included in the sync payload (`chrome.storage.local` only)

The backup is a flat JSON map of **`chrome.storage.local`** keys. It does **not** include:

- **IndexedDB** — e.g. the Global Search index (`betterseqta-index` and related DBs) lives outside extension storage and is never serialized here.
- **OAuth / session keys** — `bsplus_token`, `bsplus_refresh_token`, `bsplus_client_id`, `bsplus_user`, plus legacy `cloudAccessToken` / `cloudUsername`.
- **Assessment Averages caches** — `plugin.assessments-average.storage.assessments`, `plugin.assessments-average.storage.weightings` (school assessment data).
- **Keys under** `plugin.global-search.storage.*` — reserved so any future plugin storage cache there is not synced.
- **`bsplus_cloud_settings_known_remote_updated_at`** — client-only watermark for auto-sync (not part of the cloud backup blob).

On restore, those keys are **not** taken from the server; the device keeps its current local values.

## Related endpoint: `GET /api/user/cloud-summary`

The extension may call **`GET /api/user/cloud-summary`** (same host, `Authorization: Bearer`) for a **small** JSON summary (e.g. whether DesQTA / BetterSEQTA+ cloud settings exist and **`bsplus.updated_at`** / **`schemaVersion`**). It does **not** return the large settings `data` blob.

- **Auto-sync flow:** compare `bsplus.updated_at` to a **client-only** watermark stored in extension storage as **`bsplus_cloud_settings_known_remote_updated_at`** (never uploaded, never applied from the server payload; preserved on restore).
- If the server timestamp is newer (and `schemaVersion` is not ahead of the client), the client then calls **`GET /api/bsplus/settings/sync`** and applies the full envelope as usual.

This uses standard **WebExtension** APIs (`browser.alarms`, `runtime` messages, `storage`) and works on **Chromium and Firefox** builds (see `webextension-polyfill`).

## Client reference (extension)

- Upload / dev export: `buildUploadPayload` / `getSnapshotForUpload` in `src/seqta/utils/cloudSettingsSync.ts` (strips OAuth-related keys, sensitive device keys, **`bsplus_pending_theme_ensure_after_cloud`**, and **`bsplus_cloud_settings_known_remote_updated_at`** — includes **`themeId`** aligned with **`selectedTheme`**).
- Download: resolve id via **`resolveThemeIdForPostSyncDownload`** → **`applyDownloadedEnvelope`** after `GET` → prefetch theme blobs in page context if needed (**`prepareThemeAfterCloudSync`** in **`ThemeManager`**) → reload SEQTA tabs; local auth keys, sensitive device keys, client-only watermark, and **`bsplus_pending_theme_ensure_after_cloud`** semantics preserved as documented above.
- Auto sync (summary, debounced upload, alarms): `src/background/cloudSettingsAutoSync.ts`; content script triggers a poll on each verified SEQTA Learn/Engage page load (top frame) via `cloudSettingsPoll`.
