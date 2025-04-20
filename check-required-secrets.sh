#!/bin/bash
# Checks for required GitHub Actions secrets. Used in workflow.

missing=()
[ -z "$MAC_CODESIGN_IDENTITY" ] && missing+=("MAC_CODESIGN_IDENTITY")
[ -z "$APPLE_ID" ] && missing+=("APPLE_ID")
[ -z "$APPLE_PASSWORD" ] && missing+=("APPLE_PASSWORD")
[ -z "$APPLE_TEAM_ID" ] && missing+=("APPLE_TEAM_ID")
if [ ${#missing[@]} -ne 0 ]; then
  echo "::error::Missing required secrets: ${missing[*]}"
  echo "Populate a .env file from .env.example and run:"
  echo "  gh secret set -f .env"
  exit 1
fi 