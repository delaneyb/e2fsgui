#!/usr/bin/env bash
# Quick installer/runner for the latest e2fsgui release.
# Run with: curl -fsSL https://cdn.jsdelivr.net/gh/delaneyb/e2fsgui/main/run-latest.sh | bash

set -euo pipefail

###############################################################################
# 1. Ensure we are NOT running as root (Homebrew refuses to run as root)
###############################################################################
if [ "$(id -u)" -eq 0 ]; then
  echo "🚫 This script should NOT be run with sudo. Please run it as a normal user." >&2
  exit 1
fi

###############################################################################
# 2. Ensure baseline tools (curl, jq, unzip, brew) are available
###############################################################################
need() { command -v "$1" >/dev/null 2>&1 || { echo "❌ Missing dependency: $1" >&2; exit 1; }; }

need curl
need jq
need unzip

echo "Checking Homebrew installation..."
if command -v brew >/dev/null 2>&1; then
  echo "✅ Homebrew found."
else
  echo "Homebrew not found."
  read -r -p "Homebrew is required. Install it now? [y/N] " ans
  if [[ $ans =~ ^[Yy]$ ]]; then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    eval "$($(command -v brew) shellenv)"
  else
    echo "🚫 Aborting. Homebrew is required." >&2
    exit 1
  fi
fi

echo "Checking for e2fsprogs (debugfs)..."
if ! brew ls --versions e2fsprogs >/dev/null 2>&1; then
  read -r -p "e2fsprogs not found. Install via Homebrew now? [y/N] " ans
  if [[ $ans =~ ^[Yy]$ ]]; then
    echo "Installing e2fsprogs via Homebrew..."
    brew install e2fsprogs
  else
    echo "🚫 Aborting. e2fsprogs is required." >&2
    exit 1
  fi
else
  echo "e2fsprogs already installed. ✅"
fi

###############################################################################
# 4. Fetch release metadata (version, notes, asset URL)
###############################################################################
REPO="delaneyb/e2fsgui"
API_URL="https://api.github.com/repos/$REPO/releases/latest"

echo "Fetching latest release information from GitHub..."
RELEASE_INFO=$(curl -fsSL "$API_URL")
[ -n "$RELEASE_INFO" ] || { echo "❌ Failed to fetch release info." >&2; exit 1; }

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

[ -n "$ZIP_URL" ] && [ "$ZIP_URL" != "null" ] || { echo "❌ Failed to find zip asset in latest release." >&2; exit 1; }
echo "ZIP asset URL: $ZIP_URL"

###############################################################################
# 5. Download and extract the release to a fixed temporary location
###############################################################################
# Use a fixed path in /tmp for potential caching between runs
FIXED_TMP_BASE="/tmp/e2fsgui-latest"
mkdir -p "$FIXED_TMP_BASE"

ZIP_PATH="$FIXED_TMP_BASE/e2fsgui-$VERSION.zip"
EXTRACT_DIR="$FIXED_TMP_BASE/e2fsgui-$VERSION"

# Download if version-specific zip doesn't exist
if [ -f "$ZIP_PATH" ]; then
  echo "✅ Using cached ZIP: $ZIP_PATH"
else
  echo "⬇️  Downloading release $VERSION (progress bar below)..."
  curl -L -# -o "$ZIP_PATH" "$ZIP_URL"
  echo "✅ Download complete."
fi

# Extract if version-specific extraction dir doesn't exist
if [ -d "$EXTRACT_DIR" ]; then
  echo "✅ Using cached extraction: $EXTRACT_DIR"
else
  echo "📂 Extracting archive..."
  # Ensure clean extraction target dir
  rm -rf "$EXTRACT_DIR"
  mkdir -p "$EXTRACT_DIR"
  unzip -q "$ZIP_PATH" -d "$EXTRACT_DIR"
  echo "✅ Extraction complete."
fi

###############################################################################
# 6. Locate and run the launcher script
###############################################################################
# Note: find now searches within the version-specific EXTRACT_DIR
LAUNCHER=$(find "$EXTRACT_DIR" -name e2fsprogs -type f -perm +111 | head -n1 || true)
[ -x "$LAUNCHER" ] || { echo "❌ Launcher script 'e2fsprogs' not found in archive." >&2; exit 1; }

chmod +x "$LAUNCHER"
echo -e "\033[34m🚀 $LAUNCHER:\033[0m"
"$LAUNCHER" "$@"

# No automatic cleanup of FIXED_TMP_BASE - relies on OS /tmp cleanup
echo "e2fsgui exited." 