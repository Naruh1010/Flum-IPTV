/**
 * I18n - Internationalization Module
 * 
 * Handles multi-language support with automatic
 * locale detection and dynamic language switching.
 */

export class I18n {
    constructor() {
        this.currentLocale = 'es';
        this.translations = {};
        this.supportedLocales = ['es', 'en', 'pt'];
        this.defaultLocale = 'es';

        // Event callback for language changes
        this.onLocaleChange = null;
    }

    /**
     * Initialize the i18n system
     * @param {string} savedLocale - Previously saved locale preference ('system' or locale code)
     */
    async initialize(savedLocale = 'system') {
        // Load all translations
        await this.loadAllTranslations();

        // Determine which locale to use
        if (savedLocale === 'system') {
            this.currentLocale = this.detectSystemLocale();
        } else if (this.supportedLocales.includes(savedLocale)) {
            this.currentLocale = savedLocale;
        } else {
            this.currentLocale = this.defaultLocale;
        }

        console.log(`[I18n] Initialized with locale: ${this.currentLocale}`);
        return this.currentLocale;
    }

    /**
     * Load all translation files
     */
    async loadAllTranslations() {
        const locales = ['es', 'en', 'pt'];
        
        for (const locale of locales) {
            try {
                const response = await fetch(`../locales/${locale}.json`);
                this.translations[locale] = await response.json();
            } catch (error) {
                console.error(`[I18n] Failed to load locale: ${locale}`, error);
            }
        }

        console.log(`[I18n] Loaded ${Object.keys(this.translations).length} locales`);
    }

    /**
     * Detect system locale from browser/OS
     * @returns {string} Detected locale code
     */
    detectSystemLocale() {
        const systemLang = navigator.language || navigator.userLanguage || 'es';
        const langCode = systemLang.split('-')[0].toLowerCase();

        if (this.supportedLocales.includes(langCode)) {
            return langCode;
        }

        return this.defaultLocale;
    }

    /**
     * Set the current locale
     * @param {string} locale - Locale code or 'system'
     */
    setLocale(locale) {
        let newLocale;

        if (locale === 'system') {
            newLocale = this.detectSystemLocale();
        } else if (this.supportedLocales.includes(locale)) {
            newLocale = locale;
        } else {
            console.warn(`[I18n] Unsupported locale: ${locale}`);
            return;
        }

        this.currentLocale = newLocale;
        this.applyTranslations();

        if (this.onLocaleChange) {
            this.onLocaleChange(newLocale);
        }

        console.log(`[I18n] Locale changed to: ${newLocale}`);
    }

    /**
     * Get translated string by key
     * @param {string} key - Translation key (dot notation supported)
     * @param {Object} params - Optional parameters for interpolation
     * @returns {string} Translated string or key if not found
     */
    t(key, params = {}) {
        let translation = this.getNestedValue(this.translations[this.currentLocale], key);

        // Fallback to default locale
        if (!translation && this.currentLocale !== this.defaultLocale) {
            translation = this.getNestedValue(this.translations[this.defaultLocale], key);
        }

        // Return key if no translation found
        if (!translation) {
            console.warn(`[I18n] Missing translation: ${key}`);
            return key;
        }

        // Interpolate parameters
        return this.interpolate(translation, params);
    }

    /**
     * Get nested value from object using dot notation
     * @param {Object} obj - Object to search
     * @param {string} path - Dot-notation path
     * @returns {string|undefined} Value at path
     */
    getNestedValue(obj, path) {
        if (!obj) return undefined;
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Interpolate parameters into string
     * @param {string} str - String with {param} placeholders
     * @param {Object} params - Parameters to interpolate
     * @returns {string} Interpolated string
     */
    interpolate(str, params) {
        return str.replace(/\{(\w+)\}/g, (match, key) => {
            return params[key] !== undefined ? params[key] : match;
        });
    }

    /**
     * Apply translations to all elements with data-i18n attribute
     */
    applyTranslations() {
        const elements = document.querySelectorAll('[data-i18n]');

        elements.forEach(el => {
            const key = el.dataset.i18n;
            const translation = this.t(key);

            // Handle different element types
            if (el.tagName === 'INPUT' && el.placeholder !== undefined) {
                el.placeholder = translation;
            } else if (el.tagName === 'OPTION') {
                el.textContent = translation;
            } else {
                el.textContent = translation;
            }
        });

        // Also update title attributes
        const titleElements = document.querySelectorAll('[data-i18n-title]');
        titleElements.forEach(el => {
            const key = el.dataset.i18nTitle;
            el.title = this.t(key);
        });

        console.log(`[I18n] Applied translations to ${elements.length} elements`);
    }

    /**
     * Get list of supported locales with labels
     * @returns {Array} Array of {code, label} objects
     */
    getSupportedLocales() {
        return [
            { code: 'system', label: this.t('settings.language.system') },
            { code: 'es', label: 'Español' },
            { code: 'en', label: 'English' },
            { code: 'pt', label: 'Português' }
        ];
    }

    /**
     * Get current locale code
     * @returns {string} Current locale code
     */
    getCurrentLocale() {
        return this.currentLocale;
    }
}

// Singleton instance
export const i18n = new I18n();

// Shorthand translation function
export function t(key, params) {
    return i18n.t(key, params);
}
