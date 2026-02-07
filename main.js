/**
 * Flum IPTV - Main Process Entry Point
 * 
 * This file initializes the Electron application and delegates
 * to modular components for specific functionality.
 */

const { app } = require('electron');
const { AppManager } = require('./src/main/app');

// Application instance
let appManager = null;

// Initialize when Electron is ready
app.whenReady().then(() => {
  appManager = new AppManager();
  appManager.initialize();
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Re-create window on macOS when dock icon is clicked
app.on('activate', () => {
  if (appManager) {
    appManager.handleActivate();
  }
});
