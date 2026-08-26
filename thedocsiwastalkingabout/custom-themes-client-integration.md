# Custom Themes — Client Integration Guide

Handoff document for implementing user-uploaded theme UI on the **Accounts site** and **BetterSEQTA extension**. The server API is complete; this doc covers auth, UI flows, API sequences, and testing.

**API reference:** [`docs/custom-themes-api.md`](custom-themes-api.md)  
**Base URL:** `https://betterseqta.org`

---

## Goals (client v1)

Users with a BetterSEQTA Accounts login can:

1. **Submit** a BetterSEQTA or DesQTA theme for review
2. **Track** submissions on a "My themes" page (pending / approved / rejected)
3. **See rejection reasons** and **re-upload** fixed files
4. **Edit metadata** (name, description, notes) while pending or rejected
5. **Delete** any own theme
6. **Browse and install** approved community themes (extension: BetterSEQTA type)

**Out of scope for client v1:**

- Admin moderation UI (available at `/admin/custom-themes` on betterseqta.org for staff)
- Editing approved themes (must delete and re-submit)
- Ratings, favorites, collections on custom themes
- Mixing custom and official themes in one admin upload flow

---

## Authentication

All `/api/custom-themes/mine/*` routes require a valid Accounts identity.

### Extension

1. `POST /api/auth/extension/login` with username + password
2. Store `access_token` from response
3. Send `Authorization: Bearer <access_token>` on every `/mine` request

```bash
curl -X POST 'https://betterseqta.org/api/auth/extension/login' \
  -H 'Content-Type: application/json' \
  -d '{"username":"user","password":"secret"}'
```

Response:

```json
{
  "access_token": "eyJ...",
  "expires_in": 3600
}
```

### Accounts website

Use the existing OAuth web login flow. After login, the `auth_token` HttpOnly cookie is sent automatically on same-origin requests to `betterseqta.org`. No Bearer header required when calling from the website.

Verify session: `GET /api/auth/me` → returns user object with `id`, `username`, etc.

Public browse/install endpoints (`GET /api/custom-themes`, download, `theme.json`) require **no auth**.

---

## UI flows

### 1. Submit theme (wizard)

**Screens:** file picker → optional notes → upload progress → success with link to detail.

**Steps:**

1. User selects ZIP or folder (BetterSEQTA: `theme.json` + optional images; DesQTA: manifest + styles).
2. Optional `submission_notes` textarea ("anything reviewers should know").
3. `POST /api/custom-themes/mine` multipart upload.
4. On success, show theme id, slug, status badge **Pending**, link to "My themes".
5. On 422, display `error.details.errors` inline; show `warnings` as non-blocking hints.
6. On 429, explain limits (max 5 pending, 10 uploads per 24h).

**Do not** expect the theme on public browse until admin approves.

### 2. My themes list

**Screen:** table or cards with status badges (`pending` yellow, `approved` green, `rejected` red).

**API:** `GET /api/custom-themes/mine?page=1&limit=20`

Optional filters: `?status=rejected`, `?type=betterseqta`.

Show: name, type, status, `created_at` (format from Unix seconds), actions (view, edit, delete).

### 3. Theme detail (owner)

**API:** `GET /api/custom-themes/mine/[id]`

Display full metadata, file list, `submission_notes`.

**If `status === 'rejected'`:**
- Prominent `rejection_reason` banner
- CTA: "Upload revised files" → flow 4
- Allow metadata edit via flow 5

**If `status === 'pending'`:**
- Show "Awaiting review"
- Allow metadata edit and file replace

**If `status === 'approved'`:**
- Show public URL / slug
- Disable edit controls; only **Delete** (with confirmation)
- Link to public theme page if you build one

### 4. Re-upload after rejection

**When:** `status` is `pending` or `rejected` (file replace resets rejected → pending).

**API:** `POST /api/custom-themes/mine/[id]/files` with same multipart shape as create.

**UX:**
1. Confirm replacing files will reset review to pending.
2. Upload new ZIP.
3. Refresh detail; status should be `pending`, `rejection_reason` cleared server-side.

### 5. Edit metadata

**When:** `pending` or `rejected` only.

