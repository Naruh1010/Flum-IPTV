/**
 * SettingsCache - Player Settings Persistence
 * 
 * Stores and retrieves player settings from the
 * .FlumIPTVData directory.
 */

const fs = require('fs');
const path = require('path');
const { cacheManager } = require('./cache-manager');

class SettingsCache {
    constructor() {
        this.settingsFile = null;
        this.settings = null;
    }

    /**
     * Initialize settings cache
     */
    initialize() {
        this.settingsFile = path.join(cacheManager.getCacheDir(), 'settings.json');
        this.settings = this.load();
    }

    /**
     * Get default settings
     * @returns {Object} Default settings
     */
    getDefaults() {
        return {
            player: {
                volume: 1.0,
                muted: false,
                autoplay: true
            },
            ui: {
                sidebarWidth: 320,
                theme: 'system',
                useOsColor: false,
                language: 'system'
            },
            lastSession: {
                playlistPath: null,
                lastChannelId: null,
                lastChannelUrl: null
            },
            externalPlayer: {
                enabled: false,
                path: null,
                name: null
            },
            recording: {
                preset: 'medium'
            },
            history: [],
            recentPlaylists: [],
            shortcuts: {}
        };
    }

    /**
     * Load settings from file
     * @returns {Object} Settings object
     */
    load() {
        try {
            if (this.settingsFile && fs.existsSync(this.settingsFile)) {
                const content = fs.readFileSync(this.settingsFile, 'utf-8');
                const loaded = JSON.parse(content);
                // Merge with defaults to ensure all keys exist
                return this.mergeWithDefaults(loaded);
            }
        } catch (error) {
            console.error('[SettingsCache] Error loading settings:', error);
        }
        return this.getDefaults();
    }

    /**
     * Merge loaded settings with defaults
     * @param {Object} loaded - Loaded settings
     * @returns {Object} Merged settings
     */
    mergeWithDefaults(loaded) {
        const defaults = this.getDefaults();
        return {
            player: { ...defaults.player, ...loaded.player },
            ui: { ...defaults.ui, ...loaded.ui },
            lastSession: { ...defaults.lastSession, ...loaded.lastSession },
            externalPlayer: { ...defaults.externalPlayer, ...loaded.externalPlayer },
            recording: { ...defaults.recording, ...loaded.recording },
            history: loaded.history || defaults.history,
            recentPlaylists: loaded.recentPlaylists || defaults.recentPlaylists,
            shortcuts: { ...defaults.shortcuts, ...loaded.shortcuts }
        };
    }

    /**
     * Save settings to file
     */
    save() {
        try {
            if (this.settingsFile) {
                fs.writeFileSync(this.settingsFile, JSON.stringify(this.settings, null, 2));
                console.log('[SettingsCache] Settings saved');
            }
        } catch (error) {
            console.error('[SettingsCache] Error saving settings:', error);
        }
    }

    /**
     * Get all settings
     * @returns {Object} All settings
     */
    getAll() {
        return this.settings || this.getDefaults();
    }

    /**
     * Get a specific setting by path
     * @param {string} path - Dot-separated path (e.g., 'player.volume')
     * @returns {*} Setting value
     */
    get(path) {
        const parts = path.split('.');
        let value = this.settings;
        for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
                value = value[part];
            } else {
                return undefined;
            }
        }
        return value;
    }

    /**
     * Set a specific setting by path
     * @param {string} path - Dot-separated path
     * @param {*} value - Value to set
     */
    set(path, value) {
        const parts = path.split('.');
        let obj = this.settings;

        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!(part in obj)) {
                obj[part] = {};
            }
            obj = obj[part];
        }

        obj[parts[parts.length - 1]] = value;
        this.save();
    }

    /**
     * Update player settings
     * @param {Object} playerSettings - Player settings to update
     */
    updatePlayer(playerSettings) {
        this.settings.player = { ...this.settings.player, ...playerSettings };
        this.save();
    }

    /**
     * Update last session info
     * @param {Object} sessionInfo - Session info
     */
    updateLastSession(sessionInfo) {
        this.settings.lastSession = { ...this.settings.lastSession, ...sessionInfo };
        this.save();
    }

    /**
     * Add channel to history
     * @param {Object} channel - Channel info
     */
    addToHistory(channel) {
        const maxHistory = 20;

        // Remove if already exists
        this.settings.history = this.settings.history.filter(
            c => c.url !== channel.url
        );

        // Add to beginning
        this.settings.history.unshift({
            id: channel.id,
            name: channel.name,
            url: channel.url,
            logo: channel.logo,
            timestamp: Date.now()
        });

        // Limit size
        if (this.settings.history.length > maxHistory) {
            this.settings.history = this.settings.history.slice(0, maxHistory);
        }

        this.save();
    }

    /**
     * Add playlist to recent list
     * @param {Object} playlist - Playlist info
     */
    addRecentPlaylist(playlist) {
        const maxRecent = 5;

        // Remove if already exists
        this.settings.recentPlaylists = this.settings.recentPlaylists.filter(
            p => p.path !== playlist.path
        );

        // Add to beginning
        this.settings.recentPlaylists.unshift({
            ...playlist,
            timestamp: Date.now()
        });

        // Limit size
        if (this.settings.recentPlaylists.length > maxRecent) {
            this.settings.recentPlaylists = this.settings.recentPlaylists.slice(0, maxRecent);
        }

        this.save();
    }

    /**
     * Get watch history
     * @returns {Array} History entries
     */
    getHistory() {
        return this.settings.history || [];
    }

    /**
     * Get recent playlists
     * @returns {Array} Recent playlists
     */
    getRecentPlaylists() {
        return this.settings.recentPlaylists || [];
    }

    /**
     * Clear history
     */
    clearHistory() {
        this.settings.history = [];
        this.save();
    }

    /**
     * Reset all settings to defaults
     */
    reset() {
        this.settings = this.getDefaults();
        this.save();
    }
}

// Singleton instance
const settingsCache = new SettingsCache();

module.exports = { SettingsCache, settingsCache };
