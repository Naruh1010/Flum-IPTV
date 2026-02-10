/**
 * PlayerUI - Player Controls Component
 * 
 * Handles the video player UI controls including
 * play/pause, volume, fullscreen, and channel navigation.
 */

import { i18n } from '../modules/i18n.js';

export class PlayerUI {
    constructor({ videoElement, playerManager, playlistManager, onChannelChange, loadingOverlay, channelNameElement }) {
        this.video = videoElement;
        this.playerManager = playerManager;
        this.playlistManager = playlistManager;
        this.onChannelChange = onChannelChange;
        this.loadingOverlay = loadingOverlay;
        this.channelNameElement = channelNameElement;
        this.hideTimeout = null;
        this.videoContainer = document.getElementById('video-container');
        this.playerControls = document.getElementById('player-controls');

        // Cache control elements
        this.elements = {
            playBtn: document.getElementById('btn-play'),
            prevBtn: document.getElementById('btn-prev'),
            nextBtn: document.getElementById('btn-next'),
            muteBtn: document.getElementById('btn-mute'),
            volumeSlider: document.getElementById('volume-slider'),
            fullscreenBtn: document.getElementById('btn-fullscreen'),
            iconPlay: document.querySelector('.icon-play'),
            iconPause: document.querySelector('.icon-pause'),
            iconVolume: document.querySelector('.icon-volume'),
            iconMuted: document.querySelector('.icon-muted'),
            iconFullscreen: document.querySelector('.icon-fullscreen'),
            iconExitFullscreen: document.querySelector('.icon-exit-fullscreen')
        };

        this.init();
    }

    /**
     * Initialize component
     */
    init() {
        this.setupEventListeners();
        this.setupVideoListeners();
        this.setupFullscreenListeners();
    }

    /**
     * Setup control event listeners
     */
    setupEventListeners() {
        // Play/Pause
        this.elements.playBtn.addEventListener('click', () => {
            this.playerManager.togglePlay();
        });

        // Previous channel
        this.elements.prevBtn.addEventListener('click', () => {
            if (!this.playlistManager) return;
            const prev = this.playlistManager.getPreviousChannel();
            if (prev && this.onChannelChange) {
                this.onChannelChange(prev);
            }
        });

        // Next channel
        this.elements.nextBtn.addEventListener('click', () => {
            if (!this.playlistManager) return;
            const next = this.playlistManager.getNextChannel();
            if (next && this.onChannelChange) {
                this.onChannelChange(next);
            }
        });

        // Mute toggle
        this.elements.muteBtn.addEventListener('click', () => {
            this.playerManager.toggleMute();
        });

        // Volume slider
        this.elements.volumeSlider.addEventListener('input', (e) => {
            this.playerManager.setVolume(parseFloat(e.target.value));
        });

        // Fullscreen
        this.elements.fullscreenBtn.addEventListener('click', () => {
            this.playerManager.toggleFullscreen();
        });
    }

    /**
     * Setup video element listeners for UI updates
     */
    setupVideoListeners() {
        this.video.addEventListener('play', () => this.updatePlayButton(true));
        this.video.addEventListener('pause', () => this.updatePlayButton(false));
        this.video.addEventListener('volumechange', () => this.updateVolumeUI());
        this.video.addEventListener('waiting', () => this.showLoading(true));
        this.video.addEventListener('playing', () => this.showLoading(false));
        this.video.addEventListener('canplay', () => this.showLoading(false));
    }

    /**
     * Adjust volume by delta
     */
    adjustVolume(delta) {
        const newVolume = Math.max(0, Math.min(1, this.video.volume + delta));
        this.playerManager.setVolume(newVolume);
        this.elements.volumeSlider.value = newVolume;
    }

    /**
     * Update play/pause button state
     */
    updatePlayButton(playing) {
        this.elements.iconPlay.classList.toggle('hidden', playing);
        this.elements.iconPause.classList.toggle('hidden', !playing);
    }

    /**
     * Update volume UI elements
     */
    updateVolumeUI() {
        const muted = this.video.muted || this.video.volume === 0;
        this.elements.iconVolume.classList.toggle('hidden', muted);
        this.elements.iconMuted.classList.toggle('hidden', !muted);
        this.elements.volumeSlider.value = this.video.muted ? 0 : this.video.volume;
    }

    /**
     * Show/hide loading indicator
     */
    showLoading(show) {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.toggle('visible', show);
        }
    }

    /**
     * Update UI based on player state
     */
    updateState(state) {
        this.updatePlayButton(state === 'playing');
    }

    /**
     * Setup fullscreen change listeners
     */
    setupFullscreenListeners() {
        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());

        // Mouse movement to show controls in fullscreen
        if (this.videoContainer) {
            this.videoContainer.addEventListener('mousemove', () => this.handleMouseMove());
            this.videoContainer.addEventListener('mouseleave', () => this.hideControlsDelayed());
        }
    }

    /**
     * Handle fullscreen state change
     */
    handleFullscreenChange() {
        const isFullscreen = !!document.fullscreenElement;

        // Toggle fullscreen icons
        if (this.elements.iconFullscreen && this.elements.iconExitFullscreen) {
            this.elements.iconFullscreen.classList.toggle('hidden', isFullscreen);
            this.elements.iconExitFullscreen.classList.toggle('hidden', !isFullscreen);
        }

        // Update title
        if (this.elements.fullscreenBtn) {
            this.elements.fullscreenBtn.title = isFullscreen ? i18n.t('player.controls.exitFullscreen') : i18n.t('player.controls.fullscreen');
        }

        // Add/remove fullscreen class for styling
        if (this.videoContainer) {
            this.videoContainer.classList.toggle('is-fullscreen', isFullscreen);
        }

        // Start auto-hide in fullscreen
        if (isFullscreen) {
            this.hideControlsDelayed();
        } else {
            this.showControls();
            this.clearHideTimeout();
        }
    }

    /**
     * Handle mouse movement in video container
     */
    handleMouseMove() {
        this.showControls();

        // Only auto-hide in fullscreen
        if (document.fullscreenElement) {
            this.hideControlsDelayed();
        }
    }

    /**
     * Show controls
     */
    showControls() {
        if (this.playerControls) {
            this.playerControls.classList.remove('controls-hidden');
        }
        if (this.videoContainer) {
            this.videoContainer.style.cursor = 'default';
        }
    }

    /**
     * Hide controls after delay
     */
    hideControlsDelayed() {
        this.clearHideTimeout();

        this.hideTimeout = setTimeout(() => {
            if (document.fullscreenElement && this.playerControls) {
                this.playerControls.classList.add('controls-hidden');
                if (this.videoContainer) {
                    this.videoContainer.style.cursor = 'none';
                }
            }
        }, 3000);
    }

    /**
     * Clear hide timeout
     */
    clearHideTimeout() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
    }
}
