/**
 * FavoritesManager - Channel Favorites Persistence
 * 
 * Manages favorite channels storage in the
 * .FlumIPTVData directory. Uses channel URLs as
 * unique identifiers for reliable deduplication.
 */

const fs = require('fs');
const path = require('path');
const { cacheManager } = require('./cache-manager');

class FavoritesManager {
    constructor() {
        this.favoritesFile = null;
        this.favorites = [];
    }

    /**
     * Initialize favorites manager
     */
    initialize() {
        this.favoritesFile = path.join(cacheManager.getCacheDir(), 'favorites.json');
        this.favorites = this.load();
    }

    /**
     * Load favorites from file
     * @returns {Array} Array of favorite channel URLs
     */
    load() {
        try {
            if (this.favoritesFile && fs.existsSync(this.favoritesFile)) {
                const content = fs.readFileSync(this.favoritesFile, 'utf-8');
                const data = JSON.parse(content);
                return Array.isArray(data) ? data : [];
            }
        } catch (error) {
            console.error('[FavoritesManager] Error loading favorites:', error);
        }
        return [];
    }

    /**
     * Save favorites to file
     */
    save() {
        try {
            if (this.favoritesFile) {
                fs.writeFileSync(this.favoritesFile, JSON.stringify(this.favorites, null, 2));
                console.log('[FavoritesManager] Favorites saved');
            }
        } catch (error) {
            console.error('[FavoritesManager] Error saving favorites:', error);
        }
    }

    /**
     * Check if a channel is favorite
     * @param {string} url - Channel URL
     * @returns {boolean} Whether the channel is favorite
     */
    isFavorite(url) {
        return this.favorites.includes(url);
    }

    /**
     * Add a channel to favorites
     * @param {string} url - Channel URL
     */
    addFavorite(url) {
        if (!this.isFavorite(url)) {
            this.favorites.push(url);
            this.save();
        }
    }

    /**
     * Remove a channel from favorites
     * @param {string} url - Channel URL
     */
    removeFavorite(url) {
        this.favorites = this.favorites.filter(fav => fav !== url);
        this.save();
    }

    /**
     * Toggle a channel's favorite status
     * @param {string} url - Channel URL
     * @returns {boolean} New favorite status (true = added, false = removed)
     */
    toggleFavorite(url) {
        if (this.isFavorite(url)) {
            this.removeFavorite(url);
            return false;
        } else {
            this.addFavorite(url);
            return true;
        }
    }

    /**
     * Get all favorite URLs
     * @returns {Array} Array of favorite channel URLs
     */
    getAll() {
        return [...this.favorites];
    }

    /**
     * Clear all favorites
     */
    clearAll() {
        this.favorites = [];
        this.save();
    }
}

// Singleton instance
const favoritesManager = new FavoritesManager();

module.exports = { FavoritesManager, favoritesManager };
