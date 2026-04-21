---
name: theme-authoring
description: Creates BetterSEQTA+ custom themes as `.theme.json` files for import or publishing to the BetterSEQTA theme store. Use when the user asks to make a new theme, adjust theme colors/CSS, or prepare a theme JSON for upload.
---

# Theme authoring (BetterSEQTA+)

## Goal
Produce a valid `*.theme.json` file that BetterSEQTA+ can install (via theme import or store download).

## Output contract
Return:
- The final theme JSON (ready to save as `my-theme.theme.json`)
- A short list of the main palette values used (accent + background + text)

## Theme JSON schema (practical)
Required keys:
- `id`: string (stable identifier; use kebab-case, e.g. `banana-theme`)
- `name`: string (display name)
- `description`: string
- `defaultColour`: string CSS color (e.g. `rgb(...)` or `#RRGGBB`)
- `CanChangeColour`: boolean
- `CustomCSS`: string (CSS applied as a `<style>` tag)

Common optional keys:
- `hideThemeName`: boolean
- `forceTheme`: boolean (when true, the theme forces light/dark)
- `forceDark`: boolean (when forcing, `true` = dark, `false` = light)
- `images`: array of `{ id, variableName, data }` where `data` is base64 PNG (no prefix required, but allowed)
- `coverImage`: base64 image string (optional)
- `adaptiveCssVariables`: string[] (advanced; see below)

## Workflow
### 1) Pick a theme concept + palette
Decide:
- **Accent**: set as `defaultColour`
- **Surfaces**: `--background-primary`, `--background-secondary`
- **Text**: set `--theme-fg-parts` to a readable RGB triple

If the theme is intended to be “bright” and friendly, default to **forced light**:
- `forceTheme: true`, `forceDark: false`

If it’s intended to be “night/dark”, default to **forced dark**:
- `forceTheme: true`, `forceDark: true`

### 2) Write `CustomCSS`
Use a consistent, minimal set of overrides:
- In `:root` set:
  - `--background-primary`, `--background-secondary`
  - `--theme-offset-bg`, `--theme-offset-bg-more` (slightly darker/lighter than secondary)
  - `--theme-bg-parts`, `--theme-sel-bg-parts`, `--theme-fg-parts` (RGB triples)
- Set the page background on:
  - `html, body, #container, #content`
  - Use 2–3 subtle `radial-gradient(...)` layers + a `linear-gradient(...)`
  - Finish with `, var(--background) !important;` so custom backgrounds still work

Recommended template (edit values and gradient stops):

```json
{
  "id": "my-theme",
  "name": "My Theme",
  "description": "One-line vibe description.",
  "defaultColour": "rgb(123, 100, 200)",
  "CanChangeColour": true,
  "hideThemeName": false,
  "forceTheme": true,
  "forceDark": false,
  "CustomCSS": ":root {\\n  --background-primary: rgb(255, 255, 255) !important;\\n  --background-secondary: rgb(235, 235, 235) !important;\\n  --theme-offset-bg: rgb(245, 245, 245) !important;\\n  --theme-offset-bg-more: rgb(225, 225, 225) !important;\\n  --theme-bg-parts: 255, 255, 255 !important;\\n  --theme-sel-bg-parts: 123, 100, 200 !important;\\n  --theme-fg-parts: 20, 20, 20 !important;\\n}\\n\\nhtml,\\nbody,\\n#container,\\n#content {\\n  background-image:\\n    radial-gradient(circle at 18% 18%, rgb(123 100 200 / 20%) 0%, transparent 40%),\\n    radial-gradient(circle at 82% 78%, rgb(123 100 200 / 14%) 0%, transparent 46%),\\n    linear-gradient(145deg, rgb(255 255 255) 0%, rgb(245 245 245) 55%, rgb(235 235 235) 100%),\\n    var(--background) !important;\\n  background-size: auto, auto, auto, cover !important;\\n  background-position: center, center, center, center !important;\\n  background-repeat: no-repeat !important;\\n  background-attachment: fixed !important;\\n}\\n\"\n+}
```

### 3) Validate mentally (fast checks)
- **Contrast**: `--theme-fg-parts` must be readable on both primary and secondary backgrounds.
- **Forcing**: if `forceTheme: true`, ensure `forceDark` matches the palette.
- **No hard dependency on images** unless you include `images`.

### 4) Hand off
Name the file as: `<id>.theme.json` (e.g. `banana.theme.json`).

## Advanced: `adaptiveCssVariables` (optional)
Use only when you want the theme to react cleanly to **Adaptive Theme Colour** in BetterSEQTA+.

What it does:
- It requests the app to write values derived from the current `--better-main` into CSS custom properties you list.
- Supports channel bindings by suffix:
  - `--my-var:r` (red channel as `0..255`)
  - `--my-var:g` (green channel)
  - `--my-var:b` (blue channel)
  - `--my-var` (full colour string)

When to use:
- Your theme does math/mixing in CSS and needs stable numeric channels.

When NOT to use:
- Most themes. If your theme looks good with a fixed palette, omit it.

