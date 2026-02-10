/**
 * Preload Script - Secure Bridge
 * 
 * Exposes a limited, secure API to the renderer process
 * following Electron security best practices.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
    // ========== Playlist Operations ==========
    openPlaylistDialog: () => ipcRenderer.invoke('dialog:openPlaylist'),
    loadPlaylistFromUrl: (url) => ipcRenderer.invoke('playlist:loadFromUrl', url),

    // Playlist Storage
    getPlaylists: () => ipcRenderer.invoke('playlist:getAll'),
    addPlaylist: (data) => ipcRenderer.invoke('playlist:add', data),
    updatePlaylist: (id, updates) => ipcRenderer.invoke('playlist:update', id, updates),
    deletePlaylist: (id) => ipcRenderer.invoke('playlist:delete', id),
    refreshPlaylist: (id) => ipcRenderer.invoke('playlist:refresh', id),
    loadPlaylistContent: (id) => ipcRenderer.invoke('playlist:loadContent', id),

    // ========== Cache Operations ==========
    getCachedIcon: (url) => ipcRenderer.invoke('cache:getIcon', url),
    bulkCacheIcons: (urls) => ipcRenderer.invoke('cache:bulkCacheIcons', urls),
    getCacheStats: () => ipcRenderer.invoke('cache:getStats'),
    clearIconCache: () => ipcRenderer.invoke('cache:clearIcons'),

    // ========== Settings Operations ==========
    getSettings: () => ipcRenderer.invoke('settings:getAll'),
    getSetting: (path) => ipcRenderer.invoke('settings:get', path),
    setSetting: (path, value) => ipcRenderer.invoke('settings:set', path, value),
    updatePlayerSettings: (settings) => ipcRenderer.invoke('settings:updatePlayer', settings),
    updateLastSession: (session) => ipcRenderer.invoke('settings:updateLastSession', session),
    addToHistory: (channel) => ipcRenderer.invoke('settings:addToHistory', channel),
    getHistory: () => ipcRenderer.invoke('settings:getHistory'),
    resetSettings: () => ipcRenderer.invoke('settings:reset'),

    // ========== System Operations ==========
    getOsAccentColor: () => ipcRenderer.invoke('system:getAccentColor'),
    openDataFolder: () => ipcRenderer.invoke('system:openDataFolder'),
    getNativeTheme: () => ipcRenderer.invoke('system:getNativeTheme'),
    factoryReset: () => ipcRenderer.invoke('system:factoryReset'),

    // ========== External Player ==========
    detectExternalPlayers: () => ipcRenderer.invoke('player:detectExternal'),
    selectExternalPlayer: () => ipcRenderer.invoke('player:selectExternal'),
    openInExternalPlayer: (data) => ipcRenderer.invoke('player:openExternal', data),

    // ========== Favorites ==========
    toggleFavorite: (url) => ipcRenderer.invoke('favorites:toggle', url),
    getFavorites: () => ipcRenderer.invoke('favorites:getAll'),
    isFavorite: (url) => ipcRenderer.invoke('favorites:check', url),

    // ========== Recording ==========
    saveRecording: (data, filename) => ipcRenderer.invoke('recording:save', data, filename),

    // ========== Window Controls ==========
    minimizeWindow: () => ipcRenderer.send('window:minimize'),
    maximizeWindow: () => ipcRenderer.send('window:maximize'),
    closeWindow: () => ipcRenderer.send('window:close'),
    updateTitleBarOverlay: (isDark) => ipcRenderer.send('window:updateTitleBarOverlay', isDark)
});
