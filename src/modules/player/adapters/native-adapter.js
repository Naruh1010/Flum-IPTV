/**
 * Native Adapter - HTML5 Video Support
 * 
 * Handles native video formats (MP4, WebM, etc.) using
 * the built-in HTML5 video element.
 */

export class NativeAdapter {
    constructor(videoElement) {
        this.videoElement = videoElement;
        this.onStateChange = null;
        this.onError = null;
    }

    /**
     * Native video is always supported
     * @returns {boolean} Always true
     */
    static isSupported() {
        return true;
    }

    /**
     * Load a native video source
     * @param {string} url - Video URL
     * @returns {Promise<void>}
     */
    load(url) {
        return new Promise((resolve, reject) => {
            // Clear previous source
            this.videoElement.src = '';

            // Error handler
            const errorHandler = (e) => {
                console.error('[NativeAdapter] Load error:', e);
                if (this.onError) {
                    this.onError(e);
                }
                reject(new Error('Failed to load video'));
            };

            // Success handler
            const loadedHandler = () => {
                console.log('[NativeAdapter] Video loaded');
                this.videoElement.removeEventListener('error', errorHandler);
                resolve();
            };

            // Set up listeners
            this.videoElement.addEventListener('loadedmetadata', loadedHandler, { once: true });
            this.videoElement.addEventListener('error', errorHandler, { once: true });

            // Load the source
            this.videoElement.src = url;
            this.videoElement.load();
        });
    }

    /**
     * Native video doesn't have quality levels
     * @returns {Array} Empty array
     */
    getQualityLevels() {
        return [];
    }

    /**
     * Quality selection not applicable for native video
     */
    setQuality() {
        // No-op for native video
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.videoElement.src = '';
        this.videoElement.load();
    }
}
