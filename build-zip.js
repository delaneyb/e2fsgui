const fs = require('fs-extra')
const path = require('path')
const { execSync } = require('child_process')

const packageJson = require('./package.json')
const version = packageJson.version
const releaseDir = 'release'
const zipName = `e2fsgui-v${version}.zip`
const stagingDir = path.join(releaseDir, `e2fsgui-v${version}`)

const LAUNCHER_SCRIPT = `#!/bin/sh

# Add Homebrew e2fsprogs to PATH if available
if command -v brew >/dev/null 2>&1; then
  PREFIX="$(brew --prefix)"
  export PATH="$PREFIX/opt/e2fsprogs/bin:$PREFIX/opt/e2fsprogs/sbin:$PATH"
fi

# Require debugfs
if ! command -v debugfs >/dev/null 2>&1; then
  echo "Error: e2fsprogs (debugfs) not found. Install with: brew install e2fsprogs" >&2
  exit 1
fi

DIR="$(cd "$(dirname "$0")" && pwd)"
ELECTRON_DIST="$DIR/electron-dist/Electron.app"
ELECTRON_BIN="$ELECTRON_DIST/Contents/MacOS/Electron"
APP_DIR="$DIR/app"

if [ ! -x "$ELECTRON_BIN" ]; then
  echo "Error: Electron binary not found: $ELECTRON_BIN" >&2
  exit 1
fi

# Remove quarantine attribute from Electron.app, ignore if not present
xattr -d com.apple.quarantine "$ELECTRON_DIST" 2>/dev/null || true

echo "e2fsgui needs root privileges (via sudo) to read raw disk devices."
echo "See README.md for details on why this is necessary."
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
	for (const file of ['main.js', 'index.html', 'package.json', 'debugfs-utils.js']) {
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
	// Ensure zipPath is absolute for the cd/ditto command
	const zipPathAbs = path.resolve(releaseDir, zipName)
	// Use cd and archive '.' to avoid including the parent staging dir in the zip
	execSync(`cd "${stagingDir}" && ditto -c -k --sequesterRsrc . "${zipPathAbs}"`, { stdio: 'inherit' })

	console.log(`Created ${zipPathAbs}`)
}

build().catch(err => {
	console.error('Build failed:', err)
	process.exit(1)
}) 