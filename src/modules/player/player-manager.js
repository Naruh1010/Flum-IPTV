/**
 * PlayerManager - Central Player Control Module
 * 
 * Manages video playback by selecting the appropriate adapter
 * based on stream type. Provides a unified interface for all
 * playback operations.
 * 
 * Supported formats:
 * - HLS (.m3u8) via hls.js
 * - DASH (.mpd) via dashjs
 * - Native formats (mp4, webm) via HTML5 video
 */

import { HlsAdapter } from './adapters/hls-adapter.js';
import { DashAdapter } from './adapters/dash-adapter.js';
import { NativeAdapter } from './adapters/native-adapter.js';

export class PlayerManager {
    constructor(videoElement) {
        this.videoElement = videoElement;
        this.currentAdapter = null;
        this.currentUrl = null;
        this.loadTimeoutId = null;

        // Available adapters
        this.adapters = {
            hls: new HlsAdapter(videoElement),
            dash: new DashAdapter(videoElement),
            native: new NativeAdapter(videoElement)
        };

        // Event callbacks
        this.onStateChange = null;
        this.onError = null;
        this.onTimeUpdate = null;
        this.onQualityChanged = null;
        this.onLevelsAvailable = null;
    }

    /**
     * Detect stream type based on URL
     * @param {string} url - Stream URL
     * @returns {string} Adapter type: 'hls', 'dash', or 'native'
     */
    detectStreamType(url) {
        const lowerUrl = url.toLowerCase();

        // Check for HLS streams
        if (lowerUrl.includes('.m3u8') ||
            lowerUrl.includes('format=m3u8') ||
            lowerUrl.includes('/hls/') ||
            lowerUrl.includes('hls.') ||
            lowerUrl.includes('.m3u8?')) {
            return 'hls';
        }

        // Check for DASH streams
        if (lowerUrl.includes('.mpd') ||
            lowerUrl.includes('format=mpd') ||
            lowerUrl.includes('/dash/')) {
            return 'dash';
        }

        // Default to HLS for IPTV streams (most common)
        // Native formats would have clear extensions like .mp4, .webm
        if (lowerUrl.includes('.mp4') ||
            lowerUrl.includes('.webm') ||
            lowerUrl.includes('.ogg') ||
            lowerUrl.includes('.mov')) {
            return 'native';
        }

        // Default to HLS for unknown stream types (most IPTV uses HLS)
        return 'hls';
    }

    /**
     * Load and play a stream
     * @param {string} url - Stream URL
     * @returns {Promise<boolean>} Success status
     */
    async load(url) {
        // Stop current playback
        this.stop();

        // Detect stream type
        const streamType = this.detectStreamType(url);
        console.log(`[PlayerManager] Loading ${streamType} stream: ${url}`);

        // Select appropriate adapter
        this.currentAdapter = this.adapters[streamType];
        this.currentUrl = url;

        // Setup adapter event listeners
        this.setupAdapterEvents();

        try {
            // Add timeout to prevent indefinite loading
            const loadPromise = this.currentAdapter.load(url);
            const timeoutPromise = new Promise((_, reject) => {
                this.loadTimeoutId = setTimeout(() => reject(new Error('Load timeout')), 30000);
            });

            const result = await Promise.race([loadPromise, timeoutPromise]);

            // Clear timeout on success
            if (this.loadTimeoutId) {
                clearTimeout(this.loadTimeoutId);
                this.loadTimeoutId = null;
            }

            return true;
        } catch (error) {
            console.error('[PlayerManager] Load error:', error);
            if (this.onError) {
                this.onError(error);
            }
            return false;
        }
    }