**API:** `PUT /api/custom-themes/mine/[id]`

```json
{
  "name": "Neumorphic Dark v2",
  "description": "Fixed contrast on sidebar",
  "submission_notes": "Addressed reviewer feedback"
}
```

409 if user tries to edit an approved theme — show message that they must delete and re-submit.

### 6. Delete theme

**When:** any status.

**UX:** confirmation modal ("This cannot be undone").

**API:** `DELETE /api/custom-themes/mine/[id]`

Remove from list on success.

---

## Extension: browse and install community themes

Community themes are **separate** from official `/api/themes`. Use the custom prefix.

### List approved BetterSEQTA themes

```
GET /api/custom-themes?type=betterseqta&sort=popular&page=1&limit=20
```

No auth. Parse `data.themes[]` — each item includes `theme_json_url`, `coverImage`, `marqueeImage`, `download_count`, timestamps in **Unix seconds**.

### Install flow (BetterSEQTA)

Same pattern as official themes, different URLs:

1. User picks theme from community list (or deep link by id/slug).
2. `GET /api/custom-themes/{id}/download` — records download, returns `theme_json_url`.
3. `GET` the `theme_json_url` (or use URL from list/detail directly).
4. Apply `CustomCSS` and images per existing extension theme loader.

**Optional:** `GET /api/custom-themes/by-slug/{slug}` for share links.

**DesQTA community themes:** use `zip_download_url` from download endpoint or list item; install like official DesQTA ZIP flow.

### Suggested extension UX

- Separate tab or section: "Community themes" vs "Official themes"
- Badge: "Community" on custom theme cards
- Do not send Bearer token for public list/install unless you add authenticated features later

---

## API call sequences (copy-paste examples)

### Sequence A — First submission

```http
POST /api/custom-themes/mine
Authorization: Bearer eyJ...
Content-Type: multipart/form-data

theme_zip=@ocean-theme.zip
submission_notes=First submission
```

Response (abbreviated):

```json
{
  "success": true,
  "data": {
    "theme": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Ocean Blue",
      "slug": "ocean-blue",
      "status": "pending",
      "theme_type": "betterseqta",
      "created_at": 1700000000,
      "updated_at": 1700000000,
      "published_at": null,
      "rejection_reason": null
    },
    "validation": { "valid": true, "warnings": [], "errors": [] }
  }
}
```

### Sequence B — Poll my pending themes

```http
GET /api/custom-themes/mine?status=pending
Authorization: Bearer eyJ...
```

### Sequence C — Handle rejection

After admin rejects (see testing), owner fetches detail:

```http
GET /api/custom-themes/mine/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Authorization: Bearer eyJ...
```

Response includes:

```json
{
  "data": {
    "theme": {
      "status": "rejected",
      "rejection_reason": "Banner image must be WebP under 500 KB.",
      "reviewed_at": 1700200000
    }
  }
}
```

Re-upload:

```http
POST /api/custom-themes/mine/a1b2c3d4-e5f6-7890-abcd-ef1234567890/files
Authorization: Bearer eyJ...
Content-Type: multipart/form-data

theme_zip=@ocean-theme-fixed.zip
```

### Sequence D — Public install (extension, no auth)

```http
GET /api/custom-themes?type=betterseqta&sort=newest&limit=10
```

Pick id, then:

```http
GET /api/custom-themes/a1b2c3d4-e5f6-7890-abcd-ef1234567890/download
```

```json
{
  "success": true,
  "data": {
    "theme_json_url": "https://betterseqta.org/api/custom-themes/a1b2c3d4-e5f6-7890-abcd-ef1234567890/theme.json",
    "download_count": 1
  }
}
```

Fetch theme JSON and apply.

---

## Error handling

| HTTP | Code / body | Client action |
|------|-------------|---------------|
| 401 | Unauthorized | Prompt login; refresh token or re-auth |
| 403 | Forbidden - you do not own this theme | Hide action; return to list |
| 404 | Theme not found | Remove stale list item |
| 409 | Approved themes cannot be edited | Disable edit UI; offer delete + re-submit |
| 409 | Theme id already in use | Ask user to change `theme.json` id (BetterSEQTA) |
| 422 | `INVALID_THEME_STRUCTURE` | Show `error.details.errors` list |
| 422 | `UNKNOWN_THEME_TYPE` | Explain expected ZIP structure (link to docs) |
| 429 | Pending cap (5) | Block submit until a pending theme is approved/rejected/deleted |
| 429 | 10 uploads / 24h | Show retry later message |
| Network | — | Retry with backoff; preserve form state |

