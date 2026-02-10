/**
 * QualitySelector - Video Quality Selection Module
 * 
 * Manages a popup dropdown for switching between available
 * quality levels on HLS/DASH streams. Shows resolution labels
 * (e.g. 1080p, 720p) plus an "Auto" option.
 */

import { i18n } from './i18n.js';

class QualitySelector {
    constructor() {
        this.playerManager = null;
        this.popup = null;
        this.button = null;
        this.currentQuality = -1; // -1 = auto
        this.levels = [];
        this._outsideClickHandler = null;
    }

    /**
     * Initialize the quality selector
     * @param {Object} playerManager - PlayerManager instance
     */
    initialize(playerManager) {
        this.playerManager = playerManager;
        this.button = document.getElementById('btn-quality');
        this.popup = document.getElementById('quality-popup');

        if (!this.button || !this.popup) {
            console.warn('[QualitySelector] Elements not found');
            return;
        }

        this.button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        this._outsideClickHandler = (e) => {
            if (!this.popup.contains(e.target) && !this.button.contains(e.target)) {
                this.hide();
            }
        };

        document.addEventListener('click', this._outsideClickHandler);

        // Hide button initially (shown when levels are available)
        this.button.classList.add('hidden');
    }

    /**
     * Update quality levels from the current stream
     */
    updateLevels() {
        if (!this.playerManager) return;

        this.levels = this.playerManager.getQualityLevels();
        this.currentQuality = -1; // Reset to auto on new stream

        if (this.levels.length <= 1) {
            // Hide button if 0 or 1 quality level
            this.button?.classList.add('hidden');
            return;
        }

        this.button?.classList.remove('hidden');
        this.render();
    }

    /**
     * Clear levels (when stream stops)
     */
    clear() {
        this.levels = [];
        this.currentQuality = -1;
        this.button?.classList.add('hidden');
        this.hide();
    }

    /**
     * Render quality options in the popup
     */
    render() {
        if (!this.popup) return;

        this.popup.innerHTML = '';

        // Auto option
        const autoOption = document.createElement('button');
        autoOption.className = `quality-option${this.currentQuality === -1 ? ' active' : ''}`;
        autoOption.textContent = i18n.t('player.quality.auto');
        autoOption.addEventListener('click', () => this.select(-1));
        this.popup.appendChild(autoOption);

        // Sort levels by height descending (highest quality first)
        const sorted = [...this.levels].sort((a, b) => (b.height || 0) - (a.height || 0));

        for (const level of sorted) {
            const option = document.createElement('button');
            const isActive = this.currentQuality === level.index;
            option.className = `quality-option${isActive ? ' active' : ''}`;
            option.textContent = this.formatLabel(level);
            option.addEventListener('click', () => this.select(level.index));
            this.popup.appendChild(option);
        }
    }

    /**
     * Format quality label from level info
     * @param {Object} level - Quality level object
     * @returns {string} Formatted label
     */
    formatLabel(level) {
        if (level.height) {
            return `${level.height}p`;
        }
        if (level.bitrate) {
            const kbps = Math.round(level.bitrate / 1000);
            return kbps >= 1000 ? `${(kbps / 1000).toFixed(1)} Mbps` : `${kbps} kbps`;
        }
        return `Level ${level.index}`;
    }

    /**
     * Select a quality level
     * @param {number} index - Quality level index (-1 for auto)
     */
    select(index) {
        this.currentQuality = index;
        this.playerManager?.setQuality(index);
        this.render();
        this.hide();
    }

    /**
     * Toggle popup visibility
     */
    toggle() {
        if (this.popup.classList.contains('visible')) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Show quality popup
     */
    show() {
        if (!this.popup || this.levels.length <= 1) return;
        this.render(); // Re-render in case state changed
        this.popup.classList.add('visible');
    }

    /**
     * Hide quality popup
     */
    hide() {
        this.popup?.classList.remove('visible');
    }

    /**
     * Clean up
     */
    destroy() {
        if (this._outsideClickHandler) {
            document.removeEventListener('click', this._outsideClickHandler);
        }
    }
}

export const qualitySelector = new QualitySelector();
