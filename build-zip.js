const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const { execSync } = require('child_process');

const packageJson = require('./package.json');
const version = packageJson.version;
const releaseDir = 'release';
const zipName = `LinuxDiskBrowser-v${version}.zip`;
const zipPath = path.join(releaseDir, zipName);

async function build() {
  console.log(`Building release ZIP: ${zipName}...`);

  // Ensure release directory exists and is empty
  await fs.ensureDir(releaseDir);
  await fs.emptyDir(releaseDir);

  // Find Electron path (assuming it's in node_modules)
  const electronPath = path.dirname(require.resolve('electron'));
  const electronAppPath = path.join(electronPath, 'dist', 'Electron.app');

  if (!await fs.pathExists(electronAppPath)) {
    throw new Error(`Electron app not found at ${electronAppPath}`);
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

  // Add Electron.app
  console.log('Adding Electron.app...');
  archive.directory(electronAppPath, 'LinuxDiskBrowser.app');

  // Add application source files
  console.log('Adding app source...');
  const appFiles = [
    'main.js',
    'index.html',
    'package.json',
    'resources/icon.icns' // Keep the icon for the app bundle inside the zip
  ];
  appFiles.forEach(file => {
    archive.file(file, { name: `LinuxDiskBrowser.app/Contents/Resources/app/${file}` });
  });

  // Add INSTRUCTIONS.md
  console.log('Adding INSTRUCTIONS.md...');
  archive.file('INSTRUCTIONS.md', { name: 'INSTRUCTIONS.md' });

  // Finalize the archive
  await archive.finalize();
  console.log('Build complete.');
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
}); 