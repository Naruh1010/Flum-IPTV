/**
 * IPC Handlers - Inter-Process Communication
 * 
 * Handles communication between main and renderer processes.
 * Each handler is modular and can be easily extended.
 */

const { ipcMain, dialog, shell, systemPreferences, nativeTheme } = require('electron');
const fs = require('fs');
const path = require('path');
const { cacheManager } = require('./cache/cache-manager');
const { iconCache } = require('./cache/icon-cache');
const { settingsCache } = require('./cache/settings-cache');
const { playlistStorage } = require('./cache/playlist-storage');

/**
 * Register all IPC handlers
 * @param {BrowserWindow} mainWindow - The main application window
 */
function registerIpcHandlers(mainWindow) {
    // Initialize playlist storage
    playlistStorage.initialize();

    // ========== Playlist Handlers ==========

    // Open file dialog for playlist selection
    ipcMain.handle('dialog:openPlaylist', async () => {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Seleccionar Playlist',
            filters: [
                { name: 'Playlists M3U', extensions: ['m3u', 'm3u8'] },
                { name: 'Todos los archivos', extensions: ['*'] }
            ],
            properties: ['openFile']
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }

        const filePath = result.filePaths[0];

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            return {
                path: filePath,
                name: path.basename(filePath),
                content: content
            };
        } catch (error) {
            console.error('Error reading playlist file:', error);
            return { error: error.message };
        }
    });

    // Load playlist from URL
    ipcMain.handle('playlist:loadFromUrl', async (event, url) => {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            const content = await response.text();
            return {
                url: url,
                content: content
            };
        } catch (error) {
            console.error('Error loading playlist from URL:', error);
            return { error: error.message };
        }
    });

    // ========== Playlist Storage Handlers ==========

    // Get all playlists
    ipcMain.handle('playlist:getAll', async () => {
        return playlistStorage.getAll();
    });

    // Add playlist
    ipcMain.handle('playlist:add', async (event, playlistData) => {
        // Load content to count channels
        let content = '';
        let channelCount = 0;

        try {
            if (playlistData.source === 'file') {
                content = fs.readFileSync(playlistData.path, 'utf-8');
            } else {
                const response = await fetch(playlistData.path);
                content = await response.text();
            }
            // Count EXTINF lines for channel count
            channelCount = (content.match(/#EXTINF/gi) || []).length;
        } catch (error) {
            console.error('[IPC] Error loading playlist content:', error);
        }

        const playlist = playlistStorage.add({
            ...playlistData,
            channelCount
        });

        return playlist;
    });

    // Update playlist
    ipcMain.handle('playlist:update', async (event, id, updates) => {
        return playlistStorage.update(id, updates);
    });

    // Delete playlist
    ipcMain.handle('playlist:delete', async (event, id) => {
        return playlistStorage.delete(id);
    });

    // Refresh playlist
    ipcMain.handle('playlist:refresh', async (event, id) => {
        const playlist = playlistStorage.getById(id);
        if (!playlist) return null;

        try {
            let content = '';
            if (playlist.source === 'file') {
                content = fs.readFileSync(playlist.path, 'utf-8');
            } else {
                const response = await fetch(playlist.path);
                content = await response.text();
            }

            const channelCount = (content.match(/#EXTINF/gi) || []).length;
            return playlistStorage.update(id, { channelCount });
        } catch (error) {
            console.error('[IPC] Error refreshing playlist:', error);
            return null;
        }
    });

    // Load playlist content
    ipcMain.handle('playlist:loadContent', async (event, id) => {
        const playlist = playlistStorage.getById(id);
        if (!playlist) return null;

        try {
            let content = '';
            if (playlist.source === 'file') {
                content = fs.readFileSync(playlist.path, 'utf-8');
            } else {
                const response = await fetch(playlist.path);
                content = await response.text();
            }
            return { ...playlist, content };
        } catch (error) {
            console.error('[IPC] Error loading playlist content:', error);
            return { error: error.message };
        }
    });

    // ========== Cache Handlers ==========

    // Get cached icon or download it
    ipcMain.handle('cache:getIcon', async (event, url) => {
        if (!url) return null;

        try {
            let localPath = iconCache.getCached(url);
            if (!localPath) {
                localPath = await iconCache.download(url);
            }
            if (localPath) {
                return `file://${localPath.replace(/\\/g, '/')}`;
            }
            return null;
        } catch (error) {
            console.error('[IPC] Error caching icon:', error);
            return null;
        }
    });

    // Bulk cache icons
    ipcMain.handle('cache:bulkCacheIcons', async (event, urls) => {
        try {
            const results = await iconCache.bulkCache(urls);
            const mapped = {};
            results.forEach((localPath, url) => {
                if (localPath) {
                    mapped[url] = `file://${localPath.replace(/\\/g, '/')}`;
                }
            });
            return mapped;
        } catch (error) {
            console.error('[IPC] Error bulk caching icons:', error);
            return {};
        }
    });

    // Get cache statistics
    ipcMain.handle('cache:getStats', async () => {
        return cacheManager.getStats();
    });

    // Clear icon cache
    ipcMain.handle('cache:clearIcons', async () => {
        await cacheManager.clearIconCache();
        return true;
    });

    // ========== Settings Handlers ==========

    // Get all settings
    ipcMain.handle('settings:getAll', async () => {
        return settingsCache.getAll();
    });

    // Get specific setting
    ipcMain.handle('settings:get', async (event, path) => {
        return settingsCache.get(path);
    });

    // Set specific setting
    ipcMain.handle('settings:set', async (event, path, value) => {
        settingsCache.set(path, value);
        return true;
    });

    // Update player settings
    ipcMain.handle('settings:updatePlayer', async (event, playerSettings) => {
        settingsCache.updatePlayer(playerSettings);
        return true;
    });

    // Update last session
    ipcMain.handle('settings:updateLastSession', async (event, sessionInfo) => {
        settingsCache.updateLastSession(sessionInfo);
        return true;
    });

    // Add to history
    ipcMain.handle('settings:addToHistory', async (event, channel) => {
        settingsCache.addToHistory(channel);
        return true;
    });

    // Get history
    ipcMain.handle('settings:getHistory', async () => {
        return settingsCache.getHistory();
    });

    // Reset settings
    ipcMain.handle('settings:reset', async () => {
        settingsCache.reset();
        return true;
    });

    // ========== System Handlers ==========

    // Get OS accent color
    ipcMain.handle('system:getAccentColor', async () => {
        try {
            // Windows accent color
            if (process.platform === 'win32') {
                const color = systemPreferences.getAccentColor();
                return `#${color.substring(0, 6)}`;
            }
            // Linux accent color (GNOME/GTK)
            else if (process.platform === 'linux') {
                const { execSync } = require('child_process');

                // First try getting the GTK theme (more reliable)
                let gtkTheme = '';
                try {
                    gtkTheme = execSync('gsettings get org.gnome.desktop.interface gtk-theme', {
                        encoding: 'utf-8',
                        timeout: 1000,
                        stdio: ['pipe', 'pipe', 'pipe']
                    }).trim().replace(/'/g, '');
                } catch (e) {
                    // Ignore errors
                }

                // Linux Mint themes (Mint-Y-Dark-Red, Mint-Y-Aqua, etc.)
                if (gtkTheme.toLowerCase().includes('mint-y')) {
                    const mintColors = {
                        'aqua': '#1f9eba',
                        'blue': '#0c75de',
                        'brown': '#aa876a',
                        'grey': '#9d9d9d',
                        'orange': '#ff7139',
                        'pink': '#e54980',
                        'purple': '#8c5dd9',
                        'red': '#e82127',
                        'sand': '#c5a07c',
                        'teal': '#199ca8',
                        'yellow': '#ffc62f'
                    };

                    // Extract color from theme name (e.g., "Mint-Y-Dark-Red" -> "red")
                    const themeLower = gtkTheme.toLowerCase();
                    for (const [colorName, hexColor] of Object.entries(mintColors)) {
                        if (themeLower.includes(colorName)) {
                            return hexColor;
                        }
                    }
                    // Default Mint green if no color variant
                    return '#87cf3e';
                }

                // Try GNOME 42+ accent color
                try {
                    const result = execSync('gsettings get org.gnome.desktop.interface accent-color', {
                        encoding: 'utf-8',
                        timeout: 1000,
                        stdio: ['pipe', 'pipe', 'pipe']
                    }).trim().replace(/'/g, '');

                    // Map GNOME accent colors to hex
                    const accentColors = {
                        'blue': '#3584e4',
                        'teal': '#2190a4',
                        'green': '#3a944a',
                        'yellow': '#c88800',
                        'orange': '#ed5b00',
                        'red': '#e62d42',
                        'pink': '#d56199',
                        'purple': '#9141ac',
                        'slate': '#6f8396'
                    };

                    if (accentColors[result]) {
                        return accentColors[result];
                    }
                } catch (e) {
                    // GNOME accent not available
                }

                // Fallback: detect accent from other common themes
                if (gtkTheme) {
                    const themeLower = gtkTheme.toLowerCase();
                    if (themeLower.includes('yaru')) {
                        return '#E95420'; // Ubuntu orange
                    } else if (themeLower.includes('breeze')) {
                        return '#3daee9'; // KDE blue
                    } else if (themeLower.includes('arc')) {
                        return '#5294e2'; // Arc blue
                    } else if (themeLower.includes('adwaita')) {
                        return '#3584e4'; // GNOME blue
                    } else if (themeLower.includes('pop')) {
                        return '#48b9c7'; // Pop!_OS teal
                    } else if (themeLower.includes('materia')) {
                        return '#4285f4'; // Materia blue
                    }
                }
            }
            return null;
        } catch (error) {
            console.error('[IPC] Error getting accent color:', error);
            return null;
        }
    });

    // Open data folder
    ipcMain.handle('system:openDataFolder', async () => {
        const dataDir = cacheManager.getCacheDir();
        shell.openPath(dataDir);
        return true;
    });

    // Get native theme
    ipcMain.handle('system:getNativeTheme', async () => {
        return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    });

    // ========== External Player Handlers ==========

    // Common player paths based on OS
    const getCommonPlayerPaths = () => {
        if (process.platform === 'win32') {
            // Windows paths
            return [
                {
                    name: 'MPV', paths: [
                        'C:\\Program Files\\mpv\\mpv.exe',
                        'C:\\Program Files (x86)\\mpv\\mpv.exe',
                        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'mpv', 'mpv.exe'),
                        path.join(process.env.USERPROFILE || '', 'scoop', 'apps', 'mpv', 'current', 'mpv.exe')
                    ]
                },
                {
                    name: 'VLC', paths: [
                        'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
                        'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe'
                    ]
                },
                {
                    name: 'PotPlayer', paths: [
                        'C:\\Program Files\\DAUM\\PotPlayer\\PotPlayerMini64.exe',
                        'C:\\Program Files (x86)\\DAUM\\PotPlayer\\PotPlayerMini.exe'
                    ]
                },
                {
                    name: 'MPC-HC', paths: [
                        'C:\\Program Files\\MPC-HC\\mpc-hc64.exe',
                        'C:\\Program Files (x86)\\MPC-HC\\mpc-hc.exe'
                    ]
                }
            ];
        } else if (process.platform === 'linux') {
            // Linux paths - check common binary locations
            const home = process.env.HOME || '';
            return [
                {
                    name: 'MPV', paths: [
                        '/usr/bin/mpv',
                        '/usr/local/bin/mpv',
                        '/snap/bin/mpv',
                        path.join(home, '.local/bin/mpv'),
                        '/var/lib/flatpak/exports/bin/io.mpv.Mpv',
                        path.join(home, '.local/share/flatpak/exports/bin/io.mpv.Mpv')
                    ]
                },
                {
                    name: 'VLC', paths: [
                        '/usr/bin/vlc',
                        '/usr/local/bin/vlc',
                        '/snap/bin/vlc',
                        '/var/lib/flatpak/exports/bin/org.videolan.VLC',
                        path.join(home, '.local/share/flatpak/exports/bin/org.videolan.VLC')
                    ]
                },
                {
                    name: 'Celluloid', paths: [
                        '/usr/bin/celluloid',
                        '/usr/local/bin/celluloid',
                        '/var/lib/flatpak/exports/bin/io.github.celluloid_player.Celluloid',
                        path.join(home, '.local/share/flatpak/exports/bin/io.github.celluloid_player.Celluloid')
                    ]
                },
                {
                    name: 'SMPlayer', paths: [
                        '/usr/bin/smplayer',
                        '/usr/local/bin/smplayer'
                    ]
                },
                {
                    name: 'Totem', paths: [
                        '/usr/bin/totem',
                        '/usr/local/bin/totem'
                    ]
                },
                {
                    name: 'Haruna', paths: [
                        '/usr/bin/haruna',
                        '/var/lib/flatpak/exports/bin/org.kde.haruna',
                        path.join(home, '.local/share/flatpak/exports/bin/org.kde.haruna')
                    ]
                }
            ];
        } else if (process.platform === 'darwin') {
            // macOS paths
            return [
                {
                    name: 'MPV', paths: [
                        '/Applications/mpv.app/Contents/MacOS/mpv',
                        '/usr/local/bin/mpv',
                        '/opt/homebrew/bin/mpv'
                    ]
                },
                {
                    name: 'VLC', paths: [
                        '/Applications/VLC.app/Contents/MacOS/VLC'
                    ]
                },
                {
                    name: 'IINA', paths: [
                        '/Applications/IINA.app/Contents/MacOS/IINA'
                    ]
                }
            ];
        }
        return [];
    };

    const commonPlayerPaths = getCommonPlayerPaths();

    // Detect installed players
    ipcMain.handle('player:detectExternal', async () => {
        const detected = [];

        for (const player of commonPlayerPaths) {
            for (const playerPath of player.paths) {
                if (fs.existsSync(playerPath)) {
                    detected.push({
                        name: player.name,
                        path: playerPath
                    });
                    break; // Found this player, move to next
                }
            }
        }

        return detected;
    });

    // Select external player via dialog
    ipcMain.handle('player:selectExternal', async () => {
        // Configure filters based on OS
        let filters;
        if (process.platform === 'win32') {
            filters = [
                { name: 'Ejecutables', extensions: ['exe'] },
                { name: 'Todos los archivos', extensions: ['*'] }
            ];
        } else {
            // Linux/macOS - all files (executables don't have specific extension)
            filters = [
                { name: 'Todos los archivos', extensions: ['*'] }
            ];
        }

        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Seleccionar Reproductor Externo',
            filters: filters,
            properties: ['openFile']
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }

        const playerPath = result.filePaths[0];
        // Get player name - remove .exe on Windows, just basename on others
        const ext = process.platform === 'win32' ? '.exe' : '';
        const playerName = path.basename(playerPath, ext);

        return {
            name: playerName,
            path: playerPath
        };
    });

    // Launch stream in external player
    ipcMain.handle('player:openExternal', async (event, { playerPath, streamUrl, channelName }) => {
        const { spawn } = require('child_process');

        try {
            console.log(`[IPC] Opening in external player: ${playerPath}`);
            console.log(`[IPC] Stream URL: ${streamUrl}`);

            // Build arguments based on player type
            const playerBasename = path.basename(playerPath).toLowerCase();
            let args = [streamUrl];

            // MPV specific args
            if (playerBasename.includes('mpv')) {
                args = [
                    `--title=${channelName || 'Flum IPTV'}`,
                    '--force-window=immediate',
                    streamUrl
                ];
            }
            // VLC specific args
            else if (playerBasename.includes('vlc')) {
                args = [
                    '--meta-title', channelName || 'Flum IPTV',
                    streamUrl
                ];
            }

            // Spawn detached process
            const child = spawn(playerPath, args, {
                detached: true,
                stdio: 'ignore'
            });

            child.unref();

            return { success: true };
        } catch (error) {
            console.error('[IPC] External player error:', error);
            return { error: error.message };
        }
    });

    // ========== Factory Reset Handler ==========

    ipcMain.handle('system:factoryReset', async () => {
        try {
            const dataDir = cacheManager.getCacheDir();

            // Delete entire data directory recursively
            if (fs.existsSync(dataDir)) {
                fs.rmSync(dataDir, { recursive: true, force: true });
                console.log('[IPC] Factory reset: deleted', dataDir);
            }

            // Restart the app
            const { app } = require('electron');
            app.relaunch();
            app.exit(0);

            return true;
        } catch (error) {
            console.error('[IPC] Factory reset error:', error);
            return { error: error.message };
        }
    });

    // ========== Recording Handlers ==========

    ipcMain.handle('recording:save', async (event, data, filename) => {
        try {
            // Show save dialog
            const result = await dialog.showSaveDialog(mainWindow, {
                title: 'Guardar Grabación',
                defaultPath: filename,
                filters: [
                    { name: 'Video WebM', extensions: ['webm'] }
                ]
            });

            if (result.canceled || !result.filePath) {
                return null;
            }

            // Convert array back to buffer and save
            const buffer = Buffer.from(data);
            fs.writeFileSync(result.filePath, buffer);

            console.log('[IPC] Recording saved to:', result.filePath);
            return result.filePath;

        } catch (error) {
            console.error('[IPC] Recording save error:', error);
            return { error: error.message };
        }
    });

    // ========== Window Handlers ==========

    ipcMain.on('window:minimize', () => {
        mainWindow.minimize();
    });

    ipcMain.on('window:maximize', () => {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    });

    ipcMain.on('window:close', () => {
        mainWindow.close();
    });

    // Update Title Bar Overlay colors based on theme
    ipcMain.on('window:updateTitleBarOverlay', (event, isDark) => {
        if (mainWindow && mainWindow.setTitleBarOverlay) {
            mainWindow.setTitleBarOverlay({
                color: isDark ? '#0a0a0f' : '#f5f5f5',
                symbolColor: isDark ? '#ffffff' : '#1a1a1a',
                height: 40
            });
        }
    });
}

module.exports = { registerIpcHandlers };

