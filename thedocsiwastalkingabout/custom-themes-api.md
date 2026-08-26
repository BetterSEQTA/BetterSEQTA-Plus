# Custom User-Uploaded Themes API

HTTP API for community-submitted BetterSEQTA and DesQTA themes. Submissions require Accounts authentication, pass admin moderation, and appear on public distribution endpoints once approved.

**Base URL:** `https://betterseqta.org`  
**Prefix:** `/api/custom-themes`

This namespace is **separate** from the official theme marketplace at `/api/themes` and `/api/admin/themes`. Custom themes use an isolated D1 database (`USER_THEMES_DB`) and R2 prefix (`custom-themes/{id}/`). Official store data is unchanged.

---

## Auth matrix

| Actor | Routes | Auth |
|-------|--------|------|
| Public | `GET /api/custom-themes/*` (non-`/mine`) | None — **approved themes only** |
| User | `GET/POST/PUT/DELETE /api/custom-themes/mine/*` | Accounts session cookie or `Authorization: Bearer <token>` |
| Admin | `GET/POST /api/admin/custom-themes/*` | Staff session via `requireAdmin` (`admin_level >= 1`) |

Bearer tokens are obtained via `POST /api/auth/extension/login` or OAuth web login. All authenticated routes call `/api/auth/me` with forwarded cookie/Bearer headers.

---

## Response envelope

Successful JSON responses follow:

```json
{
  "success": true,
  "data": { },
  "error": null,
  "meta": { "timestamp": 1735123456789, "version": "1.0.0" }
}
```

Errors return `success: false`, `data: null`, and an `error` object:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_THEME_STRUCTURE",
    "message": "BetterSEQTA theme validation failed",
    "details": { "errors": ["..."], "warnings": [] }
  },
  "meta": { "timestamp": 1735123456789, "version": "1.0.0" }
}
```

Validation failures from upload endpoints return **422** with the envelope above. Most other errors use Nitro/H3 `createError` with a plain `{ statusCode, statusMessage }` body.

---

## Timestamps

Theme fields `created_at`, `updated_at`, `published_at`, and `reviewed_at` are **Unix time in seconds** (integers). Use `value * 1000` for JavaScript `Date`. The `meta.timestamp` field in the response envelope is milliseconds.

---

## Status lifecycle

```
pending ──(admin approve)──► approved ──(public list)──► visible
   │                              │
   │                              └──(user delete)──► removed
   │
   ├──(admin reject)──► rejected ──(user re-upload files)──► pending
   │
   └──(user delete)──► removed
```

| Status | Public API | Owner `/mine` | Admin API |
|--------|------------|---------------|-----------|
| `pending` | Hidden | Visible | Visible |
| `approved` | Visible | Visible | Visible |
| `rejected` | Hidden | Visible (includes `rejection_reason`) | Visible |

Approved themes cannot be edited in v1 — owners must delete and re-submit.

---

## Rate limits and ownership

| Rule | Limit |
|------|-------|
| Concurrent pending submissions per user | **5** |
| New uploads per 24 hours per user | **10** (count of `custom_themes` rows created in the last 24 hours for that user) |

Re-uploading files on an existing theme (`POST …/mine/[id]/files`) does not create a new upload-log row and does not count toward the 24h limit. File replacement still checks the pending cap.

- `author_id` is always set from the authenticated user; users cannot upload on behalf of others.
- Owners may view all their themes regardless of status.
- Owners may edit metadata or replace files only when status is `pending` or `rejected`.
- Owners may delete any own theme (removes D1 row + R2 assets).

Exceeded limits return **429**.

---

## D1 setup

Custom themes use a dedicated Cloudflare D1 database bound as `USER_THEMES_DB` in `wrangler.toml`.

**One-time production setup:**

```bash
pnpm exec wrangler d1 create bsplus-user-themes-db
# Copy the database_id UUID into wrangler.toml (prod + env.dev)