    /**
     * Setup event forwarding from adapter
     */
    setupAdapterEvents() {
        if (!this.currentAdapter) return;

        this.currentAdapter.onStateChange = (state) => {
            if (this.onStateChange) {
                this.onStateChange(state);
            }
        };

        this.currentAdapter.onError = (error) => {
            // If it's a fatal error, cancel the timeout to prevent duplicate errors
            if (error && error.fatal) {
                if (this.loadTimeoutId) {
                    clearTimeout(this.loadTimeoutId);
                    this.loadTimeoutId = null;
                }
            }

            if (this.onError) {
                this.onError(error);
            }
        };

        this.currentAdapter.onLevelsAvailable = () => {
            if (this.onLevelsAvailable) {
                this.onLevelsAvailable();
            }
        };
    }

    /**
     * Play video
     */
    play() {
        if (this.videoElement) {
            this.videoElement.play().catch(console.error);
        }
    }

    /**
     * Pause video
     */
    pause() {
        if (this.videoElement) {
            this.videoElement.pause();
        }
    }

    /**
     * Toggle play/pause
     */
    togglePlay() {
        if (this.videoElement.paused) {
            this.play();
        } else {
            this.pause();
        }
    }

    /**
     * Stop playback and clean up
     */
    stop() {
        // Cancel any pending load timeout
        if (this.loadTimeoutId) {
            clearTimeout(this.loadTimeoutId);
            this.loadTimeoutId = null;
        }

        if (this.currentAdapter) {
            this.currentAdapter.destroy();
            this.currentAdapter = null;
        }
        // Clean up video element
        if (this.videoElement) {
            this.videoElement.pause();
            this.videoElement.removeAttribute('src');
            this.videoElement.load();
        }
        this.currentUrl = null;
    }

    /**
     * Set volume (0-1)
     * @param {number} level - Volume level
     */
    setVolume(level) {
        if (this.videoElement) {
            this.videoElement.volume = Math.max(0, Math.min(1, level));
        }
    }

    /**
     * Toggle mute
     */
    toggleMute() {
        if (this.videoElement) {
            this.videoElement.muted = !this.videoElement.muted;
        }
    }

    /**
     * Toggle fullscreen
     */
    toggleFullscreen() {
        // Use video container to keep custom controls visible
        const container = document.getElementById('video-container');

        if (!document.fullscreenElement) {
            (container || this.videoElement).requestFullscreen().catch(console.error);
        } else {
            document.exitFullscreen();
        }
    }

    /**
     * Get current playback state
     * @returns {Object} Playback state
     */
    getState() {
        return {
            playing: !this.videoElement.paused,
            currentTime: this.videoElement.currentTime,
            duration: this.videoElement.duration,
            volume: this.videoElement.volume,
            muted: this.videoElement.muted,
            streamType: this.currentAdapter ? this.detectStreamType(this.currentUrl) : null
        };
    }

    /**
     * Get available quality levels from current adapter
     * @returns {Array} Quality levels with index, height, width, bitrate
     */
    getQualityLevels() {
        if (!this.currentAdapter || typeof this.currentAdapter.getQualityLevels !== 'function') {
            return [];
        }
        return this.currentAdapter.getQualityLevels();
    }

    /**
     * Set quality level on current adapter
     * @param {number} index - Quality level index (-1 for auto)
     */
    setQuality(index) {
        if (!this.currentAdapter || typeof this.currentAdapter.setQuality !== 'function') return;
        this.currentAdapter.setQuality(index);
        if (this.onQualityChanged) {
            this.onQualityChanged(index);
        }
    }

    /**
     * Get current quality level index
     * @returns {number} Current quality index (-1 for auto)
     */
    getCurrentQuality() {
        if (!this.currentAdapter) return -1;
        // HLS adapter
        if (this.currentAdapter.hls) {
            return this.currentAdapter.hls.currentLevel;
        }
        // DASH adapter
        if (this.currentAdapter.player) {
            return this.currentAdapter.player.getQualityFor('video');
        }
        return -1;
    }

    /**
     * Clean up all resources
     */
    destroy() {
        this.stop();
        Object.values(this.adapters).forEach(adapter => adapter.destroy());
    }
}
