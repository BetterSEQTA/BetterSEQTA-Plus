# Extension Themes API

This document describes the API for BetterSEQTA extension themes, including admin upload, theme list/download, and authentication.

## Overview

- **BetterSEQTA themes** (extension): Folder with `theme.json` (id, name, description, CustomCSS, etc.) and optional `images/banner.webp`, `images/marquee.webp`.
- **DesQTA themes** (web/desktop): ZIP with `theme-manifest.json` + `styles/` (existing flow).

The store supports both types. Admin uploads detect the type automatically.

### Response envelope

Successful JSON responses generally follow this shape:

```json
{
  "success": true,
  "data": { },
  "error": null,
  "meta": { "timestamp": 1234567890123, "version": "1.0.0" }
}
```

Errors may return `success: false`, `data: null`, and an `error` object with `code`, `message`, and optional `details`.

### Timestamps

Where present, `created_at`, `updated_at`, and `published_at` are **Unix time in seconds** (integers). **`updated_at`** is the last modification time for the theme row (metadata, files, approval, etc., depending on server logic). Use `updated_at * 1000` if you need a JavaScript `Date`.

---

## 1. Admin Upload

**Endpoint:** `POST /api/admin/themes`

**Authentication:** Admin (cookie or Bearer token)

**Request:** `multipart/form-data` with either:
- `theme_zip` or `theme_folder`: ZIP file containing a theme folder

**Type detection:**
- **betterseqta**: ZIP contains `theme.json` at root with `CustomCSS`, `id`, `name`; no `theme-manifest.json`, no `styles/`
- **desqta**: ZIP contains `theme-manifest.json` + `styles/`

**BetterSEQTA folder structure:**
```
theme-folder/
  theme.json          # Required: id, name, description, CustomCSS
  images/
    banner.webp       # Optional
    marquee.webp      # Optional
```

**theme.json schema (BetterSEQTA):**
```json
{
  "id": "uuid",
  "name": "Theme Name",
  "description": "Description",
  "CustomCSS": ":root { ... }",
  "defaultColour": "rgb(93, 93, 93)",
  "CanChangeColour": true,
  "coverImage": "base64 or path",
  "images": []
}
```

**Response (success, BetterSEQTA):**
```json
{
  "success": true,
  "data": {
    "theme": {
      "id": "...",
      "name": "...",
      "slug": "...",
      "theme_type": "betterseqta",
      "theme_json_url": "https://betterseqta.org/api/themes/{id}/theme.json",
      "cover_image_url": "https://...",
      "marquee_image_url": "https://..."
    },
    "validation": { "valid": true, "warnings": [], "errors": [] }
  },
  "error": null,
  "meta": { "timestamp": 0, "version": "1.0.0" }
}
```

**Response (success, DesQTA):**
```json
{
  "success": true,
  "data": {
    "theme": {
      "id": "...",
      "name": "...",
      "slug": "...",
      "preview_thumbnail_url": "https://...",
      "zip_download_url": "https://...",
      "file_size": 12345,
      "checksum": "..."
    },
    "validation": { "valid": true, "warnings": [], "errors": [] }
  },
  "error": null,
  "meta": { "timestamp": 0, "version": "1.0.0" }
}
```

---

## 2. Theme List

**Endpoint:** `GET /api/themes`

**Query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `type` | string | `betterseqta` \| `desqta` — filter by theme type (omit for all) |
| `page` | number | Page number (default `1`) |
| `limit` | number | Items per page (default `20`, max `100`) |
| `category` | string | Filter by category |
| `tags` | string | Comma-separated tags (match if any tag matches) |
| `search` | string | Search name, description, author |
| `sort` | string | `popular` \| `newest` \| `rating` \| `downloads` \| `name` |
| `featured` | string | `true` — only featured themes |
| `min_rating` | number | Minimum `rating_average` |
| `compatible_version` | string | Filter by `compatibility_min` (simple string compare) |

**Example:** `GET /api/themes?type=betterseqta`

**Common fields on every listed theme**