pnpm exec wrangler d1 execute bsplus-user-themes-db --remote --file=server/database/user-themes/schema.sql
```

**Local development:**

```bash
pnpm exec wrangler d1 execute bsplus-user-themes-db --local --file=server/database/user-themes/schema.sql
pnpm cf:dev
```

Schema file: `server/database/user-themes/schema.sql`  
Tables: `custom_themes`, `custom_theme_files` (`custom_theme_upload_log` exists for legacy deployments but is no longer written to)

Theme assets are stored in the existing R2 `BUCKET` under keys like `custom-themes/{theme_id}/theme.json`.

---

## Theme types

Both BetterSEQTA and DesQTA themes are supported. Type is auto-detected from uploaded files.

### BetterSEQTA

Folder or ZIP containing `theme.json` with `id`, `name`, `description`, `CustomCSS`. Optional `images/banner.webp`, `images/marquee.webp`.

### DesQTA

ZIP with `theme-manifest.json` + `styles/`. Optional `preview.png`, `screenshot1.png`, etc.

Multipart field names match the official admin upload: `theme_zip` or `theme_folder` (ZIP), plus optional loose files. Optional text field: `submission_notes`.

---

## Public distribution (no auth)

All public routes filter `status = 'approved'`.

### `GET /api/custom-themes`

Paginated list of approved custom themes.

| Query | Default | Notes |
|-------|---------|-------|
| `page` | `1` | 1-based |
| `limit` | `20` | Max 100 |
| `type` | — | `betterseqta` or `desqta` |
| `search` | — | Matches name, description, author (alias: `q`) |
| `sort` | `popular` | `popular`, `newest`, `name` |

**Response:**

```json
{
  "success": true,
  "data": {
    "themes": [
      {
        "id": "9a9786d1-b5fc-4a91-8c7a-f8bf7f7679ad",
        "name": "My Theme",
        "slug": "my-theme",
        "version": "1.0.0",
        "description": "...",
        "author": "Alice",
        "license": "MIT",
        "category": "other",
        "tags": [],
        "theme_type": "betterseqta",
        "download_count": 42,
        "preview": { "thumbnail": "https://...", "screenshots": [] },
        "compatibility": { "min": null, "max": null },
        "created_at": 1700000000,
        "updated_at": 1700100000,
        "published_at": 1700050000,
        "coverImage": "https://betterseqta.org/api/images/custom-themes/{id}/images/banner.webp",
        "marqueeImage": "https://...",
        "theme_json_url": "https://betterseqta.org/api/custom-themes/{id}/theme.json"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "total_pages": 1
    }
  },
  "error": null,
  "meta": { "timestamp": 0, "version": "1.0.0" }
}
```

DesQTA list items include `preview_thumbnail_url`, `zip_download_url`, `file_size`, and `checksum` instead of BetterSEQTA image fields.

### `GET /api/custom-themes/search`

Same filters as the list endpoint; search term is passed as `q` instead of `search`.

**Response:** Same shape as list, plus `"query": "search term"`.

### `GET /api/custom-themes/[id]`

Single approved theme detail. Same theme object shape as list items.

| HTTP | When |
|------|------|
| 404 | Not found or not approved |

### `GET /api/custom-themes/by-slug/[slug]`

Lookup approved theme by URL slug. Response body matches `GET /api/custom-themes/[id]`.

### `GET /api/custom-themes/[id]/theme.json`

Returns raw `theme.json` for approved BetterSEQTA themes. Content-Type: `application/json`. No auth.

| HTTP | When |
|------|------|
| 404 | Not found, not approved, or not `betterseqta` |

### `GET /api/custom-themes/[id]/download`

Increments `download_count` and returns download URLs.

**BetterSEQTA response:**

```json
{
  "success": true,
  "data": {
    "theme_json_url": "https://betterseqta.org/api/custom-themes/{id}/theme.json",
    "download_count": 43
  },
  "error": null,
  "meta": { "timestamp": 0, "version": "1.0.0" }
}
```

**DesQTA response:**

```json
{
  "success": true,
  "data": {
    "zip_download_url": "https://betterseqta.org/api/images/custom-themes/{id}/theme.zip",
    "checksum": "sha256:...",
    "file_size": 12345,
    "download_count": 43
  },
  "error": null,
  "meta": { "timestamp": 0, "version": "1.0.0" }
}
```

---

## User management (auth required)

### `POST /api/custom-themes/mine`

Submit a new theme. Multipart upload; starts as `status: pending`.

**Request:** `multipart/form-data`

| Field | Required | Notes |
|-------|----------|-------|
| `theme_zip` or `theme_folder` | One of | `.zip` archive |
| Individual files | Alt. | Loose theme files with filenames as field names |
| `submission_notes` | No | Message for reviewers |

**Success (201 implied, 200 in practice):**

```json
{
  "success": true,
  "data": {
    "theme": {
      "id": "...",
      "name": "...",
      "slug": "...",
      "status": "pending",
      "submission_notes": "Please review",
      "rejection_reason": null,
      "reviewed_at": null,
      "...": "other public + owner fields"
    },
    "validation": { "valid": true, "warnings": [], "errors": [] }
  },
  "error": null,
  "meta": { "timestamp": 0, "version": "1.0.0" }
}
```

| HTTP | When |
|------|------|
| 401 | Not authenticated |
| 400 | No files / invalid multipart |
| 409 | Theme id conflict (BetterSEQTA `theme.json` id already used) |
| 422 | Validation failed (`INVALID_THEME_STRUCTURE`, `UNKNOWN_THEME_TYPE`) |
| 429 | Rate limit exceeded |

**Example — BetterSEQTA ZIP:**

```bash
curl -X POST 'https://betterseqta.org/api/custom-themes/mine' \
  -H 'Authorization: Bearer eyJ...' \
  -F 'theme_zip=@my-theme.zip' \
  -F 'submission_notes=First public release'
```

**Example — DesQTA folder files:**

```bash
curl -X POST 'https://betterseqta.org/api/custom-themes/mine' \
  -H 'Authorization: Bearer eyJ...' \
  -F 'theme_zip=@desqta-theme.zip'
```

### `GET /api/custom-themes/mine`

List caller's themes (all statuses unless filtered).

| Query | Notes |
|-------|-------|
| `page`, `limit` | Pagination (default 1, 20; max 100) |
| `status` | `pending`, `approved`, or `rejected` |
| `type` | `betterseqta` or `desqta` |

Owner view includes `status`, `submission_notes`, `rejection_reason`, `reviewed_at`.

### `GET /api/custom-themes/mine/[id]`

Own theme detail plus file manifest.

```json
{
  "success": true,
  "data": {
    "theme": { "...": "owner shape with status and rejection_reason" },
    "files": [
      {
        "id": "...",
        "file_path": "theme.json",
        "file_type": "theme_json",
        "file_size": 1234,
        "mime_type": "application/json",
        "created_at": 1700000000
      }
    ]
  },
  "error": null,
  "meta": { "timestamp": 0, "version": "1.0.0" }
}
```

| HTTP | When |
|------|------|
| 403 | Not the owner |
| 404 | Theme not found |

### `PUT /api/custom-themes/mine/[id]`

Update metadata when status is `pending` or `rejected`.

**Request body (JSON):**

```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "submission_notes": "Fixed contrast issues"
}
```

At least one field required.

| HTTP | When |
|------|------|
| 409 | Theme is `approved` (not editable) |
| 403 | Not the owner |

### `POST /api/custom-themes/mine/[id]/files`

Replace theme files. Re-validates upload; resets `rejected` → `pending`. Same multipart fields as create.

| HTTP | When |
|------|------|
| 409 | Theme is `approved` |
| 422 | Validation failed |
| 429 | Pending cap exceeded |

```bash
curl -X POST 'https://betterseqta.org/api/custom-themes/mine/{id}/files' \
  -H 'Authorization: Bearer eyJ...' \
  -F 'theme_zip=@my-theme-v2.zip'
