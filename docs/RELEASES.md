# Releases, CI and the update badge

BetterSEQTA+ ships through the Chrome Web Store and Firefox Add-ons. GitHub also hosts sideload builds, and those builds can tell users when a newer one is out. This page covers how all of that is built.

## Workflows

| Workflow                                          | Runs on                                                          | What it does                                                                  |
| ------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [`pr-ci.yml`](../.github/workflows/pr-ci.yml)     | Every pull request and push to `main`                            | Lint, unit tests, then build and smoke test. Uploads the zips as an artifact. |
| [`nightly.yml`](../.github/workflows/nightly.yml) | Daily at 13:30 UTC (midnight in Adelaide during daylight saving) | Builds `main` and replaces the assets on the `nightly` prerelease.            |

Both build through the shared [`build-extension`](../.github/actions/build-extension/action.yml) action: install with `npm ci`, run `npm run build` for Chrome and Firefox, then zip `dist/chrome` and `dist/firefox`. Nightly publishes with the default `GITHUB_TOKEN`, so it needs no extra secrets.

## Publishing a stable release

Stable releases are published by hand:

1. Bump `version` in `package.json` on `main` and push it.
2. Build with the update checker, then zip:

   ```bash
   GH_RELEASE_UPDATE_CHECK=true UPDATE_CHANNEL=stable npm run build
   npm run zip
   ```

3. Run `npm run release`. It creates the release for that version with generated notes and uploads `betterseqtaplus@{version}-chrome.zip` and `-firefox.zip`.

## Nightly builds

The `nightly` tag always points at the latest build of `main`. Each run renames the release to `Nightly (YYYY-MM-DD)` and replaces its zips (`betterseqtaplus-nightly-{date}-chrome.zip` and `-firefox.zip`). The release text comes from [`nightly-release-notes.md`](../.github/nightly-release-notes.md) when the release is first created.

Get it from [releases/tag/nightly](https://github.com/BetterSEQTA/BetterSEQTA-Plus/releases/tag/nightly).

GitHub builds are for sideloading only. Never upload them to an extension store.

## Build-time flags

Release builds pass these into Vite, which bakes them in through `define` in [`vite.config.ts`](../vite.config.ts). Their types live in [`src/env.d.ts`](../src/env.d.ts).

| Variable                  | Stable                         | Nightly        | PRs and local builds |
| ------------------------- | ------------------------------ | -------------- | -------------------- |
| `GH_RELEASE_UPDATE_CHECK` | `true`                         | `true`         | unset                |
| `UPDATE_CHANNEL`          | `stable`                       | `nightly`      | unset                |
| `GH_RELEASE_REPO`         | `BetterSEQTA/BetterSEQTA-Plus` | same           | same                 |
| `BUILD_LABEL`             | empty                          | UTC build date | empty                |

Without `GH_RELEASE_UPDATE_CHECK=true`, the update checker is removed from the bundle entirely.

## Update badge

Release builds show an amber **Update — {version}** pill at the bottom of the settings sidebar when a newer build exists. Clicking it opens the releases page. The logic is in [`src/utils/githubReleaseUpdate.ts`](../src/utils/githubReleaseUpdate.ts):

- **Stable** compares the highest semver release tag (ignoring `nightly`) with the installed version.
- **Nightly** compares the `nightly` release's publish time with the last one seen, stored as `lastSeenNightlyPublishedAt`. The first check after install only records it.

Checks run at most every 6 hours (`localStorage` key `bsplus_lastGhReleaseCheck`).

To test the badge without publishing, turn on dev mode (click the settings logo and type `dev`), then set **GitHub latest version override** in the Advanced section to a higher version such as `9.9.9`.