All themes include at least:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Theme UUID |
| `slug` | string | URL slug |
| `name` | string | Display name |
| `version` | string | Theme version |
| `description` | string | Description |
| `author` | string | Author |
| `license` | string | License |
| `category` | string \| null | Category |
| `tags` | string[] | Tags |
| `status` | string | e.g. `approved` (list is approved-only) |
| `featured` | boolean | Featured flag |
| `download_count` | number | Downloads |
| `favorite_count` | number | Favorites |
| `rating_average` | number | Average rating |
| `rating_count` | number | Number of ratings |
| `compatibility` | object | `{ "min": string, "max"?: string }` |
| `preview` | object | `{ "thumbnail": string \| null, "screenshots": string[] }` |
| `created_at` | number | Unix seconds |
| `updated_at` | number | Unix seconds — **last update** |
| `published_at` | number \| null | Unix seconds |
| `file_size` | number \| null | Package size (bytes) where applicable |
| `is_favorited` | boolean | Present when authenticated |
| `user_rating` | object \| null | `{ "rating": number, "comment": string \| null }` when authenticated |

**`theme_type`: `betterseqta`** — additional fields:

| Field | Description |
|-------|-------------|
| `coverImage` | Banner image URL |
| `marqueeImage` | Marquee image URL |
| `theme_json_url` | URL for `theme.json` |

**`theme_type`: `desqta`** — no `coverImage` / `marqueeImage` / `theme_json_url` on the list item; use detail endpoints for ZIP URL.

**Response (example — BetterSEQTA item, illustrative):**
```json
{
  "success": true,
  "data": {
    "themes": [
      {
        "id": "9a9786d1-b5fc-4a91-8c7a-f8bf7f7679ad",
        "slug": "neumorphic",
        "name": "Neumorphic",
        "version": "1.0.0",
        "description": "...",
        "author": "...",
        "license": "MIT",
        "category": null,
        "tags": [],
        "status": "approved",
        "featured": false,
        "download_count": 1234,
        "favorite_count": 56,
        "rating_average": 4.5,
        "rating_count": 12,
        "compatibility": { "min": "1.0.0", "max": null },
        "preview": { "thumbnail": "https://...", "screenshots": [] },
        "created_at": 1700000000,
        "updated_at": 1700100000,
        "published_at": 1700050000,
        "file_size": null,
        "is_favorited": false,
        "user_rating": null,
        "theme_type": "betterseqta",
        "coverImage": "https://betterseqta.org/api/images/themes/{id}/images/banner.webp",
        "marqueeImage": "https://betterseqta.org/api/images/themes/{id}/images/marquee.webp",
        "theme_json_url": "https://betterseqta.org/api/themes/{id}/theme.json"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 10,
      "total_pages": 1,
      "has_next": false,
      "has_prev": false
    }
  },
  "error": null,
  "meta": { "timestamp": 0, "version": "1.0.0" }
}
```

---

## 3. Theme Detail

Public detail responses use the same core shape for both theme types (`formatPublicTheme` on the server). **`updated_at`** / **`created_at`** / **`published_at`** are always included when present in the database.

### By ID

**Endpoint:** `GET /api/themes/[id]`

### By slug

**Endpoint:** `GET /api/themes/by-slug/[slug]`

Use URL encoding for the slug (e.g. spaces as `%20`). The response body matches **`GET /api/themes/[id]`** for the resolved theme.

**Response (BetterSEQTA — illustrative):**
```json
{
  "success": true,
  "data": {
    "theme": {
      "id": "...",
      "slug": "...",
      "name": "...",
      "version": "...",
      "description": "...",
      "author": "...",
      "license": "MIT",
      "category": null,
      "tags": [],
      "status": "approved",
      "featured": false,
      "download_count": 1234,
      "favorite_count": 56,
      "rating_average": 4.5,
      "rating_count": 12,
      "compatibility": { "min": "1.0.0", "max": null },
      "preview": {
        "thumbnail": "https://...",
        "screenshots": []
      },
      "created_at": 1700000000,
      "updated_at": 1700100000,
      "published_at": 1700050000,
      "is_favorited": false,
      "theme_type": "betterseqta",
      "coverImage": "https://...",
      "marqueeImage": "https://...",
      "theme_json_url": "https://betterseqta.org/api/themes/{id}/theme.json"
    }
  },
  "error": null,
  "meta": { "timestamp": 0, "version": "1.0.0" }
}
```