```

### `DELETE /api/custom-themes/mine/[id]`

Delete own theme and all R2 assets. Allowed for any status.

```json
{
  "success": true,
  "data": {
    "message": "Theme deleted successfully",
    "id": "..."
  },
  "error": null,
  "meta": { "timestamp": 0, "version": "1.0.0" }
}
```

---

## Admin moderation (admin required)

**Admin UI:** [`/admin/custom-themes`](https://betterseqta.org/admin/custom-themes) — list pending submissions, review detail, approve/reject (requires `admin_level >= 1`).

API routes (also used by the admin UI):

### `GET /api/admin/custom-themes`

List submissions for triage.

| Query | Notes |
|-------|-------|
| `page`, `limit` | Pagination |
| `status` | Filter by status |
| `author_id` | Filter by submitter Accounts user ID |
| `search` | Name, description, author |
| `type` | `betterseqta` or `desqta` |
| `include_counts` | Optional. `1` / `true` adds `counts: { pending, approved, rejected }` |

Returns owner-shaped theme objects (includes status, rejection fields).

### `GET /api/admin/custom-themes/[id]`

Full detail with file list (includes `r2_key`, `checksum`) and submitter info:

```json
{
  "success": true,
  "data": {
    "theme": { "...": "owner shape" },
    "files": [ { "id": "...", "r2_key": "custom-themes/.../theme.json", "...": "..." } ],
    "submitter": { "author_id": "...", "author": "Display Name" }
  },
  "error": null,
  "meta": { "timestamp": 0, "version": "1.0.0" }
}
```

### `POST /api/admin/custom-themes/[id]/approve`

Approve a submission. Sets `status = approved`, `published_at`, `reviewed_by`, `reviewed_at`; clears `rejection_reason`.

```json
{
  "success": true,
  "data": {
    "message": "Custom theme approved successfully",
    "id": "...",
    "status": "approved"
  },
  "error": null,
  "meta": { "timestamp": 0, "version": "1.0.0" }
}
```

```bash
curl -X POST 'https://betterseqta.org/api/admin/custom-themes/{id}/approve' \
  -H 'Cookie: auth_token=...'
