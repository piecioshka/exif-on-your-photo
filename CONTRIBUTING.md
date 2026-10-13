# Contributing

## Requirements

- Node.js from `.nvmrc`
- macOS, Windows or Linux

## Setup

```bash
npm install
npm start
```

## Scripts

| Command                | What it does                                       |
| ---------------------- | -------------------------------------------------- |
| `npm start`            | Runs the app from source                           |
| `npm test`             | Unit tests (Vitest)                                |
| `npm run test:watch`   | Unit tests in watch mode                           |
| `npm run build:mac`    | macOS installers into `dist/`                      |
| `npm run build:win`    | Windows installer and portable `.exe` into `dist/` |
| `npm run build:linux`  | AppImage and `.deb` into `dist/`                   |
| `npm run build`        | All three platforms at once                        |
| `npm run format`       | Prettier                                           |
| `npm run format:check` | Checks formatting without writing                  |

Packaging uses [electron-builder](https://www.electron.build/) (`electron-builder.yml`).

## Project structure

| Path                                      | What it does                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| `main.js`                                 | Electron main process: the window, reading EXIF with `exifr`, writing files to `WITH_EXIF` |
| `preload.js`                              | Exposes `window.photoApi` to the sandboxed renderer through `contextBridge`                |
| `renderer.js`, `index.html`, `styles.css` | The UI: previews, settings and drawing the caption on a canvas                             |
| `lib/photo-text.js`                       | Pure helpers shared by both processes, unit tested in `tests/`                             |

The renderer runs sandboxed without Node.js: everything that touches the disk goes through `window.photoApi`. A sandboxed preload may only `require` `electron`, `events`, `timers` and `url`, anything else breaks the whole script. `lib/photo-text.js` is loaded with a plain `<script>` tag, because ES modules over `file://` are blocked in Chromium.

## CI

GitHub Actions workflow `.github/workflows/ci.yml` checks formatting and runs the tests on every push and pull request.

`.github/workflows/release.yml` builds the installers on native runners and verifies the macOS ad-hoc signature. Started by hand from the Actions tab, it only uploads the installers as workflow artifacts:

- `macos-latest` -> `npm run build:mac`
- `windows-latest` -> `npm run build:win`
- `ubuntu-latest` -> `npm run build:linux`

## Release

```bash
npm version patch
git push --follow-tags
```

`npm version` bumps `package.json` and creates the `vX.Y.Z` tag. A pushed tag runs the release workflow: the `release` job checks that the tag matches the `package.json` version and publishes the installers from all three platforms as a GitHub release.
