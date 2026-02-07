/**
 * CacheManager - Central Cache Management
 * 
 * Manages the .FlumIPTVData cache directory and coordinates
 * between icon and settings cache modules.
 */

const { app } = require('electron');
const fs = require('fs');
const path = require('path');

class CacheManager {
    constructor() {
        // Base cache directory in user's home folder
        this.cacheDir = path.join(app.getPath('home'), '.FlumIPTVData');
        this.iconsDir = path.join(this.cacheDir, 'icons');
        this.metaFile = path.join(this.cacheDir, 'cache-meta.json');

        this.initialized = false;
    }

    /**
     * Initialize cache directories
     * Creates .FlumIPTVData and subdirectories if they don't exist
     */
    async initialize() {
        if (this.initialized) return;

        try {
            // Create main cache directory
            if (!fs.existsSync(this.cacheDir)) {
                fs.mkdirSync(this.cacheDir, { recursive: true });
                console.log(`[CacheManager] Created cache directory: ${this.cacheDir}`);
            }

            // Create icons subdirectory
            if (!fs.existsSync(this.iconsDir)) {
                fs.mkdirSync(this.iconsDir, { recursive: true });
                console.log(`[CacheManager] Created icons directory: ${this.iconsDir}`);
            }

            // Initialize meta file if doesn't exist
            if (!fs.existsSync(this.metaFile)) {
                this.writeMeta({
                    version: '1.0',
                    created: new Date().toISOString(),
                    lastCleanup: null
                });
            }

            this.initialized = true;
            console.log('[CacheManager] Cache system initialized');
        } catch (error) {
            console.error('[CacheManager] Initialization error:', error);
            throw error;
        }
    }

    /**
     * Get the cache directory path
     * @returns {string} Cache directory path
     */
    getCacheDir() {
        return this.cacheDir;
    }

    /**
     * Get the icons directory path
     * @returns {string} Icons directory path
     */
    getIconsDir() {
        return this.iconsDir;
    }

    /**
     * Read cache metadata
     * @returns {Object} Metadata object
     */
    readMeta() {
        try {
            if (fs.existsSync(this.metaFile)) {
                const content = fs.readFileSync(this.metaFile, 'utf-8');
                return JSON.parse(content);
            }
        } catch (error) {
            console.error('[CacheManager] Error reading meta:', error);
        }
        return {};
    }

    /**
     * Write cache metadata
     * @param {Object} meta - Metadata to write
     */
    writeMeta(meta) {
        try {
            fs.writeFileSync(this.metaFile, JSON.stringify(meta, null, 2));
        } catch (error) {
            console.error('[CacheManager] Error writing meta:', error);
        }
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getStats() {
        try {
            const iconFiles = fs.existsSync(this.iconsDir)
                ? fs.readdirSync(this.iconsDir)
                : [];

            let totalSize = 0;
            iconFiles.forEach(file => {
                const filePath = path.join(this.iconsDir, file);
                const stats = fs.statSync(filePath);
                totalSize += stats.size;
            });

            return {
                iconCount: iconFiles.length,
                totalSize: totalSize,
                totalSizeBytes: totalSize,
                totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
                cacheDir: this.cacheDir
            };
        } catch (error) {
            console.error('[CacheManager] Error getting stats:', error);
            return { iconCount: 0, totalSize: 0, totalSizeBytes: 0, totalSizeMB: '0' };
        }
    }

    /**
     * Clear all cached icons
     */
    async clearIconCache() {
        try {
            if (fs.existsSync(this.iconsDir)) {
                const files = fs.readdirSync(this.iconsDir);
                for (const file of files) {
                    fs.unlinkSync(path.join(this.iconsDir, file));
                }
                console.log(`[CacheManager] Cleared ${files.length} cached icons`);
            }
        } catch (error) {
            console.error('[CacheManager] Error clearing icon cache:', error);
        }
    }

    /**
     * Clear entire cache
     */
    async clearAll() {
        await this.clearIconCache();

        // Update meta
        const meta = this.readMeta();
        meta.lastCleanup = new Date().toISOString();
        this.writeMeta(meta);
    }
}

// Singleton instance
const cacheManager = new CacheManager();

module.exports = { CacheManager, cacheManager };
