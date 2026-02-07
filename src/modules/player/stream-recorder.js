/**
 * StreamRecorder - Stream Recording Module
 * 
 * Records video/audio from the native video player using
 * MediaRecorder API with VP8/Opus codecs.
 * 
 * Features:
 * - VP8 video + Opus audio encoding
 * - Configurable quality presets
 * - Max 30fps capture
 * - WebM output format
 */

export class StreamRecorder {
    constructor(videoElement) {
        this.videoElement = videoElement;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.stream = null;
        this.recording = false;
        this.startTime = null;

        // Recording presets (bitrates in bps)
        this.presets = {
            low: {
                videoBitsPerSecond: 500000,    // 500 kbps
                audioBitsPerSecond: 64000,      // 64 kbps
                label: 'Bajo (500 kbps)'
            },
            medium: {
                videoBitsPerSecond: 1500000,   // 1.5 Mbps
                audioBitsPerSecond: 128000,     // 128 kbps
                label: 'Medio (1.5 Mbps)'
            },
            high: {
                videoBitsPerSecond: 3000000,   // 3 Mbps
                audioBitsPerSecond: 192000,     // 192 kbps
                label: 'Alto (3 Mbps)'
            }
        };

        this.currentPreset = 'medium';

        // Event callbacks
        this.onStart = null;
        this.onStop = null;
        this.onError = null;
        this.onDataAvailable = null;
    }

    /**
     * Check if MediaRecorder is supported
     * @returns {boolean}
     */
    static isSupported() {
        return typeof MediaRecorder !== 'undefined' &&
            MediaRecorder.isTypeSupported('video/webm; codecs=vp8,opus');
    }

    /**
     * Set recording quality preset
     * @param {string} preset - 'low', 'medium', or 'high'
     */
    setPreset(preset) {
        if (this.presets[preset]) {
            this.currentPreset = preset;
            console.log(`[StreamRecorder] Preset set to: ${preset}`);
        }
    }

    /**
     * Get available presets
     * @returns {Object}
     */
    getPresets() {
        return this.presets;
    }

    /**
     * Check if video is ready for recording
     * @returns {boolean}
     */
    canRecord() {
        return this.videoElement &&
            !this.videoElement.paused &&
            this.videoElement.readyState >= 2 &&
            StreamRecorder.isSupported();
    }

    /**
     * Start recording
     * @returns {boolean} Success status
     */
    start() {
        if (this.recording) {
            console.warn('[StreamRecorder] Already recording');
            return false;
        }

        if (!this.canRecord()) {
            console.error('[StreamRecorder] Cannot record - video not ready or not supported');
            if (this.onError) {
                this.onError(new Error('Cannot record - video not ready'));
            }
            return false;
        }

        try {
            // Capture stream from video element at max 30fps
            this.stream = this.videoElement.captureStream(30);

            const preset = this.presets[this.currentPreset];

            // Create MediaRecorder with VP8/Opus
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'video/webm; codecs=vp8,opus',
                videoBitsPerSecond: preset.videoBitsPerSecond,
                audioBitsPerSecond: preset.audioBitsPerSecond
            });

            this.recordedChunks = [];

            // Handle data available
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                    if (this.onDataAvailable) {
                        this.onDataAvailable(event.data);
                    }
                }
            };

            // Handle recording stop
            this.mediaRecorder.onstop = () => {
                this.recording = false;
                const duration = this.startTime ? Date.now() - this.startTime : 0;
                console.log(`[StreamRecorder] Recording stopped. Duration: ${Math.round(duration / 1000)}s`);

                if (this.onStop) {
                    this.onStop(this.getBlob(), duration);
                }
            };

            // Handle errors
            this.mediaRecorder.onerror = (event) => {
                console.error('[StreamRecorder] Recording error:', event.error);
                this.recording = false;
                if (this.onError) {
                    this.onError(event.error);
                }
            };

            // Start recording with 1 second chunks
            this.mediaRecorder.start(1000);
            this.recording = true;
            this.startTime = Date.now();

            console.log(`[StreamRecorder] Recording started with preset: ${this.currentPreset}`);

            if (this.onStart) {
                this.onStart();
            }

            return true;

        } catch (error) {
            console.error('[StreamRecorder] Failed to start recording:', error);
            if (this.onError) {
                this.onError(error);
            }
            return false;
        }
    }

    /**
     * Stop recording
     * @returns {boolean} Success status
     */
    stop() {
        if (!this.recording || !this.mediaRecorder) {
            console.warn('[StreamRecorder] Not recording');
            return false;
        }

        try {
            this.mediaRecorder.stop();

            // Stop all stream tracks
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
            }

            return true;

        } catch (error) {
            console.error('[StreamRecorder] Failed to stop recording:', error);
            this.recording = false;
            return false;
        }
    }

    /**
     * Check if currently recording
     * @returns {boolean}
     */
    isRecording() {
        return this.recording;
    }

    /**
     * Get recorded blob
     * @returns {Blob|null}
     */
    getBlob() {
        if (this.recordedChunks.length === 0) {
            return null;
        }
        return new Blob(this.recordedChunks, { type: 'video/webm' });
    }

    /**
     * Get recording duration in seconds
     * @returns {number}
     */
    getDuration() {
        if (!this.startTime || !this.recording) {
            return 0;
        }
        return Math.round((Date.now() - this.startTime) / 1000);
    }

    /**
     * Generate filename with timestamp
     * @param {string} channelName - Optional channel name
     * @returns {string}
     */
    generateFilename(channelName = 'recording') {
        const now = new Date();
        const timestamp = now.toISOString()
            .replace(/[:.]/g, '-')
            .replace('T', '_')
            .slice(0, 19);

        // Sanitize channel name
        const safeName = channelName
            .replace(/[<>:"/\\|?*]/g, '')
            .replace(/\s+/g, '_')
            .slice(0, 50);

        return `${safeName}_${timestamp}.webm`;
    }

    /**
     * Save recording to file via IPC
     * @param {string} channelName - Channel name for filename
     * @returns {Promise<string|null>} Saved file path or null
     */
    async save(channelName = 'recording') {
        const blob = this.getBlob();
        if (!blob) {
            console.warn('[StreamRecorder] No recording to save');
            return null;
        }

        try {
            // Convert blob to array buffer
            const arrayBuffer = await blob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            // Generate default filename
            const defaultName = this.generateFilename(channelName);

            // Save via IPC
            const savedPath = await window.electronAPI.saveRecording(
                Array.from(uint8Array),
                defaultName
            );

            if (savedPath) {
                console.log(`[StreamRecorder] Recording saved to: ${savedPath}`);
            }

            return savedPath;

        } catch (error) {
            console.error('[StreamRecorder] Failed to save recording:', error);
            if (this.onError) {
                this.onError(error);
            }
            return null;
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this.recording) {
            this.stop();
        }
        this.recordedChunks = [];
        this.mediaRecorder = null;
        this.stream = null;
    }
}
