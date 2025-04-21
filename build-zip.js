const fs = require('fs-extra')
const path = require('path')
const { execSync } = require('child_process')

const packageJson = require('./package.json')
const version = packageJson.version
const releaseDir = 'release'
const zipName = `e2fsgui-v${version}.zip`
const stagingDir = path.join(releaseDir, `e2fsgui-v${version}`)

const LAUNCHER_SCRIPT = `#!/bin/sh

# Prepend Homebrew e2fsprogs if available
if command -v brew >/dev/null 2>&1; then
  PREFIX=$(brew --prefix)
  export PATH="$PREFIX/opt/e2fsprogs/bin:$PREFIX/opt/e2fsprogs/sbin:$PATH"
fi

# Verify debugfs
if ! command -v debugfs >/dev/null 2>&1; then
  echo "Error: e2fsprogs (debugfs) not found. Install with: brew install e2fsprogs" >&2
  exit 1
fi

# Resolve directories
DIR="$(cd "$(dirname "$0")" && pwd)"
ELECTRON_DIST="$DIR/electron-dist/Electron.app"
ELECTRON_BIN="$ELECTRON_DIST/Contents/MacOS/Electron"
if [ ! -x "$ELECTRON_BIN" ]; then
  echo "Error: Electron binary not found at $ELECTRON_BIN" >&2
  exit 1
fi
APP_DIR="$DIR/app"

# Remove quarantine attribute which causes "app is damaged"
xattr -d com.apple.quarantine "$ELECTRON_DIST" "$APP_DIR"

# Launch with sudo for raw disk access
echo "Launching e2fsgui…"
exec sudo "$ELECTRON_BIN" "$APP_DIR" "$@"
`

async function build() {
	console.log(`Building release ZIP: ${zipName}...`)

	// Prepare release and staging directories
	await fs.ensureDir(releaseDir)
	await fs.emptyDir(releaseDir)
	await fs.ensureDir(stagingDir)

	// Copy Electron distribution, preserving symlinks
	const electronPath = path.dirname(require.resolve('electron'))
	const electronDistPath = path.join(electronPath, 'dist')
	if (!await fs.pathExists(electronDistPath)) {
		throw new Error(`Electron dist directory not found at ${electronDistPath}`)
	}
	console.log('Copying electron-dist...')
	await fs.copy(electronDistPath, path.join(stagingDir, 'electron-dist'), { dereference: false })

	// Copy application source
	console.log('Copying app source...')
	const appDest = path.join(stagingDir, 'app')
	await fs.ensureDir(appDest)
	for (const file of ['main.js', 'index.html', 'package.json']) {
		await fs.copy(file, path.join(appDest, file))
	}
	if (await fs.pathExists('resources')) {
		await fs.copy('resources', path.join(appDest, 'resources'))
	}

	// Copy instructions
	console.log('Copying INSTRUCTIONS.md...')
	await fs.copy('INSTRUCTIONS.md', path.join(stagingDir, 'INSTRUCTIONS.md'))

	// Create launcher script
	console.log('Creating launcher script...')
	await fs.writeFile(path.join(stagingDir, 'e2fsprogs'), LAUNCHER_SCRIPT, { mode: 0o755 })

	// Package with ditto to preserve macOS metadata
	console.log('Creating ZIP with ditto...')
	const zipPath = path.join(releaseDir, zipName)
	execSync(`ditto -c -k --sequesterRsrc --keepParent "${stagingDir}" "${zipPath}"`, { stdio: 'inherit' })

	console.log(`Created ${zipPath}`)
}

build().catch(err => {
	console.error('Build failed:', err)
	process.exit(1)
}) 