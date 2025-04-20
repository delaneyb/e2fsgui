# Linux Disk Browser (macOS)

A lightweight Electron application to **browse, read and rescue files** from Linux ext2/3/4 disks on macOS using the `e2fsprogs` tool‑chain.

![screenshot](https://raw.githubusercontent.com/delaneyb/e2fsgui/main/.github/screenshot.png)

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
```

### Manual make / publish

```bash
# Build signed + notarised DMG locally (macOS only)
npm run make        # -> out/make/*.dmg

# Publish the artifacts to GitHub (needs GITHUB_TOKEN)
npm run publish
```

---

## Automated Releases with GitHub Actions

This project uses **GitHub Actions** to automatically build, sign, notarize, and publish macOS `.dmg` releases when you push a version tag.

### How it works
- When you push a tag like `v1.2.3` to GitHub, the workflow in `.github/workflows/build.yml` runs on a macOS runner.
- The workflow:
  1. Installs dependencies
  2. Builds, signs, and notarizes the app using your Apple credentials
  3. Uploads the `.dmg` as a draft release on GitHub

### Required Secrets
You must set the following **repository secrets** (in Settings → Secrets and variables → Actions):
- `MAC_CODESIGN_IDENTITY` — e.g. `Developer ID Application: Your Name (TEAMID)`
- `APPLE_ID` — your Apple Developer email
- `APPLE_PASSWORD` — app-specific password from https://appleid.apple.com
- `APPLE_TEAM_ID` — your 10-character Apple Team ID

#### Setting secrets with the GitHub CLI
You can set these secrets from your terminal (in your repo directory) using the [GitHub CLI](https://cli.github.com/):

```bash
gh secret set MAC_CODESIGN_IDENTITY -b"Developer ID Application: Your Name (TEAMID)"
gh secret set APPLE_ID -b"your@email.com"
gh secret set APPLE_PASSWORD -b"your-app-specific-password"
gh secret set APPLE_TEAM_ID -b"52G288JVFT"
```

### How to trigger a release
1. Bump the version and create a tag:
   ```bash
   npm run version
   git push --follow-tags
   ```
2. The workflow will run and create a draft release with the DMG attached.

### How to build locally
- You can always build and sign locally (requires your Apple credentials as env vars):
  ```bash
  npm run make
  ```
- To publish a release from your machine (needs the same env vars):
  ```bash
  npm run publish
  ```

---

## Setting GitHub Actions Secrets

If you push a tag and the required secrets are missing, the GitHub Actions workflow will fail early and print a clear error message. It will instruct you to:

1. Populate a `.env` file from `.env.example` with your Apple credentials.
2. Run:
   ```bash
   gh secret set -f .env
   ```
   in your repository directory to set all required secrets at once.

> **Note:** Replace all placeholder values (like `Your Name`, `TEAMID`, `XXXXXXXXXX`) with your actual Apple Developer details. GitHub Actions secrets are always scoped to a specific repository (or organization, if set at that level). They are not global to your account. The `gh secret set -f .env` command, when run in a repo directory, sets secrets for that repo only.

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
