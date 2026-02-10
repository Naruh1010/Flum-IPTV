/**
 * DASH Adapter - Dynamic Adaptive Streaming over HTTP
 * 
 * Uses dash.js library to handle DASH streams (.mpd).
 * Implements the common player adapter interface.
 */

export class DashAdapter {
    constructor(videoElement) {
        this.videoElement = videoElement;
        this.player = null;
        this.onStateChange = null;
        this.onError = null;
        this.onLevelsAvailable = null;
    }

    /**
     * Check if DASH is supported
     * @returns {boolean} Support status
     */
    static isSupported() {
        return typeof window.dashjs !== 'undefined';
    }

    /**
     * Load a DASH stream
     * @param {string} url - DASH manifest URL (.mpd)
     * @returns {Promise<void>}
     */
    load(url) {
        return new Promise((resolve, reject) => {
            // Clean up previous instance
            this.destroy();

            if (!DashAdapter.isSupported()) {
                reject(new Error('DASH.js is not available'));
                return;
            }

            try {
                // Initialize dash.js player
                this.player = window.dashjs.MediaPlayer().create();

                // Configure player settings
                this.player.updateSettings({
                    streaming: {
                        lowLatencyEnabled: false,
                        abr: {
                            autoSwitchBitrate: {
                                audio: true,
                                video: true
                            }
                        },
                        buffer: {
                            fastSwitchEnabled: true
                        }
                    }
                });

                // Error handling
                this.player.on(window.dashjs.MediaPlayer.events.ERROR, (e) => {
                    console.error('[DashAdapter] Error:', e);
                    if (this.onError) {
                        this.onError(e);
                    }
                });

                // Stream initialized
                this.player.on(window.dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
                    console.log('[DashAdapter] Stream initialized');

                    if (this.onLevelsAvailable) {
                        this.onLevelsAvailable();
                    }

                    resolve();
                });

                // Playback started
                this.player.on(window.dashjs.MediaPlayer.events.PLAYBACK_STARTED, () => {
                    if (this.onStateChange) {
                        this.onStateChange('playing');
                    }
                });

                // Initialize and load
                this.player.initialize(this.videoElement, url, true);

            } catch (error) {
                console.error('[DashAdapter] Initialization error:', error);
                reject(error);
            }
        });
    }

    /**
     * Get available quality levels
     * @returns {Array} Quality levels
     */
    getQualityLevels() {
        if (!this.player) return [];

        const bitrateInfo = this.player.getBitrateInfoListFor('video');
        return bitrateInfo.map((info, index) => ({
            index,
            height: info.height,
            width: info.width,
            bitrate: info.bitrate
        }));
    }

    /**
     * Set quality level
     * @param {number} qualityIndex - Quality index (-1 for auto)
     */
    setQuality(qualityIndex) {
        if (!this.player) return;

        if (qualityIndex === -1) {
            this.player.updateSettings({
                streaming: {
                    abr: {
                        autoSwitchBitrate: { video: true }
                    }
                }
            });
        } else {
            this.player.updateSettings({
                streaming: {
                    abr: {
                        autoSwitchBitrate: { video: false }
                    }
                }
            });
            this.player.setQualityFor('video', qualityIndex);
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this.player) {
            this.player.reset();
            this.player = null;
        }
    }
}
