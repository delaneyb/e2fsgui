const { execSync, execFile } = require('child_process')
const fs = require('fs')
const path = require('path')

// Locate Homebrew installation prefix (if installed). Fallback to common paths.
function findHomebrewPath() {
	try {
		return execSync('brew --prefix').toString().trim()
	} catch (e) {
		if (fs.existsSync('/opt/homebrew')) return '/opt/homebrew' // Apple Silicon default
		if (fs.existsSync('/usr/local/Homebrew')) return '/usr/local' // Intel default
		return null
	}
}

// Resolve the absolute path to a Home‑brew installed binary (tries e2fsprogs first).
function getBrewBinPath(program) {
	const brewPath = findHomebrewPath()
	if (!brewPath) return null

	const e2fsprogsPrefix = path.join(brewPath, 'opt', 'e2fsprogs')
	const candidates = [
		path.join(e2fsprogsPrefix, 'sbin', program),
		path.join(e2fsprogsPrefix, 'bin', program),
		path.join(brewPath, 'sbin', program),
		path.join(brewPath, 'bin', program)
	]
	return candidates.find(p => fs.existsSync(p)) || null
}

/**
 * Execute a debugfs request and return a Promise that resolves with stdout/stderr.
 *
 * @param {string} device       The block device identifier (e.g. "disk3s1").
 * @param {string} requestCmd   The command to pass to debugfs with the -R flag.
 * @param {object} [opts]       Optional flags.
 * @param {boolean} [opts.write] If true the filesystem will be opened read‑write (adds -w).
 * @param {number}  [opts.maxBuffer] Override the default maxBuffer (default 5 MB).
 * @returns {Promise<{stdout:string, stderr:string}>}
 */
function runDebugFs(device, requestCmd, opts = {}) {
	const debugfsPath = getBrewBinPath('debugfs')
	if (!debugfsPath) {
		throw new Error("debugfs not found. Please ensure e2fsprogs is installed via Homebrew.")
	}

	const { write = false, maxBuffer = 1024 * 1024 * 5 } = opts
	const args = []
	if (write) args.push('-w')
	args.push('-R', requestCmd, `/dev/${device}`)

	return new Promise((resolve, reject) => {
		execFile(debugfsPath, args, { maxBuffer }, (err, stdout = '', stderr = '') => {
			if (err && !stdout && !stderr) {
				// No useful output, propagate error
				return reject(err)
			}
			resolve({ stdout, stderr })
		})
	})
}

module.exports = { findHomebrewPath, getBrewBinPath, runDebugFs } 
