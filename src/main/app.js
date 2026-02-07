/**
 * AppManager - Application Lifecycle Manager
 * 
 * Handles window creation, lifecycle events, and coordinates
 * with other main process modules.
 */

const { BrowserWindow } = require('electron');
const path = require('path');
const { registerIpcHandlers } = require('./ipc-handlers');
const { cacheManager } = require('./cache/cache-manager');
const { settingsCache } = require('./cache/settings-cache');

class AppManager {
    constructor() {
        this.mainWindow = null;
    }

    /**
     * Initialize the application
     */
    async initialize() {
        // Initialize cache system
        await cacheManager.initialize();
        settingsCache.initialize();
        console.log('[AppManager] Cache system initialized');

        this.createMainWindow();
        registerIpcHandlers(this.mainWindow);
    }

    /**
     * Create the main application window
     */
    createMainWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1280,
            height: 720,
            minWidth: 800,
            minHeight: 600,
            backgroundColor: '#0a0a0f',
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, '../renderer/preload.js')
            },
            titleBarStyle: 'hidden',
            titleBarOverlay: {
                color: '#0a0a0f',
                symbolColor: '#ffffff',
                height: 40
            },
            show: false
        });

        // Load the renderer HTML
        this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

        // Show window when ready to prevent visual flash
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
        });

        // Handle window close
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });
    }

    /**
     * Handle macOS activate event
     */
    handleActivate() {
        if (this.mainWindow === null) {
            this.createMainWindow();
        }
    }
}

module.exports = { AppManager };
