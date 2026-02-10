/**
 * SettingsView - Application Settings Component
 * 
 * Manages application settings including theme,
 * OS accent color sync, cache, and data folder.
 */

import { i18n } from '../modules/i18n.js';
import { keyboardShortcuts } from '../modules/keyboard-shortcuts.js';

export class SettingsView {
    constructor({ onBack, onRecordingPresetChange, onLanguageChange }) {
        this.onBack = onBack;
        this.onRecordingPresetChange = onRecordingPresetChange;
        this.onLanguageChange = onLanguageChange;

        this.cacheElements();
        this.setupEventListeners();
    }

    cacheElements() {
        this.view = document.getElementById('settings-view');
        this.btnBack = document.getElementById('btn-back-from-settings');

        // Appearance
        this.themeSelect = document.getElementById('setting-theme');
        this.useOsColorToggle = document.getElementById('setting-use-os-color');
        this.customColorContainer = document.getElementById('custom-color-container');
        this.customColorPicker = document.getElementById('setting-custom-color');
        this.languageSelect = document.getElementById('setting-language');

        // Data
        this.cacheSizeInfo = document.getElementById('cache-size-info');
        this.btnOpenDataFolder = document.getElementById('btn-open-data-folder');
        this.btnClearCache = document.getElementById('btn-clear-cache');

        // External Player
        this.useExternalPlayerToggle = document.getElementById('setting-use-external-player');
        this.externalPlayerPathContainer = document.getElementById('external-player-path-container');
        this.externalPlayerPath = document.getElementById('external-player-path');
        this.btnSelectPlayer = document.getElementById('btn-select-player');
        this.detectedPlayerContainer = document.getElementById('external-player-detected');
        this.detectedPlayersSelect = document.getElementById('detected-players-select');

        // Recording
        this.recordingPresetSelect = document.getElementById('setting-recording-preset');

        // Shortcuts
        this.shortcutsContainer = document.getElementById('shortcuts-container');
        this.btnResetShortcuts = document.getElementById('btn-reset-shortcuts');

        // Reset
        this.btnResetSettings = document.getElementById('btn-reset-settings');
    }

    setupEventListeners() {
        this.btnBack.addEventListener('click', () => this.onBack?.());

        // Theme
        this.themeSelect.addEventListener('change', (e) => this.setTheme(e.target.value));

        // OS Color toggle
        this.useOsColorToggle.addEventListener('change', (e) => {
            this.toggleOsColor(e.target.checked);
        });

        // Custom color
        this.customColorPicker.addEventListener('change', (e) => {
            this.setCustomColor(e.target.value);
        });

        // Data actions
        this.btnOpenDataFolder.addEventListener('click', () => this.openDataFolder());
        this.btnClearCache.addEventListener('click', () => this.clearCache());

        // External Player
        this.useExternalPlayerToggle?.addEventListener('change', (e) => {
            this.toggleExternalPlayer(e.target.checked);
        });
        this.btnSelectPlayer?.addEventListener('click', () => this.selectExternalPlayer());
        this.detectedPlayersSelect?.addEventListener('change', (e) => this.onDetectedPlayerSelect(e.target.value));

        // Recording preset
        this.recordingPresetSelect?.addEventListener('change', (e) => {
            window.electronAPI.setSetting('recording.preset', e.target.value);
            this.onRecordingPresetChange?.(e.target.value);
        });

        // Language
        this.languageSelect?.addEventListener('change', (e) => {
            window.electronAPI.setSetting('ui.language', e.target.value);
            this.onLanguageChange?.(e.target.value);
            this.renderShortcuts();
            this.updateDetectedPlayersLabel();
        });

        // Reset
        this.btnResetSettings.addEventListener('click', () => this.resetSettings());

        // Reset shortcuts
        this.btnResetShortcuts?.addEventListener('click', () => this.resetShortcuts());
    }

    async loadSettings() {
        try {
            const settings = await window.electronAPI.getSettings();

            // Theme
            this.themeSelect.value = settings.ui?.theme || 'system';

            // OS Color (default to false)
            this.useOsColorToggle.checked = settings.ui?.useOsColor === true;
            this.updateColorPickerVisibility();

            // Custom color
            if (settings.ui?.customColor) {
                this.customColorPicker.value = settings.ui.customColor;
            }

            // Language
            if (this.languageSelect) {
                this.languageSelect.value = settings.ui?.language || 'system';
            }

            // Get cache stats
            const stats = await window.electronAPI.getCacheStats();
            this.cacheSizeInfo.textContent = this.formatBytes(stats.totalSize);

            // External Player
            if (this.useExternalPlayerToggle) {
                this.useExternalPlayerToggle.checked = settings.externalPlayer?.enabled || false;
                this.updateExternalPlayerVisibility();

                if (settings.externalPlayer?.path) {
                    this.externalPlayerPath.textContent = settings.externalPlayer.name || settings.externalPlayer.path;
                    this.currentExternalPlayer = settings.externalPlayer;
                }

                // Detect available players
                await this.detectExternalPlayers();
            }

            // Recording preset
            if (this.recordingPresetSelect && settings.recording?.preset) {
                this.recordingPresetSelect.value = settings.recording.preset;
            }

            // Render keyboard shortcuts
            this.renderShortcuts();

        } catch (error) {
            console.error('[SettingsView] Error loading settings:', error);
        }
    }

