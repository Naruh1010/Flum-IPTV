/**
 * PlaylistStorage - Playlist Management Module
 * 
 * Stores and manages playlist metadata in .FlumIPTVData
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { cacheManager } = require('./cache-manager');

class PlaylistStorage {
    constructor() {
        this.playlistsFile = null;
        this.playlists = [];
    }

    /**
     * Initialize playlist storage
     */
    initialize() {
        this.playlistsFile = path.join(cacheManager.getCacheDir(), 'playlists.json');
        this.playlists = this.load();
    }

    /**
     * Load playlists from file
     * @returns {Array} Playlists array
     */
    load() {
        try {
            if (this.playlistsFile && fs.existsSync(this.playlistsFile)) {
                const content = fs.readFileSync(this.playlistsFile, 'utf-8');
                const data = JSON.parse(content);
                return data.playlists || [];
            }
        } catch (error) {
            console.error('[PlaylistStorage] Error loading playlists:', error);
        }
        return [];
    }

    /**
     * Save playlists to file
     */
    save() {
        try {
            if (this.playlistsFile) {
                fs.writeFileSync(this.playlistsFile, JSON.stringify({
                    playlists: this.playlists
                }, null, 2));
                console.log('[PlaylistStorage] Playlists saved');
            }
        } catch (error) {
            console.error('[PlaylistStorage] Error saving playlists:', error);
        }
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return crypto.randomBytes(8).toString('hex');
    }

    /**
     * Get all playlists
     * @returns {Array} All playlists
     */
    getAll() {
        return this.playlists;
    }

    /**
     * Get playlist by ID
     * @param {string} id - Playlist ID
     * @returns {Object|null} Playlist or null
     */
    getById(id) {
        return this.playlists.find(p => p.id === id) || null;
    }

    /**
     * Add new playlist
     * @param {Object} playlist - Playlist data
     * @returns {Object} Created playlist
     */
    add(playlist) {
        const now = new Date().toISOString();
        const newPlaylist = {
            id: this.generateId(),
            name: playlist.name || 'Sin nombre',
            source: playlist.source || 'file', // 'file' or 'url'
            path: playlist.path || '',
            channelCount: playlist.channelCount || 0,
            addedAt: now,
            updatedAt: now,
            autoRefresh: playlist.autoRefresh || false,
            refreshInterval: playlist.refreshInterval || 24 // hours
        };

        this.playlists.push(newPlaylist);
        this.save();

        console.log(`[PlaylistStorage] Added playlist: ${newPlaylist.name}`);
        return newPlaylist;
    }

    /**
     * Update playlist
     * @param {string} id - Playlist ID
     * @param {Object} updates - Fields to update
     * @returns {Object|null} Updated playlist
     */
    update(id, updates) {
        const index = this.playlists.findIndex(p => p.id === id);
        if (index === -1) return null;

        this.playlists[index] = {
            ...this.playlists[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        this.save();
        console.log(`[PlaylistStorage] Updated playlist: ${id}`);
        return this.playlists[index];
    }

    /**
     * Delete playlist
     * @param {string} id - Playlist ID
     * @returns {boolean} Success
     */
    delete(id) {
        const initialLength = this.playlists.length;
        this.playlists = this.playlists.filter(p => p.id !== id);

        if (this.playlists.length < initialLength) {
            this.save();
            console.log(`[PlaylistStorage] Deleted playlist: ${id}`);
            return true;
        }
        return false;
    }

    /**
     * Update channel count for playlist
     * @param {string} id - Playlist ID
     * @param {number} count - Channel count
     */
    updateChannelCount(id, count) {
        this.update(id, { channelCount: count });
    }

    /**
     * Check if playlist exists by path/url
     * @param {string} path - File path or URL
     * @returns {Object|null} Existing playlist or null
     */
    findByPath(path) {
        return this.playlists.find(p => p.path === path) || null;
    }
}

// Singleton instance
const playlistStorage = new PlaylistStorage();

module.exports = { PlaylistStorage, playlistStorage };
