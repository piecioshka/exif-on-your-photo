<div align="center">

<img src="./icons/app-icon.png" alt="EXIF on your photo" width="160" height="160">

</div>

# EXIF on your photo 📸

Burn your camera settings onto the photo, the way film labs used to print them.

## Preview 🎉

![Three photos with their shooting settings burned in](./screenshots/preview.png)

![The empty state, waiting for photos](./screenshots/preview-empty.png)

[Watch the 30 second demo](./demo/demo.mp4) to see a batch go through every
typeface, a caption size change and a save.

## Download 📦

Grab the latest build from the [releases page](https://github.com/piecioshka/exif-on-your-photo/releases/latest).

| Platform | File                                                                                                                                                                                                                                            |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| macOS    | [Apple silicon](https://github.com/piecioshka/exif-on-your-photo/releases/latest/download/EXIF.on.your.photo-1.0.0-arm64.dmg) · [Intel](https://github.com/piecioshka/exif-on-your-photo/releases/latest/download/EXIF.on.your.photo-1.0.0.dmg) |
| Windows  | [Installer](https://github.com/piecioshka/exif-on-your-photo/releases/latest/download/EXIF.on.your.photo.Setup.1.0.0.exe) · [Portable](https://github.com/piecioshka/exif-on-your-photo/releases/latest/download/EXIF.on.your.photo.1.0.0.exe)  |
| Linux    | [AppImage](https://github.com/piecioshka/exif-on-your-photo/releases/latest/download/EXIF.on.your.photo-1.0.0.AppImage) · [deb](https://github.com/piecioshka/exif-on-your-photo/releases/latest/download/exif-on-your-photo_1.0.0_amd64.deb)   |

> [!NOTE]
> The builds are not code signed. macOS will refuse the first launch, so open
> the app from the context menu once ("Open" instead of a double click), and
> Windows will show a SmartScreen warning behind "More info".

## Features

- 📷 Reads focal length, aperture, shutter speed and ISO straight out of the file's EXIF
- 🖋️ Prints them onto the photo in one of four serif faces (_Cochin, Baskerville, Didot, Optima_)
- 📐 Keeps the original dimensions or scales down to Full HD
- 🎚️ Caption size and JPEG quality are yours to set
- 🗂️ Takes a whole batch at once, every photo with its own preview
- 💾 Writes to a `WITH_EXIF` directory next to the originals, which stay untouched
- 🔌 Works entirely offline - nothing is uploaded, no account, no telemetry
- 🛡️ Sandboxed renderer with no access to Node.js (Electron 43)

## Requirements

macOS, Windows or Linux.

The four caption faces ship with macOS. Elsewhere the system substitutes
whatever serif it has, so the captions stay readable but the lettering differs.

## Development

```bash
npm install
npm start
npm test
```

Packaging uses [electron-builder](https://www.electron.build/), one script per
platform. Each one writes to `dist/`:

```bash
npm run build:mac
npm run build:win
npm run build:linux
```

Pushing a `v*` tag builds all three on their own runners and attaches the
installers to a GitHub release.

## License

[The MIT License](https://piecioshka.mit-license.org) @ 2026
