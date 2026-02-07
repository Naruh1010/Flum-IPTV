/**
 * HLS Adapter - HTTP Live Streaming Support
 * 
 * Uses hls.js library to handle HLS streams (.m3u8).
 * Implements the common player adapter interface.
 */

export class HlsAdapter {
    constructor(videoElement) {
        this.videoElement = videoElement;
        this.hls = null;
        this.onStateChange = null;
        this.onError = null;
    }

    /**
     * Check if HLS is supported
     * @returns {boolean} Support status  
     */
    static isSupported() {
        return window.Hls && window.Hls.isSupported();
    }

    /**
     * Load an HLS stream
     * @param {string} url - HLS manifest URL (.m3u8)
     * @returns {Promise<void>}
     */
    load(url) {
        return new Promise((resolve, reject) => {
            // Clean up previous instance
            this.destroy();

            console.log('[HlsAdapter] Loading URL:', url);
            console.log('[HlsAdapter] HLS.js available:', HlsAdapter.isSupported());

            // Check if HLS is natively supported (Safari)
            if (this.videoElement.canPlayType('application/vnd.apple.mpegurl')) {
                console.log('[HlsAdapter] Using native HLS support');
                this.videoElement.src = url;
                this.videoElement.addEventListener('loadedmetadata', () => resolve(), { once: true });
                this.videoElement.addEventListener('error', (e) => reject(e), { once: true });
                return;
            }

            // Use hls.js for other browsers
            if (!HlsAdapter.isSupported()) {
                console.error('[HlsAdapter] HLS.js not available');
                reject(new Error('HLS is not supported in this browser'));
                return;
            }

            let resolved = false;

            this.hls = new window.Hls({
                enableWorker: true,
                lowLatencyMode: false,
                backBufferLength: 90,
                maxBufferLength: 30,
                maxMaxBufferLength: 60,
                startLevel: -1, // Auto quality
                debug: false
            });

            // Error handling
            this.hls.on(window.Hls.Events.ERROR, (event, data) => {
                console.error('[HlsAdapter] Error event:', data.type, data.details, data.fatal);

                if (data.fatal) {
                    if (this.onError) {
                        this.onError(data);
                    }

                    switch (data.type) {
                        case window.Hls.ErrorTypes.NETWORK_ERROR:
                            console.log('[HlsAdapter] Network error, trying to recover...');
                            this.hls.startLoad();
                            break;
                        case window.Hls.ErrorTypes.MEDIA_ERROR:
                            console.log('[HlsAdapter] Media error, trying to recover...');
                            this.hls.recoverMediaError();
                            break;
                        default:
                            if (!resolved) {
                                resolved = true;
                                this.destroy();
                                reject(new Error(`Fatal HLS error: ${data.type} - ${data.details}`));
                            }
                            break;
                    }
                }
            });

            // Media attached - now we can load the source
            this.hls.on(window.Hls.Events.MEDIA_ATTACHED, () => {
                console.log('[HlsAdapter] Media attached, loading source...');
                this.hls.loadSource(url);
            });

            // Manifest loaded successfully
            this.hls.on(window.Hls.Events.MANIFEST_PARSED, (event, data) => {
                console.log(`[HlsAdapter] Manifest parsed, ${data.levels.length} quality levels`);
                if (!resolved) {
                    resolved = true;
                    // Auto play
                    this.videoElement.play().catch(err => {
                        console.warn('[HlsAdapter] Autoplay blocked:', err);
                    });
                    resolve();
                }
            });

            // Fragment loaded - stream is working
            this.hls.on(window.Hls.Events.FRAG_LOADED, () => {
                console.log('[HlsAdapter] First fragment loaded');
            });

            // Attach media first, then source will be loaded in MEDIA_ATTACHED event
            this.hls.attachMedia(this.videoElement);
        });
    }

    /**
     * Get available quality levels
     * @returns {Array} Quality levels
     */
    getQualityLevels() {
        if (!this.hls) return [];
        return this.hls.levels.map((level, index) => ({
            index,
            height: level.height,
            width: level.width,
            bitrate: level.bitrate
        }));
    }

    /**
     * Set quality level
     * @param {number} levelIndex - Quality level index (-1 for auto)
     */
    setQuality(levelIndex) {
        if (this.hls) {
            this.hls.currentLevel = levelIndex;
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
    }
}
