const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const { execSync } = require('child_process');

const packageJson = require('./package.json');
const version = packageJson.version;
const releaseDir = 'release';
const zipName = `e2fsgui-v${version}.zip`;
const zipPath = path.join(releaseDir, zipName);

async function build() {
	console.log(`Building release ZIP: ${zipName}...`);

	// Ensure release directory exists and is empty
	await fs.ensureDir(releaseDir);
	await fs.emptyDir(releaseDir);

	// Find Electron path (assuming it's in node_modules)
	const electronPath = path.dirname(require.resolve('electron'));
	const electronDistPath = path.join(electronPath, 'dist');

	if (!await fs.pathExists(electronDistPath)) {
		throw new Error(`Electron dist directory not found at ${electronDistPath}`);
	}

	// Create ZIP archive
	const output = fs.createWriteStream(zipPath);
	const archive = archiver('zip', {
		zlib: { level: 9 } // Max compression
	});

	output.on('close', () => {
		console.log(`Created ${zipPath} (${archive.pointer()} total bytes)`);
	});

	archive.on('warning', (err) => {
		if (err.code === 'ENOENT') {
			console.warn('Archive warning:', err);
		} else {
			throw err;
		}
	});

	archive.on('error', (err) => {
		throw err;
	});

	archive.pipe(output);

	// Add Electron distribution directory (electron-dist)
	console.log('Adding Electron distribution...');
	archive.directory(electronDistPath, 'electron-dist');

	// Add application source directory (app)
	console.log('Adding app source...');

	const appFiles = [
		'main.js',
		'index.html',
		'package.json'
	];

	appFiles.forEach(file => {
		archive.file(file, { name: `app/${file}` });
	});

	// Include resources directory if it exists
	if (await fs.pathExists('resources')) {
		archive.directory('resources', 'app/resources');
	}

	// Add INSTRUCTIONS.md
	console.log('Adding INSTRUCTIONS.md...');
	archive.file('INSTRUCTIONS.md', { name: 'INSTRUCTIONS.md' });

	// Add launcher script for terminal execution
	console.log('Adding launcher script...');
	archive.append(`#!/bin/sh

# Simple launcher script for e2fsgui

if ! command -v debugfs >/dev/null 2>&1; then
	echo "Error: e2fsprogs (debugfs) not found. Install with: brew install e2fsprogs" >&2
	exit 1
fi

DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$DIR/app"
ELECTRON_BIN="$DIR/electron-dist/Electron.app/Contents/MacOS/Electron"

if [ ! -x "$ELECTRON_BIN" ]; then
	echo "Error: Electron binary not found at $ELECTRON_BIN" >&2
	exit 1
fi

echo "Launching e2fsgui…"
exec sudo "$ELECTRON_BIN" "$APP_DIR" "${'$'}@"
`, { name: 'e2fsprogs', mode: 0o755 });

	// Finalize the archive
	await archive.finalize();
	console.log('Build complete.');
}

build().catch(err => {
	console.error('Build failed:', err);
	process.exit(1);
}); 