**Response (DesQTA — illustrative):**
```json
{
  "success": true,
  "data": {
    "theme": {
      "id": "...",
      "slug": "...",
      "name": "...",
      "version": "...",
      "description": "...",
      "author": "...",
      "license": "MIT",
      "category": null,
      "tags": [],
      "status": "approved",
      "featured": false,
      "download_count": 100,
      "favorite_count": 5,
      "rating_average": 0,
      "rating_count": 0,
      "compatibility": { "min": "1.0.0", "max": null },
      "preview": { "thumbnail": "https://...", "screenshots": [] },
      "created_at": 1700000000,
      "updated_at": 1700100000,
      "published_at": null,
      "is_favorited": false,
      "theme_type": "desqta",
      "preview_thumbnail_url": "https://...",
      "zip_download_url": "https://...",
      "file_size": 12345,
      "checksum": "...",
      "manifest": {
        "name": "...",
        "version": "...",
        "description": "...",
        "author": "...",
        "license": "MIT",
        "compatibility": { "minVersion": "...", "maxVersion": "..." },
        "preview": { "thumbnail": "...", "screenshots": [] }
      }
    }
  },
  "error": null,
  "meta": { "timestamp": 0, "version": "1.0.0" }
}
```

---

## 4. Theme Download

**Endpoint:** `GET /api/themes/[id]/download`

**Behavior:** Increments `download_count` for the theme and returns the appropriate URL(s).

**Response (BetterSEQTA):**
```json
{
  "success": true,
  "data": {
    "theme_json_url": "https://betterseqta.org/api/themes/{id}/theme.json",
    "download_count": 1235
  },
  "error": null,
  "meta": { "timestamp": 0, "version": "1.0.0" }
}
```

**Response (DesQTA):**
```json
{
  "success": true,
  "data": {
    "zip_download_url": "https://...",
    "checksum": "...",
    "file_size": 12345
  },
  "error": null,
  "meta": { "timestamp": 0, "version": "1.0.0" }
}
```

**Extension flow (BetterSEQTA):**
1. Call `GET /api/themes/[id]/download`
2. Receive `theme_json_url` and updated `download_count`
3. Fetch `theme.json` from that URL
4. Apply theme (same method as before, different host)

---

## 5. Serve theme.json

**Endpoint:** `GET /api/themes/[id]/theme.json`

**Behavior:** Returns the raw `theme.json` file for BetterSEQTA themes. No auth required.

**Response:** `application/json` — the theme.json content.

---

## 6. Auth for Extension

Extensions (and DesQTA) use username/password to get a token directly — no OAuth redirect, no Discord.

### Login

**Endpoint:** `POST /api/auth/extension/login`

**Request:**
```json
{
  "username": "user",
  "password": "secret"
}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "expires_in": 3600
}
```

### Using the token

Send `Authorization: Bearer <token>` on API calls:

```
GET /api/themes?type=betterseqta
Authorization: Bearer eyJ...
```

`GET /api/auth/me` also accepts `Authorization: Bearer <token>` in addition to the `auth_token` cookie.

---

## 7. Unified Theme APIs

| API | Notes |
|-----|--------|
| `GET /api/themes` | `?type=betterseqta` \| `desqta`; list includes `theme_type`, timestamps, ratings, `updated_at`, etc. |
| `GET /api/themes/[id]` | Full public theme object; BetterSEQTA: `coverImage`, `marqueeImage`, `theme_json_url` |
| `GET /api/themes/by-slug/[slug]` | Same body as `GET /api/themes/[id]` |
| `GET /api/themes/[id]/user-status` | Works for both types |
| `POST /api/themes/[id]/favorite` | Works for both types |
| `DELETE /api/themes/[id]/favorite` | Works for both types |
| `GET /api/themes/[id]/download` | **betterseqta**: `theme_json_url` + `download_count`; **desqta**: `zip_download_url`, `checksum`, `file_size` |

### Other public theme endpoints (same JSON conventions)

- `GET /api/themes/search` — search with query parameters (includes `updated_at` on hits where returned).
- `GET /api/themes/spotlight` — featured/spotlight list.
- `GET /api/themes/favorites` — authenticated user favorites (includes `updated_at` per theme).

---

## 8. Example Requests

### List BetterSEQTA themes
```bash
curl "https://betterseqta.org/api/themes?type=betterseqta"
```

### Theme detail by slug
```bash
curl "https://betterseqta.org/api/themes/by-slug/my-theme-slug"
```

### Download theme (get URL)
```bash
curl "https://betterseqta.org/api/themes/9a9786d1-b5fc-4a91-8c7a-f8bf7f7679ad/download"
```

### Fetch theme.json
```bash
curl "https://betterseqta.org/api/themes/9a9786d1-b5fc-4a91-8c7a-f8bf7f7679ad/theme.json"
```

### Extension login
```bash
curl -X POST "https://betterseqta.org/api/auth/extension/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"secret"}'
```

### Authenticated request
```bash
curl "https://betterseqta.org/api/themes?type=betterseqta" \
  -H "Authorization: Bearer <access_token>"
```
