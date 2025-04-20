const { app, BrowserWindow } = require('electron');
const path = require('path');

// Wrap everything in a self-executing function to allow use of return
(function() {
  // Check if running as root
  function checkRootAccess() {
    if (process.getuid && process.getuid() !== 0) {
      console.error('This application requires root privileges to access disk devices.');
      console.error('Please restart with: sudo electron .');
      app.exit(1);
      return false;
    }
    return true;
  }

  // Check root access first
  if (!checkRootAccess()) {
    return; // Now return is valid within the function scope
  }

  // Enable live reload for all the files inside your project directory
  try {
    // Check if electron-reloader exists before requiring it
    require.resolve('electron-reloader');
    require('electron-reloader')(module);
  } catch (_) { /* do nothing */ }

  app.whenReady().then(() => {
    const win = new BrowserWindow({
      width: 1000,
      height: 700,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    win.loadFile(path.join(__dirname, 'index.html'));
  });
})();