Parse validation responses:

```typescript
if (!response.success && response.error?.code === 'INVALID_THEME_STRUCTURE') {
  const errors = response.error.details?.errors as string[] ?? [];
  // render errors in upload UI
}
```

---

## Timestamp formatting

All theme `created_at`, `updated_at`, `published_at`, `reviewed_at` values are **Unix seconds**.

```typescript
function formatThemeDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString();
}
```

Do not treat them as ISO strings or milliseconds.

---

## Testing checklist

Use `pnpm cf:dev` with local D1 schema applied (`wrangler d1 execute bsplus-user-themes-db --local --file=server/database/user-themes/schema.sql`).

- [ ] **Auth:** extension login → `GET /api/custom-themes/mine` returns 200
- [ ] **Submit BetterSEQTA:** valid ZIP → `status: pending` in response
- [ ] **Submit DesQTA:** valid manifest ZIP → `theme_type: desqta`, pending
- [ ] **Public list:** pending theme **not** in `GET /api/custom-themes`
- [ ] **Admin approve:** `POST /api/admin/custom-themes/{id}/approve` (admin cookie)
- [ ] **Public list:** approved theme **appears** in `GET /api/custom-themes`
- [ ] **Download:** `GET …/download` increments count; BetterSEQTA returns `theme_json_url`
- [ ] **theme.json:** `GET /api/custom-themes/{id}/theme.json` returns valid JSON
- [ ] **Reject:** admin reject with reason → owner sees `rejection_reason` on `GET …/mine/{id}`
- [ ] **Re-upload:** `POST …/mine/{id}/files` → status back to `pending`, reason cleared
- [ ] **Metadata edit:** `PUT …/mine/{id}` on pending/rejected works; on approved returns 409
- [ ] **Delete:** `DELETE …/mine/{id}` removes theme; public list no longer shows it
- [ ] **Rate limits:** 6th concurrent pending or 11th upload in 24h returns 429
- [ ] **Isolation:** official `GET /api/themes` unchanged; no custom themes mixed in

### Admin API smoke test (no UI)

```bash
# List pending (admin session)
curl 'https://betterseqta.org/api/admin/custom-themes?status=pending' -H 'Cookie: auth_token=...'

# Approve
curl -X POST 'https://betterseqta.org/api/admin/custom-themes/{id}/approve' -H 'Cookie: auth_token=...'

# Reject
curl -X POST 'https://betterseqta.org/api/admin/custom-themes/{id}/reject' \
  -H 'Cookie: auth_token=...' \
  -H 'Content-Type: application/json' \
  -d '{"reason":"Does not meet quality guidelines."}'
```

---

## Implementation notes for Accounts site

- Place "My themes" under account settings or a dedicated `/account/themes` route.
- Reuse existing auth middleware / session handling; no new OAuth scopes.
- Upload component can mirror admin theme upload UI but POST to `/api/custom-themes/mine`.
- Show clear copy: community themes are moderated and separate from the official store.
- Slug is server-generated from name (conflicts get `-2`, `-3` suffix) — do not ask users for slug on create.

---

## Implementation notes for extension

- Add API module constants: `CUSTOM_THEMES_BASE = '/api/custom-themes'`.
- Cache public list with reasonable TTL; use `updated_at` for invalidation if needed.
- When applying theme JSON from custom endpoint, image URLs point at `/api/images/custom-themes/...` — existing image fetch should work.
- Keep official theme catalog on `/api/themes` unless product decision merges UI later (APIs remain separate).

---

## Questions / server changes

If the client needs additional fields or endpoints, extend [`docs/custom-themes-api.md`](custom-themes-api.md) and the Nitro handlers under `server/api/custom-themes/` — do not write to the official themes tables or main `DB`.
