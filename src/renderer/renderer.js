/**
 * Renderer Entry Point
 * 
 * Initializes all UI modules and coordinates communication
 * between components. Manages navigation between Library,
 * Player, and Settings views.
 */

import { PlayerManager } from '../modules/player/player-manager.js';
import { PlaylistManager } from '../modules/playlist/playlist-manager.js';
import { StreamRecorder } from '../modules/player/stream-recorder.js';
import { i18n } from './modules/i18n.js';
import { keyboardShortcuts } from './modules/keyboard-shortcuts.js';
import { PlayerUI } from './components/player-ui.js';
import { ChannelList } from './components/channel-list.js';
import { LibraryView } from './views/library-view.js';
import { SettingsView } from './views/settings-view.js';
import { qualitySelector } from './modules/quality-selector.js';

class App {
    constructor() {
        // Views
        this.libraryView = null;
        this.settingsView = null;
        this.currentView = 'library';
        this.currentPlaylist = null;

        // Core modules
        this.playerManager = null;
        this.playlistManager = null;
        this.streamRecorder = null;

        // UI components
        this.playerUI = null;
        this.channelList = null;

        // DOM elements
        this.elements = {};
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('[App] Initializing Flum IPTV...');

        // Cache DOM elements
        this.cacheElements();

        // Initialize views
        this.initializeViews();

        // Initialize managers
        this.initializeManagers();

        // Initialize UI components
        this.initializeUIComponents();

        // Setup event listeners
        this.setupEventListeners();

        // Initialize i18n (language support)
        const settings = await window.electronAPI.getSettings();
        await i18n.initialize(settings.ui?.language || 'system');
        i18n.applyTranslations();

        // Initialize settings (theme and colors)
        await this.settingsView.initialize();

        // Initialize keyboard shortcuts
        await this.initializeKeyboardShortcuts();

        // Show library view
        this.showView('library');

        console.log('[App] Initialization complete');
    }

    /**
     * Cache frequently used DOM elements
     */
    cacheElements() {
        this.elements = {
            // Views
            libraryView: document.getElementById('library-view'),
            playerView: document.getElementById('player-view'),
            settingsView: document.getElementById('settings-view'),

            // Player
            videoPlayer: document.getElementById('video-player'),
            searchInput: document.getElementById('search-input'),
            groupSelect: document.getElementById('group-select'),
            channelListContainer: document.getElementById('channel-list'),
            emptyState: document.getElementById('empty-state'),
            loadingOverlay: document.getElementById('loading-overlay'),
            currentChannelName: document.getElementById('current-channel-name'),
            currentChannelGroup: document.getElementById('current-channel-group'),
            playlistNameHeader: document.getElementById('playlist-name-header'),

            // Navigation
            btnBackLibrary: document.getElementById('btn-back-library'),

            // Recording
            btnRecord: document.getElementById('btn-record')
        };
    }

    /**
     * Initialize views
     */
    initializeViews() {
        this.libraryView = new LibraryView({
            onPlaylistOpen: (playlist) => this.openPlaylist(playlist),
            onSettingsOpen: () => this.showView('settings')
        });

        this.settingsView = new SettingsView({
            onBack: () => this.showView('library'),
            onRecordingPresetChange: (preset) => {
                if (this.streamRecorder) {
                    this.streamRecorder.setPreset(preset);
                }
            },
            onLanguageChange: (locale) => {
                i18n.setLocale(locale);
            }
        });
    }

    /**
     * Initialize core managers
     */
    initializeManagers() {
        this.playerManager = new PlayerManager(this.elements.videoPlayer);
        this.playerManager.onStateChange = (state) => this.handlePlayerStateChange(state);
        this.playerManager.onError = (error) => this.handlePlayerError(error);
        this.playerManager.onLevelsAvailable = () => qualitySelector.updateLevels();

        this.playlistManager = new PlaylistManager();

        // Initialize quality selector
        qualitySelector.initialize(this.playerManager);

        // Initialize stream recorder
        if (StreamRecorder.isSupported()) {
            this.streamRecorder = new StreamRecorder(this.elements.videoPlayer);
            this.streamRecorder.onStop = (blob, duration) => this.handleRecordingStop(blob, duration);
            this.streamRecorder.onError = (error) => this.showToast(i18n.t('toast.recordingError', { message: error.message }), 'error');
            this.loadRecordingPreset();
        }
    }

