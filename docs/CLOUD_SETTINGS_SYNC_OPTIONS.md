# Cloud settings sync — complete options & format reference

Exhaustive reference for every value that **is** or **would be** included in a BetterSEQTA Cloud settings backup, the exact JSON shapes stored in `chrome.storage.local`, and how those shapes appear on the wire.

**Related docs**

- Server HTTP contract: [CLOUD_SETTINGS_SYNC_SERVER.md](./CLOUD_SETTINGS_SYNC_SERVER.md)
- Client upload/download: `src/seqta/utils/cloudSettingsSync.ts`
- Auto-sync (debounce, poll, triggers): `src/background/cloudSettingsAutoSync.ts`
- Core defaults: `src/seqta/utils/defaultSettings.ts`
- Full-schema initializer: `src/seqta/utils/ensureSyncableStorageDefaults.ts`
- In-memory settings + persistence: `src/seqta/utils/listeners/SettingsState.ts`
- Type definitions: `src/types/storage.ts`

---

## Table of contents

1. [Architecture](#architecture)
2. [Sync lifecycle](#sync-lifecycle)
3. [Wire format (HTTP body)](#wire-format-http-body)
4. [Local storage model](#local-storage-model)
5. [Exclusion rules](#exclusion-rules)
6. [Legacy key migration](#legacy-key-migration)
7. [Core extension settings](#core-extension-settings)
8. [Plugin settings objects](#plugin-settings-objects)
9. [Plugin runtime storage keys](#plugin-runtime-storage-keys)
10. [Excluded caches (local-only schemas)](#excluded-caches-local-only-schemas)
11. [Data outside `chrome.storage.local`](#data-outside-chromestoragelocal)
12. [Catch-all & forward compatibility](#catch-all--forward-compatibility)
13. [UI accessibility](#ui-accessibility)
14. [Default schema initialization](#default-schema-initialization)

---

## Architecture

Cloud settings sync is a **whole-snapshot backup** of extension local storage:

```
┌─────────────────────────────────────────────────────────────────┐
│  chrome.storage.local  (flat string-keyed JSON values)          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Core keys   │  │ plugin.*     │  │ Excluded (see §5)      │ │
│  │ onoff,      │  │ .settings    │  │ OAuth, device caches,  │ │
│  │ DarkMode,   │  │ .storage.*   │  │ client watermarks      │ │
│  │ menuitems…  │  │              │  │                        │ │
│  └─────────────┘  └──────────────┘  └────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │ buildUploadPayload()
                             │  • filter exclusions
                             │  • migrateLegacyToPluginSettings()
                             ▼
              PUT /api/bsplus/settings/sync
              { schemaVersion, themeId, data: { … } }
                             │
                             ▼
              accounts.betterseqta.org (one row per user)
```

**Design principle:** inclusive by default. Any new key written to `chrome.storage.local` is uploaded unless explicitly added to an omit list in `cloudSettingsSync.ts`.

**Not included:** IndexedDB, `localStorage`, `sessionStorage`, or SEQTA page DOM state.

---

## Sync lifecycle

### When upload runs

| Trigger | Behaviour |
|---------|-----------|
| Any **included** `chrome.storage.local` key changes | Debounced upload after **2000 ms** (`UPLOAD_DEBOUNCE_MS`) |
| Manual upload (settings UI) | Immediate `PUT` |
| First poll with no cloud backup and no local watermark | Baseline upload |
| `requestCloudSettingsDebouncedUpload()` | Same debounced path (e.g. after theme install) |

Upload is skipped when:

- `autoCloudSettingsSync === false`
- No `bsplus_token` (not signed in)
- `suppressAutoUploadDuringRestore` is true (during download)

### When download runs

| Trigger | Behaviour |
|---------|-----------|
| Manual restore (settings UI) | `GET` → `applyDownloadedEnvelope` → theme prefetch → reload SEQTA tabs |
| Auto poll | If `bsplus.updated_at` from `GET /api/user/cloud-summary` is newer than local watermark |
| First poll with cloud backup but no watermark | Full download |

Download is skipped when server `schemaVersion` > client `CLOUD_SETTINGS_SYNC_SCHEMA_VERSION` (currently `1`).

### Poll throttle

- Key: `bsplus_lastCloudPoll` — **never uploaded**
- Value: `number` (Unix ms timestamp)
- Minimum interval between poll runs: **24 hours** (`POLL_THROTTLE_MS`)

### Restore semantics

`applyDownloadedEnvelope` calls `browser.storage.local.set(remoteSanitized)` with **only** keys from the server (after migration + strip). It does **not** wipe storage:

- **OAuth keys** remain because they are stripped from the remote blob and never overwritten.
- **Excluded device caches** remain for the same reason.
- **Client-only keys** (`bsplus_cloud_settings_known_remote_updated_at`, etc.) remain unless accidentally present in an old server payload (stripped defensively).
- Keys present locally but **absent** from an older cloud snapshot are **not deleted**.

After download, if `themeId` / `selectedTheme` is non-empty, the service worker sets `bsplus_pending_theme_ensure_after_cloud` so the page `ThemeManager` can download missing theme assets from the store.

### Full schema before upload

`ensureSyncableStorageDefaults()` (`src/seqta/utils/ensureSyncableStorageDefaults.ts`) ensures every **cloud-syncable** key exists in `chrome.storage.local` with its default value if it was previously absent. This makes uploads and dev JSON exports contain a complete schema (e.g. `customshortcuts: []`, `shortcuts: [...]`, every `plugin.{id}.settings` object) instead of omitting keys the user never touched.

| When it runs | Context |
|--------------|---------|
| `browser.runtime.onInstalled` | Service worker (install + update) |
| `browser.runtime.onStartup` | Service worker |
| Service worker load | `background.ts` (once at startup) |
| `initializeSettingsState()` | SEQTA content script + extension settings page (first init) |

Rules:

- Builds defaults from `getDefaultSettingsState()` plus each plugin’s `plugin.{id}.settings` defaults from `getAllPluginSettings()`.
- **Does not backfill legacy keys** (`animatedbk`, `bksliderinput`, etc.) — missing `plugin.*.settings` are derived from legacy via `migrateLegacyToPluginSettings(existing)` when patched.
- **Does not backfill optional keys** where `undefined` is intentional (`timeFormat`, `selectedFont`, dev/privacy/announcement flags, etc.) so existing behaviour is unchanged.
- Skips keys in the cloud omit lists (`isKeyIncludedInCloudUploadPayload`).
- **Never overwrites** existing storage values — only patches keys absent from storage (`key in existing` is false).
- Settings writes during bootstrap do not fire UI listeners (`SettingsState.bootstrapping`); user edits persist **only the changed key**, not the whole in-memory object.

---

## Wire format (HTTP body)

### `PUT /api/bsplus/settings/sync` request

```http
PUT /api/bsplus/settings/sync HTTP/1.1
Host: accounts.betterseqta.org
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "schemaVersion": 1,
  "themeId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "data": {
    "onoff": true,
    "DarkMode": true,
    "selectedTheme": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "selectedColor": "linear-gradient(40deg, rgba(201,61,0,1) 0%, RGBA(170, 5, 58, 1) 100%)",
    "plugin.global-search.settings": {
      "enabled": true,
      "searchHotkey": "ctrl+k",
      "showRecentFirst": true,
      "transparencyEffects": true,
      "runIndexingOnLoad": true,
      "passiveIndexing": true
    }
  }
}
```

| Top-level field | JSON type | Rules |
|-----------------|-----------|-------|
| `schemaVersion` | `number` | Always `1` today (`CLOUD_SETTINGS_SYNC_SCHEMA_VERSION`) |
| `themeId` | `string` | `normalizeThemeIdForSync(selectedTheme)` — trimmed; `""` if unset/invalid |
| `data` | `object` | Flat map: storage key → value. Same types as `chrome.storage.local`. No nesting convention beyond whatever each key stores. |

### `GET /api/bsplus/settings/sync` response

Same shape as the PUT body, plus optional:

```json
{
  "schemaVersion": 1,
  "themeId": "…",
  "data": { },
  "updated_at": "2026-04-07T12:00:00.000Z"
}
```

- `updated_at`: ISO 8601 UTC string; written to `bsplus_cloud_settings_known_remote_updated_at` locally (never re-uploaded).

### JSON encoding notes

- All values must be JSON-serializable (`boolean`, `number`, `string`, `null`, arrays, plain objects).
- `undefined` is never stored by the WebExtension storage API.
- Dates are stored as **strings** (ISO or calendar formats), not `Date` objects.
- `chrome.storage.local` may historically stringify some booleans in edge cases; the client treats them as booleans after read.

---

## Local storage model

### Flat key namespace

Every persisted setting is a **top-level key** in `chrome.storage.local`:

| Pattern | Example | Value shape |
|---------|---------|---------------|
| Core setting | `DarkMode` | scalar or structured JSON |
| Plugin settings | `plugin.global-search.settings` | single JSON **object** with all plugin prefs |
| Plugin storage | `plugin.messageFolders.storage.folders` | one JSON value per property |
| Analytics cache | `bsplus.analytics.v2.https://school.seqta.com.au.12345` | structured cache (excluded) |

Plugin settings use `plugin.{pluginId}.settings` where `pluginId` matches the plugin registration id (e.g. `messageFolders`, not `message-folders`).

Plugin runtime storage uses `plugin.{pluginId}.storage.{propertyName}` — each property is a **separate** storage key, not nested under one object.

### Settings vs storage

| Mechanism | API | Persisted keys | Synced? |
|-----------|-----|----------------|---------|
| `settingsState` / `SettingsState` | Proxy over in-memory + `storage.local` | Top-level keys (`onoff`, `menuitems`, …) | Yes (unless excluded) |
| Plugin `api.settings` | Proxy; one object per plugin | `plugin.{id}.settings` | Yes |
| Plugin `api.storage` | Proxy; one key per property | `plugin.{id}.storage.{prop}` | Yes, except excluded prefixes |

Component/button plugin settings (`type: "component"` | `"button"`) are **not** written by the settings proxy loop; only scalar settings defined in `plugin.settings` are persisted automatically. The settings UI may still write `enabled` and other keys via `browser.storage.local.set` directly.

---

## Exclusion rules

Implemented in `shouldOmitKeyFromCloudPayload(key)`:

### Exact key exclusions

| Key | Format if present locally | On restore |
|-----|---------------------------|------------|
| `bsplus_token` | `string` JWT | Keep device value |
| `bsplus_refresh_token` | `string` | Keep device value |
| `bsplus_client_id` | `string` UUID | Keep device value |
| `bsplus_user` | `CloudUser` object (see below) | Keep device value |
| `cloudAccessToken` | `string` (legacy) | Keep device value |
| `cloudUsername` | `string` (legacy) | Keep device value |
| `plugin.assessments-average.storage.assessments` | object | Keep device value |
| `plugin.assessments-average.storage.weightings` | object | Keep device value |
| `bsplus_cloud_settings_known_remote_updated_at` | ISO `string` | Keep device value |
| `bsplus_lastCloudPoll` | `number` (ms) | Keep device value |
| `bsplus_pending_theme_ensure_after_cloud` | `string` (theme id) | Keep device value |

#### `bsplus_user` shape (local only, never uploaded)

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "optional",
  "displayName": "optional",
  "pfpUrl": "https://…",
  "pfpHash": "abc123" ,
  "admin_level": 0
}
```

All fields except `id` are optional.

### Prefix exclusions

| Prefix | Matches |
|--------|---------|
| `plugin.global-search.storage.` | Any Global Search device cache key |
| `bsplus.analytics.` | Grade Analytics caches and chart mode prefs |

Prefix check: `key.startsWith(prefix)`.

---

## Legacy key migration

Runs in `migrateLegacyToPluginSettings()` on **both** upload and download. Legacy keys are **removed** from `data` after migration. Migration only fills plugin settings fields that are still `undefined`.

| Legacy key | Legacy format | Target key | Target field | Conversion |
|------------|---------------|------------|--------------|------------|
| `animatedbk` | `boolean` | `plugin.animated-background.settings` | `enabled` | `!!animatedbk` |
| `bksliderinput` | `string` `"0"`–`"100"` | `plugin.animated-background.settings` | `speed` | `speed = round((0.1 + (parseFloat(s) / 100) * 1.9) * 100) / 100` → range **0.1–2.0** |
| `assessmentsAverage` | `boolean` | `plugin.assessments-average.settings` | `enabled` | `!!assessmentsAverage` |
| `lettergrade` | `boolean` | `plugin.assessments-average.settings` | `lettergrade` | `!!lettergrade` |
| `notificationCollector` | `boolean` only | `plugin.notificationCollector.settings` | `enabled` | copy boolean |

**Example:** legacy `bksliderinput: "50"` → `speed: 1.05` because `0.1 + 0.5 * 1.9 = 1.05`.

Modern clients should only see plugin-format keys in uploaded payloads; legacy keys may still exist on very old profiles until first sync.

---

## Core extension settings

Top-level `chrome.storage.local` keys from `SettingsState` (`src/types/storage.ts`). Defaults from `getDefaultSettingsState()` in `src/seqta/utils/defaultSettings.ts` unless noted. Missing keys are backfilled by `ensureSyncableStorageDefaults()` (see [Default schema initialization](#default-schema-initialization)).

### Master & appearance

#### `onoff`

| | |
|-|-|
| **Type** | `boolean` |
| **Default** | `true` |
| **UI** | Settings → “BetterSEQTA+” master switch |
| **Example** | `true` |

#### `DarkMode`

| | |
|-|-|
| **Type** | `boolean` |
| **Default** | `true` |
| **UI** | SEQTA UI / theme system |
| **Example** | `true` |

#### `selectedTheme`

| | |
|-|-|
| **Type** | `string` |
| **Default** | `""` |
| **UI** | Theme selector / store install |
| **Format** | BetterSEQTA store theme UUID, **flavour (slave) variant** id, or empty string for no store theme |
| **Wire** | Duplicated as top-level `themeId` on upload (trimmed) |
| **Example** | `"f47ac10b-58cc-4372-a567-0e02b2c3d479"` or `""` |

Theme **asset blobs** (CSS, images) live in **localforage/IndexedDB**, not in this key. After restore, only the id is synced; assets are re-fetched if missing.

#### `selectedColor`

| | |
|-|-|
| **Type** | `string` |
| **Default** | `"linear-gradient(40deg, rgba(201,61,0,1) 0%, RGBA(170, 5, 58, 1) 100%)"` |
| **UI** | Colour picker |
| **Format** | Any valid CSS `background` value: hex (`#c93d00`), `rgb()`, `rgba()`, `linear-gradient(...)`, etc. |
| **Example** | `"#c93d00"` or `"linear-gradient(40deg, rgba(201,61,0,1) 0%, RGBA(170, 5, 58, 1) 100%)"` |

#### `originalSelectedColor`

| | |
|-|-|
| **Type** | `string` |
| **Default** | `""` |
| **Purpose** | Colour before theme preview; restored when clearing theme |
| **Example** | `"#c93d00"` |

#### `originalDarkMode`

| | |
|-|-|
| **Type** | `boolean` |
| **Default** | undefined until theme preview |
| **Purpose** | Dark mode before theme preview |
| **Example** | `true` |

#### `transparencyEffects`

| | |
|-|-|
| **Type** | `boolean` |
| **Default** | `false` |
| **UI** | Settings → Transparency Effects |
| **Example** | `false` |

#### `animations`

| | |
|-|-|
| **Type** | `boolean` |
| **Default** | `true` on normal devices; `false` if low-end (`hardwareConcurrency < 4` or `deviceMemory <= 2`) |
| **UI** | Settings → Animations |
| **Example** | `true` |

#### `iconOnlySidebar`

| | |
|-|-|
| **Type** | `boolean` |
| **Default** | `false` |
| **UI** | Settings → Icon Only Sidebar |
| **Example** | `false` |

#### `selectedFont`

| | |
|-|-|
| **Type** | `string` |
| **Default** | undefined → runtime treats as `"rubik"` |
| **UI** | Settings → Interface Font |
| **Format** | Font preset id from `src/seqta/ui/fonts/presets.ts` |

Allowed ids:

`rubik`, `inter`, `poppins`, `nunito`, `montserrat`, `open-sans`, `lato`, `source-sans-3`, `raleway`, `dm-sans`, `plus-jakarta-sans`, `outfit`, `roboto`, `work-sans`, `manrope`, `figtree`, `lexend`, `ubuntu`, `karla`, `quicksand`, `ibm-plex-sans`, `space-grotesk`, `mulish`, `cabin`, `oswald`, `merriweather`, `playfair-display`, `lora`, `crimson-pro`, `libre-baskerville`, `system`

**Example:** `"inter"`

#### `adaptiveThemeColour`

| | |
|-|-|
| **Type** | `boolean` |
| **Default** | `false` |
| **Example** | `false` |

#### `adaptiveThemeGradient`

| | |
|-|-|
| **Type** | `boolean` |
| **Default** | `false` |
| **Example** | `false` |

#### `adaptiveThemeColourTransition`

| | |
|-|-|
| **Type** | `boolean` |
| **Default** | `true` |
| **Example** | `true` |

### Navigation & layout

#### `defaultPage`

| | |
|-|-|
| **Type** | `string` |
| **Default** | `"home"` |
| **UI** | Settings → Default Page |
| **Allowed** | `"home"`, `"dashboard"`, `"timetable"`, `"welcome"`, `"messages"`, `"documents"`, `"reports"` |
| **Example** | `"home"` |

#### `timeFormat`

| | |
|-|-|
| **Type** | `string` |
| **Default** | undefined (24-hour behaviour) |
| **UI** | Settings → “12 Hour Time” switch |
| **Values** | `"12"` when enabled; `"24"` when disabled |
| **Example** | `"12"` |

#### `lessonalert`

| | |
|-|-|
| **Type** | `boolean` |
| **Default** | `true` |
| **Purpose** | Lesson alert on home page |
| **Example** | `true` |

#### `menuitems`

| | |
|-|-|
| **Type** | `object` |
| **Default** | All sidebar items `{ toggle: true }` |
| **UI** | Menu editor overlay |
| **Shape** | `{ [menuKey]: { toggle: boolean } }` |

Keys (from `SettingsState`):

`assessments`, `courses`, `dashboard`, `documents`, `forums`, `goals`, `home`, `messages`, `myed`, `news`, `notices`, `portals`, `reports`, `settings`, `timetable`, `welcome`

**Example:**

```json
{
  "home": { "toggle": true },
  "timetable": { "toggle": false },
  "messages": { "toggle": true }
}
```

#### `menuorder`

| | |
|-|-|
| **Type** | `array` |
| **Default** | `[]` |
| **UI** | Menu editor (drag order) |
| **Item type** | `string` — SEQTA menu `data-key` values (e.g. `"home"`, `"timetable"`, `"analytics"` for plugin-injected items) |
| **Example** | `["home", "timetable", "assessments", "messages"]` |

#### `defaultmenuorder`

| | |
|-|-|
| **Type** | `array` |
| **Default** | `[]` (populated from DOM on first menu edit) |
| **Item type** | Same as `menuorder` — snapshot of school default order |
| **Example** | `["home", "dashboard", "timetable"]` |

### Shortcuts

#### `shortcuts`

| | |
|-|-|
| **Type** | `array` |
| **Default** | Outlook, Office, Google — each `enabled: true` |
| **UI** | Settings → Shortcuts |
| **Item shape** | `{ "name": string, "enabled": boolean }` |
| **Notes** | `name` matches keys in `src/seqta/content/links.json` (e.g. `"Outlook"`, `"YouTube"`) |

**Example:**

```json
[
  { "name": "Outlook", "enabled": true },
  { "name": "Office", "enabled": false },
  { "name": "Google", "enabled": true }
]
```

#### `customshortcuts`

| | |
|-|-|
| **Type** | `array` |
| **Default** | `[]` |
| **UI** | Settings → Shortcuts → add custom |
| **Item shape** | `{ "name": string, "url": string, "icon": string }` |
| **`url`** | Full URL with protocol, e.g. `"https://example.com"` |
| **`icon`** | Inline **SVG markup string** OR single fallback character (first letter of title) |

**Example:**

```json
[
  {
    "name": "School Portal",
    "url": "https://portal.school.edu.au",
    "icon": "<svg viewBox=\"0 0 24 24\">…</svg>"
  }
]
```

### Subjects & news

#### `subjectfilters`

| | |
|-|-|
| **Type** | `object` |
| **Default** | `{}` |
| **UI** | Home / assessments subject filters |
| **Shape** | `{ [subjectCode: string]: boolean }` — `false` hides subject; missing key = visible |
| **Example** | `{ "10MAT": false, "10ENG": true }` |

#### `newsSource`

| | |
|-|-|
| **Type** | `string` |
| **Default** | `"australia"` |
| **UI** | Settings → News Feed Source |
| **Allowed** | `australia`, `usa`, `uk`, `taiwan`, `hong_kong`, `panama`, `canada`, `singapore`, `japan`, `netherlands` |
| **Example** | `"australia"` |

### Cloud sync preference

#### `autoCloudSettingsSync`

| | |
|-|-|
| **Type** | `boolean` |
| **Default** | `true` |
| **UI** | Settings → Cloud Settings Sync |
| **Semantics** | Sync runs when **not** strictly `false` (default-on) |
| **Example** | `true` |

### Theme of the Month

#### `themeOfTheMonthDisabled`

| | |
|-|-|
| **Type** | `boolean` |
| **Default** | `false` |
| **UI** | Global Search plugin section → Theme of the Month switch (inverted in UI) |
| **Example** | `false` |

#### `themeOfTheMonthDismissedMonth`

| | |
|-|-|
| **Type** | `string` |
| **Format** | `"YYYY-MM"` calendar month |
| **Example** | `"2026-06"` |

#### `themeOfTheMonthLastSeenId`

| | |
|-|-|
| **Type** | `string` |
| **Status** | Deprecated; may still exist in old profiles |
| **Synced** | Yes if present |

### One-time announcements & privacy

#### `privacyStatementShown`

| | |
|-|-|
| **Type** | `boolean` |
| **Example** | `true` |

#### `privacyStatementLastUpdated`

| | |
|-|-|
| **Type** | `string` |
| **Format** | ISO date, e.g. `"2025-12-20"` |

#### `engageParentsAnnouncementShown`

| | |
|-|-|
| **Type** | `boolean` |
| **Purpose** | SEQTA Engage parents announcement dismissed |

#### `bsCloudAutoSyncAnnouncementShown`

| | |
|-|-|
| **Type** | `boolean` |
| **Purpose** | Cloud auto-sync announcement dismissed |

### Update & developer flags

#### `justupdated`

| | |
|-|-|
| **Type** | `boolean` |
| **Purpose** | Set `true` after extension update; drives startup popup queue |
| **Example** | `true` |

#### `devMode`

| | |
|-|-|
| **Type** | `boolean` |
| **Default** | undefined / false |
| **UI** | Hidden unlock in settings |
| **Example** | `true` |

#### `hideSensitiveContent`

| | |
|-|-|
| **Type** | `boolean` |
| **UI** | Dev mode → Sensitive Hider |
| **Example** | `false` |

#### `mockNotices`

| | |
|-|-|
| **Type** | `boolean` |
| **UI** | Dev mode → Mock Notices |
| **Example** | `false` |

#### `devGhReleaseVersionOverride`

| | |
|-|-|
| **Type** | `string` |
| **UI** | Dev mode → version override field |
| **Format** | Semver string, e.g. `"3.7.0"` |
| **Example** | `"99.0.0"` |

#### `lastSeenNightlyPublishedAt`

| | |
|-|-|
| **Type** | `string` |
| **Format** | ISO 8601 timestamp from GitHub release `published_at` |
| **Example** | `"2026-06-01T04:30:00Z"` |

### Profile picture helper

#### `profile_picture_revision`

| | |
|-|-|
| **Type** | `number` |
| **Purpose** | Incremented when cloud/local profile picture changes; triggers UI refresh |
| **Not** | The image itself (stored in localforage `profile-picture-store`) |
| **Example** | `3` |

---

## Plugin settings objects

Each plugin stores one object at `plugin.{pluginId}.settings`. Plugins with `disableToggle: true` also store `enabled: boolean` (written from settings UI, not the settings proxy).

Settings of type `component` or `button` are **not** auto-persisted by the plugin settings proxy.

### `plugin.animated-background.settings`

| Field | Type | Default | Range / notes |
|-------|------|---------|---------------|
| `enabled` | `boolean` | `true` | From `disableToggle` UI |
| `speed` | `number` | `1` | **0.1–2.0**, step 0.05 in UI |

```json
{ "enabled": true, "speed": 1.05 }
```

### `plugin.assessments-average.settings`

| Field | Type | Default |
|-------|------|---------|
| `enabled` | `boolean` | `false` |
| `lettergrade` | `boolean` | `false` |

```json
{ "enabled": true, "lettergrade": false }
```

### `plugin.notificationCollector.settings`

| Field | Type | Default |
|-------|------|---------|
| `enabled` | `boolean` | `true` |

```json
{ "enabled": true }
```

### `plugin.timetable.settings`

| Field | Type | Default |
|-------|------|---------|
| `enabled` | `boolean` | `true` |

```json
{ "enabled": true }
```

### `plugin.timetableEdit.settings`

| Field | Type | Default |
|-------|------|---------|
| `enabled` | `boolean` | `true` |

```json
{ "enabled": true }
```

### `plugin.global-search.settings`

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `enabled` | `boolean` | `false` | Plugin default off |
| `searchHotkey` | `string` | `"ctrl+k"` or `"cmd+k"` | See hotkey format below |
| `showRecentFirst` | `boolean` | `true` | |
| `transparencyEffects` | `boolean` | `true` | Search bar blur |
| `runIndexingOnLoad` | `boolean` | `true` | |
| `passiveIndexing` | `boolean` | `true` | Index visited pages |

```json
{
  "enabled": true,
  "searchHotkey": "ctrl+shift+f",
  "showRecentFirst": true,
  "transparencyEffects": true,
  "runIndexingOnLoad": true,
  "passiveIndexing": true
}
```

#### Hotkey string format (`searchHotkey`)

- Lowercase, `+`-separated: `modifier[+modifier]+key`
- Modifiers: `ctrl`/`control`, `cmd`/`meta`/`command`, `alt`/`option`, `shift`
- Key: single character or name (`k`, `f`, etc.) — matched against `event.key` case-insensitively
- Valid iff at least one non-modifier key is present (`isValidHotkey`)
- **Examples:** `"ctrl+k"`, `"cmd+shift+p"`, `"alt+f"`

### `plugin.profile-picture.settings`

| Field | Type | Default |
|-------|------|---------|
| `enabled` | `boolean` | `false` |
| `useCloudPfp` | `boolean` | `false` |

```json
{ "enabled": true, "useCloudPfp": true }
```

When `useCloudPfp` is true, avatar URL comes from `bsplus_user.pfpUrl` (local auth, not synced) — other devices need their own login.

### `plugin.messageFolders.settings`

| Field | Type | Default |
|-------|------|---------|
| `enabled` | `boolean` | `true` |
| `showTagsInAllMessages` | `boolean` | `true` |
| `hideFolderedMessagesInAll` | `boolean` | `true` |

```json
{
  "enabled": true,
  "showTagsInAllMessages": true,
  "hideFolderedMessagesInAll": true
}
```

### `plugin.enhanced-navigation.settings`

| Field | Type | Default |
|-------|------|---------|
| `enabled` | `boolean` | `true` |
| `autoScrollOnClick` | `boolean` | `false` |

```json
{ "enabled": true, "autoScrollOnClick": false }
```

### `plugin.background-music.settings`

| Field | Type | Default | Range |
|-------|------|---------|-------|
| `enabled` | `boolean` | `false` | |
| `volume` | `number` | `0.5` | 0–1 |
| `pauseOnHidden` | `boolean` | `true` | |

```json
{ "enabled": true, "volume": 0.75, "pauseOnHidden": true }
```

Audio blob: localforage `background-music-store` / `music` / key `audio-blob` — **not synced**.

### `plugin.grade-analytics.settings`

| Field | Type | Default | Range |
|-------|------|---------|-------|
| `cacheTtlHours` | `number` | `24` | 1–168 |

```json
{ "cacheTtlHours": 48 }
```

No `enabled` field — plugin uses `disableToggle: false` and always runs when registered (except Engage).

### Unused plugin settings keys

- `plugin.themes.settings` — not written (empty plugin settings)
- `plugin.assessments-overview.settings` — not written

---

## Plugin runtime storage keys

Separate top-level keys per property: `plugin.{pluginId}.storage.{propertyName}`.

### Message Folders (`plugin.messageFolders`)

#### `plugin.messageFolders.storage.folders`

```json
[
  {
    "id": "m1abc2def",
    "name": "Important",
    "color": "#3b82f6",
    "emoji": "<svg …></svg>"
  }
]
```

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | `Date.now().toString(36) + random` |
| `name` | `string` | Display name |
| `color` | `string` | Hex colour from preset palette |
| `emoji` | `string` | Inline SVG icon markup (not unicode emoji) |

#### `plugin.messageFolders.storage.messageAssignments`

```json
{
  "msg-uuid-1": ["folderId1"],
  "msg-uuid-2": ["folderId1", "folderId2"]
}
```

Keys: SEQTA message identifiers. Values: arrays of folder `id` strings.

### Timetable Edit (`plugin.timetableEdit`)

#### `plugin.timetableEdit.storage.timetableOverrides`

Keyed by class instance id (`ci` as string):

```json
{
  "42": { "room": "B204", "staff": "Mr Smith" },
  "17": { "staff": "Ms Jones" }
}
```

#### `plugin.timetableEdit.storage.timetableOverridesBySubject`

Keyed by subject description string:

```json
{
  "10 Mathematics": { "room": "MA1" }
}
```

Entry shape: `{ "room"?: string, "staff"?: string }` — either field optional.

### Assessment Averages (`plugin.assessments-average`)

#### `plugin.assessments-average.storage.weightingOverrides` — **synced**

User manual weight overrides by assessment id:

```json
{
  "123456": "25",
  "123457": "N/A"
}
```

Values are weight strings as shown in UI (percentage text or `"N/A"`).

#### `plugin.assessments-average.storage.assessments` — **NOT synced**

Title → assessment id map (school data):

```json
{
  "Semester 1 Exam": "123456"
}
```

#### `plugin.assessments-average.storage.weightings` — **NOT synced**

```json
{
  "123456": {
    "weight": "25",
    "fingerprint": "[\"GRADED\",true,\"…\"]",
    "pluginVersion": 1,
    "refreshing": false
  }
}
```

| Field | Type | Notes |
|-------|------|-------|
| `weight` | `string` | e.g. `"25"`, `"processing"`, `"N/A"` |
| `fingerprint` | `string` | JSON-stringified assessment state fingerprint |
| `pluginVersion` | `number` | `WEIGHTING_SCHEMA_VERSION` (= 1) |
| `refreshing` | `boolean` | optional; background refetch in progress |

### Notification Collector (`plugin.notificationCollector`)

| Key | Type | Example |
|-----|------|---------|
| `plugin.notificationCollector.storage.lastNotificationCount` | `number` | `3` |
| `plugin.notificationCollector.storage.consecutiveErrors` | `number` | `0` |
| `plugin.notificationCollector.storage.lastCheckedTime` | `string` | `"2026-06-09T14:30:00.000Z"` |

All **synced** (not under an excluded prefix).

---

## Excluded caches (local-only schemas)

### Grade Analytics — prefix `bsplus.analytics.`

#### `bsplus.analytics.v2.{origin}.{studentId}`

- `origin`: full school origin, e.g. `https://school.seqta.com.au` (dots in hostname appear in key)
- `studentId`: numeric SEQTA student id

```json
{
  "updatedAt": 1717939200000,
  "assessments": [
    {
      "id": 1,
      "title": "Assignment 1",
      "subject": "10 Mathematics",
      "status": "MARKS_RELEASED",
      "due": "2026-03-15",
      "code": "10MAT",
      "metaclassID": 100,
      "programmeID": 10,
      "graded": true,
      "overdue": false,
      "hasFeedback": true,
      "expectationsEnabled": false,
      "expectationsCompleted": false,
      "reflectionsEnabled": false,
      "reflectionsCompleted": false,
      "availability": "FULL",
      "finalGrade": 85,
      "letterGrade": "A"
    }
  ]
}
```

`status` enum: `"OVERDUE"` | `"MARKS_RELEASED"` | `"PENDING"`.

#### `bsplus.analytics.distMode.v1.{origin}.{studentId}`

Scalar string: `"auto"` | `"letter"` | `"percent"`.

### Global Search — prefix `plugin.global-search.storage.`

Reserved for future device-local caches. No keys in use today; any key matching the prefix is excluded.

---

## Data outside `chrome.storage.local`

These affect UX but **never** appear in the cloud `data` blob:

| Store | Location | Contents |
|-------|----------|----------|
| Global Search structured index | IndexedDB `betterseqta-index` | Searchable page text |
| Global Search vectors | IndexedDB `embeddiaDB` | Embedding index |
| Global Search schema version | `localStorage` key `betterseqta-index-version` | Index migration |
| Installed themes | localforage (default instance) | `CustomTheme` objects keyed by theme id; index `customThemes` |
| Profile picture upload | localforage `profile-picture-store` / `profilePicture` | Image blob |
| Cloud PFP cache | localforage `cloud-pfp-store` / `cloudPfp` | Cached avatar blobs |
| Background music | localforage `background-music-store` / `music` / `audio-blob` | Audio blob |
| Dev API override | `sessionStorage` `bsplus_dev_api_base` | Staging server URL |
| Engage student context | `localStorage` `bsplus.engageTimetable.student.{origin}` | Current student id |

After cloud restore, devices may need to **rebuild** indexes, **re-upload** media, or **re-download** themes even when synced settings reference them.

---

## Catch-all & forward compatibility

### Inclusion test

```ts
isKeyIncludedInCloudUploadPayload(key) === !shouldOmitKeyFromCloudPayload(key)
```

Any new `chrome.storage.local` key syncs automatically unless added to:

- `KEYS_OMITTED_FROM_CLOUD_UPLOAD`
- `SENSITIVE_DEVICE_STORAGE_KEYS_EXACT`
- `CLIENT_ONLY_CLOUD_KEYS_EXACT`
- `SENSITIVE_DEVICE_STORAGE_KEY_PREFIXES`

### Upload trigger flow

1. `browser.storage.onChanged` (area `local`)
2. At least one changed key passes `isKeyIncludedInCloudUploadPayload`
3. `autoCloudSettingsSync !== false`
4. Valid access token
5. Not during restore → schedule 2 s debounce → `PUT` full snapshot

### Server storage suggestion

Store the full PUT body (or at minimum `{ schemaVersion, themeId, data }`) as JSONB per user. `data` alone is sufficient for restore if `themeId` is duplicated inside `data.selectedTheme`.

### Versioning

- Client `schemaVersion`: **1**
- If server returns higher `schemaVersion` in cloud-summary, auto-download is skipped until client is updated.

---

## UI accessibility

Which synced keys can be changed directly by the user in the extension **settings popup** (SEQTA → BetterSEQTA+ settings) or other in-product UI — vs keys that are written only by the app, popups, or plugins at runtime.

**Settings popup tabs:** Settings · Shortcuts · Themes (`src/interface/pages/settings.svelte`).

### Extension popup — Settings tab (`general.svelte`)

| Storage key / path | UI label | Control |
|--------------------|----------|---------|
| `iconOnlySidebar` | Icon Only Sidebar | Switch |
| `animations` | Animations | Switch |
| `timeFormat` | 12 Hour Time | Switch (`"12"` / `"24"`) |
| `transparencyEffects` | Transparency Effects | Switch |
| `defaultPage` | Default Page | Select |
| `newsSource` | News Feed Source | Select |
| `selectedColor` | Custom Theme Colour | Button → colour picker modal |
| `selectedFont` | Interface Font | Button → font picker modal |
| `adaptiveThemeColour` | Adaptive Theme Colour | Switch |
| `adaptiveThemeGradient` | Soft Gradient | Switch (when adaptive colour on) |
| `adaptiveThemeColourTransition` | Smooth colour transition | Switch (when adaptive colour on) |
| `menuorder`, `menuitems`, `defaultmenuorder` | Edit Sidebar Layout | Button → opens editor **on the SEQTA tab** (not inside the popup) |
| `themeOfTheMonthDisabled` | Theme of the Month | Switch (under Global Search plugin block) |
| `autoCloudSettingsSync` | Automatic sync | Switch (BetterSEQTA Cloud card, signed in only) |
| `onoff` | BetterSEQTA+ | Switch (bottom of tab) |

#### Plugin blocks on Settings tab

Each row is `plugin.{id}.settings.{field}` unless noted. Component settings (upload UIs) change synced **preference** keys but not blob data in IndexedDB.

| Plugin | UI | Synced fields from UI |
|--------|-----|------------------------|
| **Animated Background** | Enable + Animation Speed slider | `enabled`, `speed` |
| **Assessment Averages** | Enable (+ disclaimer) + Letter Grades | `enabled`, `lettergrade` |
| **Notification Collector** | Enable only | `enabled` |
| **Timetable Enhancer** | Enable only | `enabled` |
| **Edit Rooms & Teachers** | Enable only | `enabled` |
| **Global Search** | Enable + hotkey + 4 toggles + Reset Index button | `enabled`, `searchHotkey`, `showRecentFirst`, `transparencyEffects`, `runIndexingOnLoad`, `passiveIndexing` — Reset Index does **not** sync index data |
| **Custom Profile Picture** | Enable + Use cloud PFP (if signed in) + upload/remove | `enabled`, `useCloudPfp`; upload updates `profile_picture_revision` (image blob **not** synced) |
| **Message Folders** | Enable + 2 toggles | `enabled`, `showTagsInAllMessages`, `hideFolderedMessagesInAll` |
| **Enhanced Navigation** | Enable + Auto-scroll | `enabled`, `autoScrollOnClick` |
| **Background Music** | Enable + volume + pause on hidden + upload | `enabled`, `volume`, `pauseOnHidden`; audio blob **not** synced |
| **Grade Analytics** | Cache duration (hours) slider only | `cacheTtlHours` |

**Not shown on Settings tab** (empty `settings` + no enable toggle → card hidden):

- **Themes** plugin — use **Themes** tab instead
- **Assessments Overview** plugin — no settings UI

#### Dev mode only (Settings tab, after typing “dev” on logo)

| Storage key | UI label |
|-------------|----------|
| `devMode` | Developer Mode |
| `hideSensitiveContent` | Sensitive Hider |
| `mockNotices` | Mock Notices |
| `privacyStatementShown`, `privacyStatementLastUpdated` | Show Privacy Notification (resets to show popup) |
| `devGhReleaseVersionOverride` | GitHub latest version override (text field) |

Dev **Export cloud settings JSON** downloads the upload payload; it does not change storage.

### Extension popup — Shortcuts tab (`shortcuts.svelte`)

| Storage key | UI |
|-------------|-----|
| `shortcuts` | Toggle built-in shortcuts (Outlook, Office, Google, … from `links.json`) |
| `customshortcuts` | Add / delete custom shortcuts (name, URL, optional SVG icon) |

Changes use `settingsState.setKey()` so the SEQTA home page updates immediately via `StorageChangeHandler` → `renderShortcuts()` (embedded settings run in the content script, where `storage.onChanged` does not fire for local writes). Empty arrays are persisted explicitly (`customshortcuts: []`) so cloud restore and other devices clear removed shortcuts.

### Extension popup — Themes tab (`theme.svelte`)

| Storage key | UI |
|-------------|-----|
| `selectedTheme` | Install / select / clear store themes (`ThemeSelector`) |
| `selectedColor` | May change when applying a theme with a default colour |
| `originalSelectedColor`, `originalDarkMode` | Set internally during theme **preview** in theme manager (not dedicated controls) |

Animated background selection uses `BackgroundSelector` (local/custom backgrounds); store theme id still goes to `selectedTheme`.

### SEQTA page UI (outside settings popup)

| Storage key / path | Where | Control |
|--------------------|-------|---------|
| `DarkMode` | SEQTA top bar | Sun/moon **Light/Dark** button |
| `menuorder`, `menuitems` | SEQTA sidebar | **Edit Sidebar Layout** overlay (drag order + per-item toggles) |
| `subjectfilters` | Home → upcoming assessments | Per-subject checkboxes (`#upcoming-filters`) |
| `subjectfilters` | Assessments → Overview | Subject filter UI in overview grid |
| `plugin.messageFolders.storage.folders` | Messages page | Create/edit/delete folders |
| `plugin.messageFolders.storage.messageAssignments` | Messages page | Assign messages to folders |
| `plugin.timetableEdit.storage.timetableOverrides` | Timetable | Edit room/teacher on a class |
| `plugin.timetableEdit.storage.timetableOverridesBySubject` | Timetable | Subject-level overrides |
| `plugin.assessments-average.storage.weightingOverrides` | Assessments page | Per-assessment “Override %” inputs |
| Global Search | SEQTA | Hotkey opens search bar (hotkey set in Settings) |

### Automatic / popup-only (synced, no dedicated settings control)

| Storage key / path | How it changes |
|--------------------|----------------|
| `lessonalert` | Default only — **no UI** (read by home loader) |
| `privacyStatementShown`, `privacyStatementLastUpdated` | Privacy popup on first run (dev can reset) |
| `engageParentsAnnouncementShown` | Dismiss Engage parents announcement |
| `bsCloudAutoSyncAnnouncementShown` | Dismiss cloud sync announcement |
| `themeOfTheMonthDismissedMonth` | Dismiss Theme of the Month popup |
| `justupdated` | Set `true` after extension update |
| `lastSeenNightlyPublishedAt` | Dismiss / acknowledge GitHub nightly update badge |
| `profile_picture_revision` | Incremented when profile picture changes |
| `plugin.notificationCollector.storage.*` | Written by notification poll loop |
| Legacy `animatedbk`, `bksliderinput`, etc. | Migrated to plugin settings; no longer shown in UI |

### Synced plugin prefs with UI vs storage-only side effects

| User action in UI | Synced | Not synced |
|-------------------|--------|------------|
| Upload profile picture | `useCloudPfp`, `profile_picture_revision` | Image blob (localforage) |
| Upload background music | `enabled`, `volume`, `pauseOnHidden` | Audio blob (localforage) |
| Install store theme | `selectedTheme`, often `selectedColor` / `DarkMode` | Theme assets (localforage) |
| Global Search indexing | Plugin settings toggles | IndexedDB `betterseqta-index`, `embeddiaDB` |
| Assessment averages | `lettergrade`, overrides | `storage.assessments`, `storage.weightings` caches |
| Grade Analytics TTL slider | `cacheTtlHours` | `bsplus.analytics.*` caches |

### Never in settings UI (excluded from sync entirely)

OAuth keys, analytics caches, assessment weighting caches, global-search storage prefix, client watermarks — see [Exclusion rules](#exclusion-rules).

---

## Default schema initialization

Implementation: `ensureSyncableStorageDefaults()` + `getSyncableStorageDefaults()`.

### What gets written when a key is missing

1. **All core `SettingsState` fields** from `getDefaultSettingsState()` — including `shortcuts`, `customshortcuts: []`, `menuitems`, `selectedFont: "rubik"`, `timeFormat: "24"`, announcement flags defaulting to `false`, etc.
2. **Every registered plugin’s** `plugin.{pluginId}.settings` object (defaults from plugin definitions; `enabled` included for `disableToggle` plugins).
3. **Legacy migration** on that flat map so upload-shaped storage uses `plugin.animated-background.settings` rather than `animatedbk` / `bksliderinput`.

### What is not auto-initialized

| Category | Reason |
|----------|--------|
| OAuth / session keys | Excluded from cloud; device-local |
| `plugin.*.storage.*` runtime data | Created when plugins run (folders, timetable overrides, etc.) |
| `bsplus.analytics.*` | Excluded device/school caches |
| `plugin.assessments-average.storage.assessments` / `.weightings` | Excluded school caches |
| `plugin.global-search.storage.*` | Excluded prefix |
| Client-only watermarks | Never uploaded |

### Settings persistence and live UI

`SettingsState` (`src/seqta/utils/listeners/SettingsState.ts`):

- Assignments (`settingsState.foo = …`) and `setKey()` persist to `chrome.storage.local` and **notify registered listeners** in the same context (required for embedded SEQTA settings).
- `saveToStorage()` omits `undefined` values so optional keys are not accidentally stripped.
