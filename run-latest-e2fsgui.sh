#!/usr/bin/env bash
# Quick installer/runner for the latest e2fsgui release.
# Run with: curl -fsSL https://raw.githubusercontent.com/delaneyb/e2fsgui/main/run-latest-e2fsgui.sh | bash

set -euo pipefail

###############################################################################
# 1. Ensure we are NOT running as root (Homebrew refuses to run as root)
###############################################################################
if [ "$(id -u)" -eq 0 ]; then
  echo "This script should NOT be run with sudo. Please run it as a normal user." >&2
  exit 1
fi

###############################################################################
# 2. Ensure baseline tools (curl, jq, unzip, brew) are available
###############################################################################
need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing dependency: $1" >&2; exit 1; }; }

need curl
need jq
need unzip

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew not found – installing..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  eval "$($(command -v brew) shellenv)"
fi

###############################################################################
# 3. Ensure e2fsprogs (provides debugfs) is installed via Homebrew
###############################################################################
if ! brew ls --versions e2fsprogs >/dev/null 2>&1; then
  echo "Installing e2fsprogs via Homebrew..."
  brew install e2fsprogs
fi

###############################################################################
# 4. Fetch, download, and extract the latest release
###############################################################################
REPO="delaneyb/e2fsgui"
API_URL="https://api.github.com/repos/$REPO/releases/latest"

echo "Fetching latest release information from GitHub..."
RELEASE_INFO=$(curl -fsSL "$API_URL")
[ -n "$RELEASE_INFO" ] || { echo "Failed to fetch release info." >&2; exit 1; }

VERSION=$(echo "$RELEASE_INFO" | jq -r '.tag_name')
NOTES=$(echo "$RELEASE_INFO" | jq -r '.body')
ZIP_URL=$(echo "$RELEASE_INFO" | jq -r '.assets[] | select(.name|endswith(".zip")) | .browser_download_url')

[ -n "$VERSION" ] && [ "$VERSION" != "null" ] || VERSION="(unknown)"
echo "Latest release identified: $VERSION"

if [ -n "$NOTES" ] && [ "$NOTES" != "null" ]; then
  echo "---------------- Release Notes -----------------"
  echo "$NOTES"
  echo "----------------------------------------------"
fi

[ -n "$ZIP_URL" ] && [ "$ZIP_URL" != "null" ] || { echo "Failed to find zip asset in latest release." >&2; exit 1; }
echo "Download URL: $ZIP_URL"

echo "Downloading release $VERSION..."
TMPDIR=$(mktemp -d /tmp/e2fsgui.XXXXXX)
curl -L -# -o "$TMPDIR/app.zip" "$ZIP_URL"
unzip -q "$TMPDIR/app.zip" -d "$TMPDIR"

###############################################################################
# 5. Locate and run the launcher script inside the extracted directory
###############################################################################
LAUNCHER=$(find "$TMPDIR" -name e2fsprogs -type f -perm +111 | head -n1 || true)
[ -x "$LAUNCHER" ] || { echo "Launcher script 'e2fsprogs' not found in archive." >&2; exit 1; }

chmod +x "$LAUNCHER"
echo "Starting e2fsgui $VERSION..."
"$LAUNCHER" "$@"

echo "e2fsgui exited. Cleaning up..."
rm -rf "$TMPDIR" 