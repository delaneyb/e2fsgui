const { app, BrowserWindow } = require('electron')
const path = require('path')

// Check if running as root (required for raw disk access)
// This app is now designed to be run explicitly with sudo
if (process.getuid && process.getuid() !== 0) {
	console.error('----------------------------------------------------------')
	console.error('ERROR: This application requires root privileges.')
	console.error('Please run it using \'sudo\', e.g.:')
	console.error(`  sudo ${process.argv[0]} ${process.argv.slice(1).join(' ')}`)
	console.error('----------------------------------------------------------')
	app.quit() // Use quit instead of exit for cleaner shutdown
} else {
	// Enable live reload for all the files inside your project directory
	try {
		// Check if electron-reloader exists before requiring it
		require.resolve('electron-reloader')
		require('electron-reloader')(module)
	} catch (_) { /* do nothing */ }
	
	app.whenReady().then(() => {
		const win = new BrowserWindow({
			width: 1000,
			height: 700,
			webPreferences: {
				nodeIntegration: true,
				contextIsolation: false,
			},
		})
	
		win.loadFile(path.join(__dirname, 'index.html'))
	})
}
