/**
 * KeyboardShortcuts - Configurable Keyboard Shortcuts Module
 * 
 * Manages keyboard shortcuts with customizable key bindings.
 * Shortcuts are persisted via settings and can be rebound
 * from the settings UI.
 */

// Default shortcut bindings
const DEFAULT_SHORTCUTS = {
    playPause: ' ',
    mute: 'm',
    fullscreen: 'f',
    volumeUp: 'ArrowUp',
    volumeDown: 'ArrowDown',
    prevChannel: 'ArrowLeft',
    nextChannel: 'ArrowRight'
};

// Display-friendly key names
const KEY_DISPLAY_NAMES = {
    ' ': 'Space',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'Escape': 'Esc',
    'Delete': 'Del',
    'Backspace': '⌫',
    'Enter': 'Enter',
    'Tab': 'Tab'
};

class KeyboardShortcuts {
    constructor() {
        this.shortcuts = { ...DEFAULT_SHORTCUTS };
        this.actions = {};
        this.enabled = true;
        this._handler = null;
    }

    /**
     * Initialize shortcuts with saved bindings and action callbacks
     * @param {Object} actions - Map of action name to callback function
     */
    async initialize(actions) {
        this.actions = actions;

        // Load custom bindings from settings
        try {
            const settings = await window.electronAPI.getSettings();
            const saved = settings.shortcuts;
            if (saved && typeof saved === 'object') {
                // Merge only valid keys
                for (const action of Object.keys(DEFAULT_SHORTCUTS)) {
                    if (saved[action]) {
                        this.shortcuts[action] = saved[action];
                    }
                }
            }
        } catch (error) {
            console.error('[KeyboardShortcuts] Error loading shortcuts:', error);
        }

        // Register global keydown listener
        this._handler = (e) => this.handleKeydown(e);
        document.addEventListener('keydown', this._handler);

        console.log('[KeyboardShortcuts] Initialized');
    }

    /**
     * Handle keydown events
     */
    handleKeydown(e) {
        if (!this.enabled) return;

        // Ignore when typing in inputs
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        // Find matching action
        const action = this.getActionForKey(e.key);
        if (!action) return;

        // Prevent default for navigation keys
        const preventKeys = [' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        if (preventKeys.includes(e.key)) {
            e.preventDefault();
        }

        // Execute the action
        if (this.actions[action]) {
            this.actions[action]();
        }
    }

    /**
     * Find which action is bound to a key
     * @param {string} key - The key value from KeyboardEvent
     * @returns {string|null} Action name or null
     */
    getActionForKey(key) {
        for (const [action, boundKey] of Object.entries(this.shortcuts)) {
            if (boundKey === key) return action;
        }
        return null;
    }

    /**
     * Get all current bindings
     * @returns {Object} Copy of current shortcuts map
     */
    getBindings() {
        return { ...this.shortcuts };
    }

    /**
     * Get default bindings
     * @returns {Object} Copy of default shortcuts map
     */
    getDefaults() {
        return { ...DEFAULT_SHORTCUTS };
    }

    /**
     * Rebind an action to a new key
     * @param {string} action - Action name
     * @param {string} key - New key binding
     */
    async rebind(action, key) {
        if (!(action in DEFAULT_SHORTCUTS)) return;

        // Remove any other action bound to this key
        for (const [a, k] of Object.entries(this.shortcuts)) {
            if (k === key && a !== action) {
                this.shortcuts[a] = '';
            }
        }

        this.shortcuts[action] = key;
        await this.save();
    }

    /**
     * Reset all shortcuts to defaults
     */
    async resetToDefaults() {
        this.shortcuts = { ...DEFAULT_SHORTCUTS };
        await this.save();
    }

    /**
     * Save current bindings to settings
     */
    async save() {
        try {
            await window.electronAPI.setSetting('shortcuts', this.shortcuts);
            console.log('[KeyboardShortcuts] Shortcuts saved');
        } catch (error) {
            console.error('[KeyboardShortcuts] Error saving shortcuts:', error);
        }
    }

    /**
     * Get display-friendly name for a key
     * @param {string} key - The key value
     * @returns {string} Human-readable key name
     */
    static getKeyDisplayName(key) {
        if (!key) return '—';
        if (KEY_DISPLAY_NAMES[key]) return KEY_DISPLAY_NAMES[key];
        // Capitalize single letters
        if (key.length === 1) return key.toUpperCase();
        return key;
    }

    /**
     * Temporarily disable shortcuts (e.g., during rebind)
     */
    disable() {
        this.enabled = false;
    }

    /**
     * Re-enable shortcuts
     */
    enable() {
        this.enabled = true;
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this._handler) {
            document.removeEventListener('keydown', this._handler);
        }
    }
}

// Singleton
export const keyboardShortcuts = new KeyboardShortcuts();
