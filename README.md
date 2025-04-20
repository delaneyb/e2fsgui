# Linux Disk Browser (macOS)

A lightweight Electron application to **browse, read and rescue files** from Linux ext2/3/4 disks on macOS using the `e2fsprogs` tool‑chain.

![screenshot](https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/e2fs-gui/main/.github/screenshot.png)

---

## Features

* Automatically detects ext2/3/4 partitions plugged into your Mac.
* Browse directories, preview sizes, sort by name/size.
* Copy out individual files **or whole directories** to your macOS file‑system preserving ownership.
* No kernel extensions – works entirely through `debugfs` from **e2fsprogs** installed via Homebrew.
* Built with **Vue 3** + **Electron** – single, self‑contained `.app` delivered in a signed DMG.

---

## Getting Started (Developers)

```bash
# Install dependencies
npm install

# Start the app (requires root for disk access)
sudo npm start
```

The application expects the [Homebrew](https://brew.sh) package **e2fsprogs** to be installed:

```bash
brew install e2fsprogs
```

---

## Packaging for Distribution

Packaging, signing and notarization is handled by **Electron Forge**.  The convenient script below will:

1. Bump the version _(via `standard-version`)_
2. Build the `.app` & DMG
3. Create / update a draft GitHub release with the generated artifacts

```bash
# Update CHANGELOG, tag & build, release
npm run version
```

### Required Environment Variables

Create a `.env` (or set these in your CI) based on the provided `.env.example`:

```env
MAC_CODESIGN_IDENTITY="Developer ID Application: Your Name (TEAMID)"
APPLE_ID="name@example.com"
APPLE_PASSWORD="app‑specific‑password"
APPLE_TEAM_ID="XXXXXXXXXX"
GITHUB_TOKEN="ghp_xxx"   # Fine grained PAT with repo access
```

### Manual make / publish

```bash
# Build signed + notarised DMG locally (macOS only)
npm run make        # -> out/make/*.dmg

# Publish the artifacts to GitHub (needs GITHUB_TOKEN)
npm run publish
```

---

## Continuous Delivery

A ready‑to‑use **GitHub Actions** workflow (`.github/workflows/build.yml`) automatically:

* Installs dependencies & caches `node_modules`
* Runs `npm run make` on `macos-latest`
* Uploads generated artifacts as release assets

Just push a new tag (created via `npm run version`) to trigger it.

---

## Folder Structure

```
├── index.html         # Renderer – Vue UI
├── main.js            # Electron main process
├── forge.config.js    # Packaging configuration (DMG, signing, notarisation)
├── resources/
│   ├── icon.icns      # App icon (placeholder)
│   └── entitlements.plist
└── .github/workflows/build.yml
```

---

## License

This project is released under the MIT license.

---

## Disclaimer

This tool **reads** disks – it does **not** write to Linux filesystems. However it still deals with low‑level disk access – use at your own risk!  Always work on **read‑only clones** when possible. 