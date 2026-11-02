# Contributing to BetterSEQTA+

Thanks for helping out! For anything bigger than a small fix, open an issue or ask in [Discord](https://discord.gg/YzmbnCDkat) first so we can agree on the approach.

## Setup

You need Node.js 26+, Git and a Chromium browser (Chrome, Edge or Brave).

```bash
git clone https://github.com/YOUR_USERNAME/BetterSEQTA-Plus
cd BetterSEQTA-Plus
npm install
npm run dev
```

Then load the extension:

1. Open `chrome://extensions` and turn on Developer mode.
2. Click **Load unpacked** and pick the `dist/chrome` folder.
3. Open a SEQTA Learn page.

For Firefox, run `npm run dev:firefox` and load `dist/firefox` from `about:debugging`.

## Project layout

| Path                                   | What's in it                                  |
| -------------------------------------- | --------------------------------------------- |
| `src/SEQTA.ts`                         | Content script entry point                    |
| `src/background.ts`, `src/background/` | Service worker                                |
| `src/seqta/`                           | Everything injected into SEQTA pages          |
| `src/interface/`                       | Settings popup and theme store (Svelte)       |
| `src/plugins/`                         | Plugin system and built-in plugins            |
| `src/css/`                             | Injected styles and the shared Tailwind setup |
| `lib/`, `scripts/`                     | Vite plugins and build scripts                |

The [architecture guide](https://docs.betterseqta.org/architecture/) goes into more detail.

## Making changes

1. Branch from `main`, e.g. `git checkout -b fix/timetable-colours`.
2. Keep each PR to one change and match the style of the surrounding code.
3. Add tests for logic changes.
4. Before opening the PR, check everything passes:

   ```bash
   npm run format
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```

5. Use short conventional commit messages: `feat:`, `fix:`, `chore:`, `docs:`.
6. Open the PR and fill in the template.

## Issues

Search [existing issues](https://github.com/BetterSEQTA/BetterSEQTA-Plus/issues) before opening a new one, and use the issue forms. [`good first issue`](https://github.com/BetterSEQTA/BetterSEQTA-Plus/labels/good%20first%20issue) and [`help wanted`](https://github.com/BetterSEQTA/BetterSEQTA-Plus/labels/help%20wanted) are good places to start. Issues aren't assigned, so just open a PR when you have a fix.

## More docs

- [Plugin development](https://docs.betterseqta.org/plugin-development/) and the [Plugin API](https://docs.betterseqta.org/plugin-api/)
- [Theme creation](https://docs.betterseqta.org/theme-creation/)
- [Troubleshooting](https://docs.betterseqta.org/troubleshooting/)
- [Releases and CI](docs/RELEASES.md)
