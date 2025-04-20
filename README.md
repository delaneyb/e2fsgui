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

# Start the app
npm start
> On first run, you'll be prompted for your password to access disks via a system dialog
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

### Manual local build

```bash
# Build signed + notarised DMG locally (macOS only)
npm run make        # -> out/make/*.dmg
```

> **Note:** Local builds are for your own testing. Only the GitHub Actions workflow will publish a release to GitHub.

### How to trigger a release

To release a new version:

```bash
npm run version
```

This will:
- Bump the version, update the changelog, commit, and create a tag (using `standard-version`)
- **Automatically push the commit and tag to GitHub** (handled by the `postversion` script)
- Build the app locally for your own use

**You do NOT need to run `git push --follow-tags` manually.**

The push will trigger the GitHub Actions workflow, which will build, sign, notarize, and upload a draft release with the DMG attached.

> **How and why this works:**
> The `postversion` script in `package.json` runs automatically after `npm run version`. It pushes the commit and tag to GitHub, which triggers the release workflow. This ensures you never forget to push the tag, and keeps the process simple and reliable.

### How to build locally

You can always build and sign locally (requires your Apple credentials as env vars):
```bash
npm run make
```

This will NOT publish a release to GitHub; it only creates a DMG/ZIP for your own use.

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

## ⚠️ Important: PKCS#12 Certificate Format for macOS CI

> **Warning:**
>
> When using a PKCS#12 (.p12) certificate for code signing in GitHub Actions or other macOS CI, you may encounter the error:
>
>     security: SecKeychainItemImport: MAC verification failed during PKCS12 import (wrong password?)
>
> This is **not** usually a password issue, but a format compatibility problem. Modern PKCS#12 files (created by recent OpenSSL or Keychain) use strong encryption (AES, SHA256, etc.) that the `security` tool on macOS runners cannot always import. You must re-export your certificate in the **legacy** PKCS#12 format (using 3DES/SHA1) for reliable import.
>
> See: [Stack Overflow: MAC verification failed during PKCS12 import (wrong password?)](https://stackoverflow.com/questions/70431528/mac-verification-failed-during-pkcs12-import-wrong-password-azure-devops)
>
> **How to fix:**
> 1. Export your certificate and private key to PEM files.
> 2. Re-export as legacy PKCS#12 with:
>    ```sh
>    openssl pkcs12 -export -legacy -in yourcert.pem -inkey yourkey.key -out legacy.p12 -name "Your Name"
>    ```
> 3. Base64-encode the legacy `.p12` and use that for your CI secrets.
> 4. Use an empty password for the legacy `.p12` to simplify CI setup.
>
> This will prevent the import error and ensure smooth code signing in CI.

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