    /**
     * Initialize UI components
     */
    initializeUIComponents() {
        this.playerUI = new PlayerUI({
            playerManager: this.playerManager,
            playlistManager: this.playlistManager,
            videoElement: this.elements.videoPlayer,
            onChannelChange: (channel) => this.handleChannelSelected(channel)
        });

        this.channelList = new ChannelList({
            container: this.elements.channelListContainer,
            emptyState: this.elements.emptyState,
            searchInput: this.elements.searchInput,
            groupSelect: this.elements.groupSelect,
            onChannelClick: (channel) => this.handleChannelSelected(channel)
        });
    }

    /**
     * Initialize keyboard shortcuts with action callbacks
     */
    async initializeKeyboardShortcuts() {
        await keyboardShortcuts.initialize({
            playPause: () => this.playerManager.togglePlay(),
            mute: () => this.playerManager.toggleMute(),
            fullscreen: () => this.playerManager.toggleFullscreen(),
            volumeUp: () => this.playerUI.adjustVolume(0.1),
            volumeDown: () => this.playerUI.adjustVolume(-0.1),
            prevChannel: () => {
                const prev = this.playlistManager.getPreviousChannel();
                if (prev) this.handleChannelSelected(prev);
            },
            nextChannel: () => {
                const next = this.playlistManager.getNextChannel();
                if (next) this.handleChannelSelected(next);
            }
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Back to library
        this.elements.btnBackLibrary.addEventListener('click', () => {
            this.playerManager.stop();
            qualitySelector.clear();
            this.hideError();
            this.showView('library');
        });

        // Retry button
        const btnRetry = document.getElementById('btn-retry');
        if (btnRetry) {
            btnRetry.addEventListener('click', () => {
                this.hideError();
                const currentChannel = this.playlistManager.currentChannel;
                if (currentChannel) {
                    this.handleChannelSelected(currentChannel);
                }
            });
        }

        // Recording button
        if (this.elements.btnRecord && this.streamRecorder) {
            this.elements.btnRecord.addEventListener('click', () => this.toggleRecording());
        }
    }

    /**
     * Show specific view
     */
    showView(viewName) {
        this.currentView = viewName;

        // Hide all views
        this.elements.libraryView.classList.remove('active');
        this.elements.playerView.classList.remove('active');
        this.elements.settingsView.classList.remove('active');

        // Show requested view
        switch (viewName) {
            case 'library':
                this.libraryView.show();
                break;
            case 'player':
                this.elements.playerView.classList.add('active');
                break;
            case 'settings':
                this.settingsView.show();
                break;
        }
    }

    /**
     * Open a playlist from library
     */
    async openPlaylist(playlist) {
        console.log('[App] Opening playlist:', playlist.name);

        // Reset player state completely
        this.playerManager.stop();
        qualitySelector.clear();
        this.playlistManager.clear();
        this.channelList.clear();
        this.elements.currentChannelName.textContent = 'Flum IPTV';

        this.currentPlaylist = playlist;

        // Update header
        this.elements.playlistNameHeader.textContent = playlist.name;

        // Show player view
        this.libraryView.hide();
        this.showView('player');

        // Load playlist content
        try {
            const result = await window.electronAPI.loadPlaylistContent(playlist.id);

            if (result.error) {
                console.error('[App] Error loading playlist:', result.error);
                return;
            }

            // Use loadFromContent which parses and stores
            this.playlistManager.loadFromContent(result.content, playlist.name);

            // Get parsed channels and groups
            const channels = this.playlistManager.channels;
            const groups = this.playlistManager.groups;
            this.channelList.render(channels, groups);

        } catch (error) {
            console.error('[App] Error loading playlist:', error);
        }
    }

    /**
     * Handle channel selected event
     */
    async handleChannelSelected(channel) {
        console.log(`[App] Playing: ${channel.name}`);
        console.log(`[App] URL: ${channel.url}`);

        // Clear any previous error
        this.hideError();

        // Disable recording while loading
        this.updateRecordButtonState(false);

        // Check if external player is enabled
        const settings = await window.electronAPI.getSettings();
        const externalPlayer = settings.externalPlayer;

        if (externalPlayer?.enabled && externalPlayer?.path) {
            // Open in external player directly
            await this.playInExternalPlayer(channel, externalPlayer);
            return;
        }

        // Hide external player overlay if visible (switching back to internal)
        this.hideExternalPlayerOverlay();

        // Use internal player
        this.showLoading(true);
        this.elements.currentChannelName.textContent = channel.name;
        this.elements.currentChannelGroup.textContent = channel.group || '';
        this.channelList.setActive(channel.id);

        // Update current channel for prev/next navigation
        this.playlistManager.currentChannel = channel;

        try {
            const success = await this.playerManager.load(channel.url);
            console.log(`[App] Load result: ${success}`);
            if (success) {
                this.playerManager.play();

                // Enable recording now that stream is playing
                this.updateRecordButtonState(true);

                // Update OS media controls
                this.updateMediaSession(channel);

                // Save to history
                window.electronAPI.addToHistory(channel);
                window.electronAPI.updateLastSession({
                    lastChannelId: channel.id,
                    lastChannelUrl: channel.url
                });
            }
        } catch (error) {
            console.error('[App] Channel load error:', error);
            this.handlePlayerError(error);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Play channel in external player
     */
    async playInExternalPlayer(channel, externalPlayer) {
        console.log(`[App] Opening in external player: ${externalPlayer.name}`);

        // Update UI
        this.elements.currentChannelName.textContent = channel.name;
        this.channelList.setActive(channel.id);

        // Stop internal player if playing
        this.playerManager.stop();

        // Show external player overlay
        this.showExternalPlayerOverlay(externalPlayer.name);

        try {
            const result = await window.electronAPI.openInExternalPlayer({
                playerPath: externalPlayer.path,
                streamUrl: channel.url,
                channelName: channel.name
            });

            if (result.error) {
                this.hideExternalPlayerOverlay();
                this.showToast(i18n.t('toast.externalPlayerError', { error: result.error }), 'error');
            } else {
                this.showToast(i18n.t('toast.playingInExternalPlayer', { name: externalPlayer.name }), 'success');

                // Save to history
                window.electronAPI.addToHistory(channel);
            }
        } catch (error) {
            console.error('[App] External player error:', error);
            this.hideExternalPlayerOverlay();
            this.showToast(i18n.t('toast.externalPlayerOpenError'), 'error');
        }
    }

    /**
     * Show external player overlay
     */
    showExternalPlayerOverlay(playerName) {
        const overlay = document.getElementById('external-player-overlay');
        const nameDisplay = document.getElementById('external-player-name-display');
        const controls = document.getElementById('player-controls');

        if (overlay) {
            overlay.classList.remove('hidden');
        }
        if (nameDisplay) {
            nameDisplay.textContent = playerName;
        }
        if (controls) {
            controls.style.display = 'none';
        }
    }

    /**
     * Hide external player overlay
     */
    hideExternalPlayerOverlay() {
        const overlay = document.getElementById('external-player-overlay');
        const controls = document.getElementById('player-controls');

        if (overlay) {
            overlay.classList.add('hidden');
        }
        if (controls) {
            controls.style.display = '';
        }
    }

    /**
     * Handle player state change
     */
    handlePlayerStateChange(state) {
        this.playerUI.updateState(state);
    }

    /**
     * Handle player error
     */
    handlePlayerError(error) {
        console.error('[App] Player error:', error);
        this.showLoading(false);

        // Parse error message
        let errorMessage = i18n.t('player.errors.unknown');
        if (error && typeof error === 'object') {
            if (error.type === 'networkError') {
                if (error.details === 'manifestLoadError') {
                    errorMessage = i18n.t('player.errors.serverOffline');
                } else {
                    errorMessage = i18n.t('player.errors.networkError');
                }
            } else if (error.type === 'mediaError') {
                errorMessage = i18n.t('player.errors.formatNotSupported');
            } else if (error.message) {
                if (error.message.includes('timeout')) {
                    errorMessage = i18n.t('player.errors.timeout');
                } else {
                    errorMessage = error.message;
                }
            }
        } else if (typeof error === 'string') {
            errorMessage = error;
        }

        // Show error overlay
        this.showError(errorMessage);

        // Show toast notification
        this.showToast(errorMessage, 'error');
    }

    /**
     * Show error overlay in player
     */
    showError(message) {
        const errorOverlay = document.getElementById('error-overlay');
        const errorMessage = document.getElementById('error-message');

        if (errorOverlay && errorMessage) {
            errorMessage.textContent = message;
            errorOverlay.classList.remove('hidden');
        }
    }

    /**
     * Hide error overlay
     */
    hideError() {
        const errorOverlay = document.getElementById('error-overlay');
        if (errorOverlay) {
            errorOverlay.classList.add('hidden');
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'error') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${type === 'error'
                ? '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
                : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'}
            </svg>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    /**
     * Handle general errors
     */
    handleError(error) {
        console.error('[App] Error:', error);
    }

    /**
     * Show/hide loading overlay
     */
    showLoading(show) {
        this.elements.loadingOverlay.classList.toggle('visible', show);
    }

    /**
     * Toggle recording state
     */
    toggleRecording() {
        if (!this.streamRecorder) return;

        if (this.streamRecorder.isRecording()) {
            this.streamRecorder.stop();
        } else {
            if (this.streamRecorder.start()) {
                this.elements.btnRecord.classList.add('recording');
                this.elements.btnRecord.querySelector('.icon-record').classList.add('hidden');
                this.elements.btnRecord.querySelector('.icon-recording').classList.remove('hidden');
                this.elements.btnRecord.title = i18n.t('player.controls.stopRecording');
                this.showToast(i18n.t('toast.recordingStarted'), 'success');
            }
        }
    }

    /**
     * Handle recording stop
     */
    async handleRecordingStop(blob, duration) {
        // Update button state
        this.elements.btnRecord.classList.remove('recording');
        this.elements.btnRecord.querySelector('.icon-record').classList.remove('hidden');
        this.elements.btnRecord.querySelector('.icon-recording').classList.add('hidden');
        this.elements.btnRecord.title = i18n.t('player.controls.record');

        // Get channel name for filename
        const channelName = this.playlistManager.currentChannel?.name || 'recording';

        // Save the recording
        const savedPath = await this.streamRecorder.save(channelName);
        if (savedPath) {
            const durationStr = Math.round(duration / 1000);
            this.showToast(i18n.t('toast.recordingSaved', { duration: durationStr }), 'success');
        }
    }

    /**
     * Load recording preset from settings
     */
    async loadRecordingPreset() {
        try {
            const preset = await window.electronAPI.getSetting('recording.preset');
            if (preset && this.streamRecorder) {
                this.streamRecorder.setPreset(preset);
            }
        } catch (error) {
            console.error('[App] Error loading recording preset:', error);
        }
    }

    /**
     * Update record button state based on playback
     */
    updateRecordButtonState(canRecord) {
        if (this.elements.btnRecord) {
            this.elements.btnRecord.disabled = !canRecord;
        }
    }

    /**
     * Update OS media session with channel info
     */
    updateMediaSession(channel) {
        if ('mediaSession' in navigator) {
            const artwork = [];

            // Add channel logo if available
            if (channel.logo) {
                artwork.push({
                    src: channel.logo,
                    sizes: '512x512',
                    type: 'image/png'
                });
            }

            navigator.mediaSession.metadata = new MediaMetadata({
                title: channel.name,
                artist: channel.group || '',
                album: 'Flum IPTV',
                artwork: artwork
            });

            // Set action handlers
            navigator.mediaSession.setActionHandler('play', () => {
                this.playerManager.play();
            });
            navigator.mediaSession.setActionHandler('pause', () => {
                this.playerManager.pause();
            });
            navigator.mediaSession.setActionHandler('stop', () => {
                this.playerManager.stop();
            });
        }
    }
}

// Wait for libraries and DOM before initializing
function waitForLibraries(timeout = 5000) {
    return new Promise((resolve) => {
        const startTime = Date.now();

        function check() {
            const hlsReady = window.Hls && typeof window.Hls.isSupported === 'function';
            const dashReady = window.dashjs && typeof window.dashjs.MediaPlayer === 'function';

            console.log(`[App] Library check - HLS: ${hlsReady}, DASH: ${dashReady}`);

            if (hlsReady && dashReady) {
                resolve();
            } else if (Date.now() - startTime > timeout) {
                console.warn('[App] Libraries not loaded in time, proceeding anyway');
                resolve();
            } else {
                setTimeout(check, 100);
            }
        }
        check();
    });
}

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    await waitForLibraries();
    const app = new App();
    await app.init();
});
