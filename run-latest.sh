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
# 2. Assume baseline tools (curl, unzip, grep, sed, cut, jq) are present on macOS
#    (All are standard on modern macOS; jq is present on recent versions.)
###############################################################################

# Note: Homebrew and e2fsprogs checks are performed by the launcher script.

###############################################################################
# 3. Fetch release metadata (version, asset URL)
###############################################################################
REPO="delaneyb/e2fsgui"
API_URL="https://api.github.com/repos/$REPO/releases/latest"

echo "Fetching latest release information from GitHub..."
RELEASE_INFO=$(curl -fsSL "$API_URL") || { echo "❌ Failed to fetch release info." >&2; exit 1; }

# Extract version tag
VERSION=$(echo "$RELEASE_INFO" | grep -m1 '"tag_name"' | sed -E 's/.*"tag_name": *"([^"]+)".*/\1/')
[ -n "$VERSION" ] || VERSION="(unknown)"

echo "Latest release identified: $VERSION"

# Extract first .zip asset download URL
ZIP_URL=$(echo "$RELEASE_INFO" | grep -m1 '"browser_download_url": ".*\.zip"' | sed -E 's/.*"browser_download_url": *"([^"]+)".*/\1/')
[ -n "$ZIP_URL" ] || { echo "❌ Failed to find zip asset in latest release." >&2; exit 1; }

echo "ZIP asset URL: $ZIP_URL"

###############################################################################
# 4. Download and extract the release to a fixed temporary location
###############################################################################
FIXED_TMP_BASE="/tmp/e2fsgui-latest"
mkdir -p "$FIXED_TMP_BASE"

ZIP_PATH="$FIXED_TMP_BASE/e2fsgui-$VERSION.zip"
EXTRACT_DIR="$FIXED_TMP_BASE/e2fsgui-$VERSION"

if [ -f "$ZIP_PATH" ]; then
  echo "✅ Using cached ZIP: $ZIP_PATH"
else
  echo "⬇️  Downloading release $VERSION..."
  curl -L -# -o "$ZIP_PATH" "$ZIP_URL"
  echo "✅ Download complete."
fi

if [ -d "$EXTRACT_DIR" ]; then
  echo "✅ Using cached extraction: $EXTRACT_DIR"
else
  echo "📂 Extracting archive..."
  rm -rf "$EXTRACT_DIR"
  mkdir -p "$EXTRACT_DIR"
  unzip -q "$ZIP_PATH" -d "$EXTRACT_DIR"
  echo "✅ Extraction complete."
fi

###############################################################################
# 5. Locate and run the launcher script
###############################################################################
LAUNCHER=$(find "$EXTRACT_DIR" -name e2fsprogs -type f -perm +111 | head -n1 || true)
[ -x "$LAUNCHER" ] || { echo "❌ Launcher script 'e2fsprogs' not found in archive." >&2; exit 1; }

chmod +x "$LAUNCHER"
echo -e "\033[34m🚀 $LAUNCHER:\033[0m"
"$LAUNCHER" "$@"

echo "e2fsgui exited." 