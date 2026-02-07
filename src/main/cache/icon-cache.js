/**
 * IconCache - Channel Icon Caching Module
 * 
 * Downloads and caches channel icons locally to improve
 * loading performance and reduce network requests.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { cacheManager } = require('./cache-manager');

class IconCache {
    constructor() {
        this.pendingDownloads = new Map();
    }

    /**
     * Generate a hash for the icon URL
     * @param {string} url - Icon URL
     * @returns {string} Hash string
     */
    generateHash(url) {
        return crypto.createHash('md5').update(url).digest('hex');
    }

    /**
     * Get the local path for a cached icon
     * @param {string} url - Original icon URL
     * @returns {string} Local file path
     */
    getCachePath(url) {
        const hash = this.generateHash(url);
        const ext = this.getExtension(url);
        return path.join(cacheManager.getIconsDir(), `${hash}${ext}`);
    }

    /**
     * Extract file extension from URL
     * @param {string} url - URL to parse
     * @returns {string} Extension with dot
     */
    getExtension(url) {
        try {
            const urlPath = new URL(url).pathname;
            const ext = path.extname(urlPath).toLowerCase();
            // Default to .png if no extension or unsupported
            if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext)) {
                return ext;
            }
        } catch (e) {
            // Invalid URL
        }
        return '.png';
    }

    /**
     * Check if icon is already cached
     * @param {string} url - Icon URL
     * @returns {boolean} True if cached
     */
    isCached(url) {
        const cachePath = this.getCachePath(url);
        return fs.existsSync(cachePath);
    }

    /**
     * Get cached icon path or null
     * @param {string} url - Icon URL
     * @returns {string|null} Local path or null
     */
    getCached(url) {
        const cachePath = this.getCachePath(url);
        return fs.existsSync(cachePath) ? cachePath : null;
    }

    /**
     * Download and cache an icon
     * @param {string} url - Icon URL to download
     * @returns {Promise<string>} Local cached path
     */
    async download(url) {
        // Return cached path if exists
        if (this.isCached(url)) {
            return this.getCachePath(url);
        }

        // Check if already downloading
        if (this.pendingDownloads.has(url)) {
            return this.pendingDownloads.get(url);
        }

        // Start download
        const downloadPromise = this._downloadIcon(url);
        this.pendingDownloads.set(url, downloadPromise);

        try {
            const result = await downloadPromise;
            return result;
        } finally {
            this.pendingDownloads.delete(url);
        }
    }

    /**
     * Internal download implementation
     * @param {string} url - Icon URL
     * @returns {Promise<string>} Local path
     */
    async _downloadIcon(url) {
        const cachePath = this.getCachePath(url);

        try {
            const response = await fetch(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'FlumIPTV/1.0'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const buffer = await response.arrayBuffer();
            fs.writeFileSync(cachePath, Buffer.from(buffer));

            console.log(`[IconCache] Cached: ${url} -> ${path.basename(cachePath)}`);
            return cachePath;
        } catch (error) {
            console.error(`[IconCache] Download failed for ${url}:`, error.message);
            return null;
        }
    }

    /**
     * Bulk cache multiple icons
     * @param {string[]} urls - Array of icon URLs
     * @returns {Promise<Map>} Map of URL to local path
     */
    async bulkCache(urls) {
        const results = new Map();
        const uniqueUrls = [...new Set(urls.filter(u => u))];

        // Process in batches of 5 to avoid overwhelming
        const batchSize = 5;
        for (let i = 0; i < uniqueUrls.length; i += batchSize) {
            const batch = uniqueUrls.slice(i, i + batchSize);
            const promises = batch.map(async url => {
                const localPath = await this.download(url);
                results.set(url, localPath);
            });
            await Promise.all(promises);
        }

        return results;
    }

    /**
     * Get file:// URL for cached icon
     * @param {string} url - Original icon URL
     * @returns {string|null} File URL or null
     */
    getFileUrl(url) {
        const cached = this.getCached(url);
        if (cached) {
            return `file://${cached.replace(/\\/g, '/')}`;
        }
        return null;
    }
}

// Singleton instance
const iconCache = new IconCache();

module.exports = { IconCache, iconCache };