```

### `POST /api/admin/custom-themes/[id]/reject`

Reject a submission. Requires a reason.

**Request body:**

```json
{
  "reason": "CustomCSS contains invalid selectors and breaks the timetable layout."
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Custom theme rejected",
    "id": "...",
    "status": "rejected",
    "rejection_reason": "CustomCSS contains invalid selectors and breaks the timetable layout."
  },
  "error": null,
  "meta": { "timestamp": 0, "version": "1.0.0" }
}
```

| HTTP | When |
|------|------|
| 400 | Missing `reason` |

---

## Distinction from official `/api/themes`

| | Official marketplace | Custom themes |
|--|---------------------|---------------|
| Prefix | `/api/themes`, `/api/admin/themes` | `/api/custom-themes`, `/api/admin/custom-themes` |
| Database | Main `DB` (bsplus-db) | `USER_THEMES_DB` |
| R2 prefix | `themes/{id}/` | `custom-themes/{id}/` |
| Upload auth | Admin only | Any authenticated user |
| Initial status | Admin workflow | `pending` until approved |
| Features | Ratings, favorites, collections, spotlight | None in v1 |
| Public filter | Approved official themes | Approved custom themes only |

Extensions and clients should use `/api/custom-themes?type=betterseqta` for community themes and `/api/themes?type=betterseqta` for curated official themes.

---

## Error reference

| HTTP | Typical cause |
|------|---------------|
| 400 | Missing ID, empty update body, missing rejection reason, bad multipart |
| 401 | Missing or invalid auth on `/mine` routes |
| 403 | Not owner; not admin |
| 404 | Theme not found or not visible at this access level |
| 409 | Approved theme edit attempt; BetterSEQTA id conflict |
| 422 | Theme structure / type validation failed |
| 429 | Pending cap (5) or 24h upload cap (10) exceeded |
| 500 | Unexpected server error |

---

## Related docs

- Official theme API: [`docs/extension-themes-api.md`](extension-themes-api.md)
- Extension auth: §7 in extension-themes-api.md (`POST /api/auth/extension/login`)
- Client integration handoff: [`docs/custom-themes-client-integration.md`](custom-themes-client-integration.md)
