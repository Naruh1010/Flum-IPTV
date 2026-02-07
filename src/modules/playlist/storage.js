/**
 * Storage - Local Storage Management
 * 
 * Handles persistence of user data including recent
 * playlists and watch history using localStorage.
 */

export class Storage {
    static KEYS = {
        HISTORY: 'flum_history',
        RECENT_PLAYLISTS: 'flum_recent_playlists',
        SETTINGS: 'flum_settings'
    };

    static MAX_HISTORY = 20;
    static MAX_RECENT_PLAYLISTS = 5;

    /**
     * Add channel to watch history
     * @param {Object} channel - Channel object
     */
    static addToHistory(channel) {
        const history = Storage.getHistory();

        // Remove if already exists
        const filtered = history.filter(c => c.id !== channel.id);

        // Add to beginning
        filtered.unshift({
            id: channel.id,
            name: channel.name,
            logo: channel.logo,
            url: channel.url,
            timestamp: Date.now()
        });

        // Limit size
        const limited = filtered.slice(0, Storage.MAX_HISTORY);

        Storage.save(Storage.KEYS.HISTORY, limited);
    }

    /**
     * Get watch history
     * @returns {Array} History entries
     */
    static getHistory() {
        return Storage.load(Storage.KEYS.HISTORY) || [];
    }

    /**
     * Clear watch history
     */
    static clearHistory() {
        Storage.save(Storage.KEYS.HISTORY, []);
    }

    /**
     * Add playlist to recent list
     * @param {Object} playlist - Playlist info
     */
    static addRecentPlaylist(playlist) {
        const recent = Storage.getRecentPlaylists();

        // Add with timestamp
        recent.unshift({
            ...playlist,
            timestamp: Date.now()
        });

        // Limit size
        const limited = recent.slice(0, Storage.MAX_RECENT_PLAYLISTS);

        Storage.save(Storage.KEYS.RECENT_PLAYLISTS, limited);
    }

    /**
     * Get recent playlists
     * @returns {Array} Recent playlists
     */
    static getRecentPlaylists() {
        return Storage.load(Storage.KEYS.RECENT_PLAYLISTS) || [];
    }

    /**
     * Save settings
     * @param {Object} settings - Settings object
     */
    static saveSettings(settings) {
        Storage.save(Storage.KEYS.SETTINGS, settings);
    }

    /**
     * Get settings
     * @returns {Object} Settings
     */
    static getSettings() {
        return Storage.load(Storage.KEYS.SETTINGS) || {
            volume: 1,
            autoplay: true,
            theme: 'dark'
        };
    }

    /**
     * Generic save to localStorage
     * @param {string} key - Storage key
     * @param {*} data - Data to save
     */
    static save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('[Storage] Save error:', error);
        }
    }

    /**
     * Generic load from localStorage
     * @param {string} key - Storage key
     * @returns {*} Loaded data
     */
    static load(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('[Storage] Load error:', error);
            return null;
        }
    }
}