    async setTheme(theme) {
        await window.electronAPI.setSetting('ui.theme', theme);
        this.applyTheme(theme);
    }

    applyTheme(theme) {
        let isDark;
        if (theme === 'system') {
            // Check system preference
            isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
        } else {
            isDark = theme === 'dark';
            document.documentElement.dataset.theme = theme;
        }

        // Update native titlebar colors
        window.electronAPI.updateTitleBarOverlay(isDark);
    }

    async toggleOsColor(useOs) {
        await window.electronAPI.setSetting('ui.useOsColor', useOs);
        this.updateColorPickerVisibility();

        if (useOs) {
            await this.applyOsAccentColor();
        } else {
            this.applyCustomColor(this.customColorPicker.value);
        }
    }

    updateColorPickerVisibility() {
        this.customColorContainer.style.display = this.useOsColorToggle.checked ? 'none' : 'flex';
    }

    async applyOsAccentColor() {
        try {
            const color = await window.electronAPI.getOsAccentColor();
            if (color) {
                this.applyAccentColor(color);
            }
        } catch (error) {
            console.error('[SettingsView] Error getting OS color:', error);
        }
    }

    async setCustomColor(color) {
        await window.electronAPI.setSetting('ui.customColor', color);
        this.applyCustomColor(color);
    }

    applyCustomColor(color) {
        this.applyAccentColor(color);
    }

    applyAccentColor(color) {
        document.documentElement.style.setProperty('--accent-primary', color);
        document.documentElement.style.setProperty('--accent-secondary', this.lightenColor(color, 20));
        document.documentElement.style.setProperty('--accent-gradient',
            `linear-gradient(135deg, ${color} 0%, ${this.lightenColor(color, 20)} 100%)`);
        document.documentElement.style.setProperty('--border-glow', `${color}4d`);
        document.documentElement.style.setProperty('--shadow-glow', `0 0 20px ${color}33`);
    }

    lightenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
    }

    async openDataFolder() {
        await window.electronAPI.openDataFolder();
    }

    async clearCache() {
        if (confirm(i18n.t('modal.confirm.clearCache'))) {
            await window.electronAPI.clearIconCache();
            const stats = await window.electronAPI.getCacheStats();
            this.cacheSizeInfo.textContent = this.formatBytes(stats.totalSize);
            console.log('[SettingsView] Cache cleared');
        }
    }

    async resetSettings() {
        if (confirm(i18n.t('modal.confirm.resetSettings'))) {
            await window.electronAPI.factoryReset();
            // App will restart, no need for further code
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async initialize() {
        await this.loadSettings();

        // Apply theme on load
        const settings = await window.electronAPI.getSettings();
        this.applyTheme(settings.ui?.theme || 'system');

        // Apply accent color
        if (settings.ui?.useOsColor !== false) {
            await this.applyOsAccentColor();
        } else if (settings.ui?.customColor) {
            this.applyCustomColor(settings.ui.customColor);
        }

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (this.themeSelect.value === 'system') {
                this.applyTheme('system');
            }
        });
    }

    // ========== External Player Methods ==========

    async toggleExternalPlayer(enabled) {
        await window.electronAPI.setSetting('externalPlayer.enabled', enabled);
        this.updateExternalPlayerVisibility();
    }

    updateExternalPlayerVisibility() {
        const enabled = this.useExternalPlayerToggle?.checked;
        if (this.externalPlayerPathContainer) {
            this.externalPlayerPathContainer.style.display = enabled ? 'flex' : 'none';
        }
        if (this.detectedPlayerContainer && this.detectedPlayers?.length > 0) {
            this.detectedPlayerContainer.style.display = enabled ? 'flex' : 'none';
        }
    }

    async detectExternalPlayers() {
        try {
            this.detectedPlayers = await window.electronAPI.detectExternalPlayers();

            if (this.detectedPlayers.length > 0 && this.detectedPlayerContainer && this.detectedPlayersSelect) {
                // Clear existing options
                this.detectedPlayersSelect.innerHTML = '';

                // Add a default option
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = i18n.t('settings.externalPlayer.detectedPlayers', { count: this.detectedPlayers.length });
                this.detectedPlayersSelect.appendChild(defaultOption);

                // Add all detected players
                for (const player of this.detectedPlayers) {
                    const option = document.createElement('option');
                    option.value = player.path;
                    option.textContent = player.name;
                    option.dataset.name = player.name;
                    this.detectedPlayersSelect.appendChild(option);
                }

                // Select current player if configured
                if (this.currentExternalPlayer?.path) {
                    this.detectedPlayersSelect.value = this.currentExternalPlayer.path;
                }

                this.detectedPlayerContainer.style.display = this.useExternalPlayerToggle?.checked ? 'flex' : 'none';
            }
        } catch (error) {
            console.error('[SettingsView] Error detecting players:', error);
        }
    }

    async selectExternalPlayer() {
        try {
            const player = await window.electronAPI.selectExternalPlayer();
            if (player) {
                this.currentExternalPlayer = player;
                this.externalPlayerPath.textContent = player.name;
                await window.electronAPI.setSetting('externalPlayer.path', player.path);
                await window.electronAPI.setSetting('externalPlayer.name', player.name);
                console.log('[SettingsView] External player set:', player.name);
            }
        } catch (error) {
            console.error('[SettingsView] Error selecting player:', error);
        }
    }

    async onDetectedPlayerSelect(playerPath) {
        if (!playerPath) return;

        const player = this.detectedPlayers.find(p => p.path === playerPath);
        if (player) {
            this.currentExternalPlayer = player;
            this.externalPlayerPath.textContent = player.name;
            await window.electronAPI.setSetting('externalPlayer.path', player.path);
            await window.electronAPI.setSetting('externalPlayer.name', player.name);
            console.log('[SettingsView] Using detected player:', player.name);
        }
    }

    /**
     * Update detected players dropdown label (for language changes)
     */
    updateDetectedPlayersLabel() {
        if (!this.detectedPlayersSelect || !this.detectedPlayers?.length) return;

        const defaultOption = this.detectedPlayersSelect.querySelector('option[value=""]');
        if (defaultOption) {
            defaultOption.textContent = i18n.t('settings.externalPlayer.detectedPlayers', { count: this.detectedPlayers.length });
        }
    }

    show() {
        this.view.classList.add('active');
        this.loadSettings();
    }

    hide() {
        this.view.classList.remove('active');
    }

    // ========== Keyboard Shortcuts Methods ==========

    /**
     * Render shortcut items in settings
     */
    renderShortcuts() {
        if (!this.shortcutsContainer) return;

        const bindings = keyboardShortcuts.getBindings();
        const actionLabels = {
            playPause: i18n.t('settings.shortcuts.playPause'),
            mute: i18n.t('settings.shortcuts.mute'),
            fullscreen: i18n.t('settings.shortcuts.fullscreen'),
            volumeUp: i18n.t('settings.shortcuts.volumeUp'),
            volumeDown: i18n.t('settings.shortcuts.volumeDown'),
            prevChannel: i18n.t('settings.shortcuts.prevChannel'),
            nextChannel: i18n.t('settings.shortcuts.nextChannel')
        };

        this.shortcutsContainer.innerHTML = '';

        for (const [action, key] of Object.entries(bindings)) {
            const item = document.createElement('div');
            item.className = 'setting-item';

            const info = document.createElement('div');
            info.className = 'setting-info';

            const label = document.createElement('span');
            label.className = 'setting-label';
            label.textContent = actionLabels[action] || action;

            info.appendChild(label);

            const kbd = document.createElement('kbd');
            kbd.className = 'shortcut-key';
            kbd.textContent = keyboardShortcuts.constructor.getKeyDisplayName(key);
            kbd.dataset.action = action;

            kbd.addEventListener('click', () => this.startListening(kbd, action));

            item.appendChild(info);
            item.appendChild(kbd);
            this.shortcutsContainer.appendChild(item);
        }
    }

    /**
     * Start listening for a new key binding
     */
    startListening(kbdElement, action) {
        // Remove previous listener if any
        this.stopListening();

        this.listeningElement = kbdElement;
        this.listeningAction = action;

        kbdElement.classList.add('listening');
        kbdElement.textContent = i18n.t('settings.shortcuts.pressKey');

        // Disable shortcuts while rebinding
        keyboardShortcuts.disable();

        this._rebindHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Escape cancels
            if (e.key === 'Escape') {
                this.stopListening();
                this.renderShortcuts();
                return;
            }

            // Bind the new key
            keyboardShortcuts.rebind(action, e.key);
            this.stopListening();
            this.renderShortcuts();
        };

        document.addEventListener('keydown', this._rebindHandler, { once: true });
    }

    /**
     * Stop listening for key binding
     */
    stopListening() {
        if (this.listeningElement) {
            this.listeningElement.classList.remove('listening');
            this.listeningElement = null;
        }
        if (this._rebindHandler) {
            document.removeEventListener('keydown', this._rebindHandler);
            this._rebindHandler = null;
        }
        keyboardShortcuts.enable();
    }

    /**
     * Reset all shortcuts to defaults
     */
    async resetShortcuts() {
        await keyboardShortcuts.resetToDefaults();
        this.renderShortcuts();
    }
}
