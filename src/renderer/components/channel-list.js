/**
 * ChannelList - Channel List Component
 * 
 * Renders and manages the channel list sidebar with
 * search, filtering, favorites, and selection functionality.
 */

import { i18n } from '../modules/i18n.js';

export class ChannelList {
    constructor({ container, emptyState, searchInput, groupSelect, onChannelClick }) {
        this.container = container;
        this.emptyState = emptyState;
        this.searchInput = searchInput;
        this.groupSelect = groupSelect;
        this.onChannelClick = onChannelClick;

        this.channels = [];
        this.groups = {};
        this.activeChannelId = null;
        this.favorites = new Set();

        this.init();
    }

    /**
     * Initialize component
     */
    init() {
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search input
        this.searchInput.addEventListener('input', (e) => {
            this.filterChannels(e.target.value, this.groupSelect.value);
        });

        // Group filter
        this.groupSelect.addEventListener('change', (e) => {
            this.filterChannels(this.searchInput.value, e.target.value);
        });
    }

    /**
     * Load favorites from storage
     */
    async loadFavorites() {
        try {
            const favs = await window.electronAPI.getFavorites();
            this.favorites = new Set(favs);
        } catch (error) {
            console.error('[ChannelList] Error loading favorites:', error);
            this.favorites = new Set();
        }
    }

    /**
     * Render channel list and populate group filter
     */
    async render(channels, groups) {
        this.channels = channels;
        this.groups = groups;

        // Load favorites before rendering
        await this.loadFavorites();

        // Update group select options
        this.updateGroupSelect(Object.keys(groups));

        // Cache all channel icons in background
        this.cacheChannelIcons(channels);

        // Render channels
        this.renderChannels(channels);

        // Hide empty state
        this.emptyState.classList.add('hidden');
    }

    /**
     * Cache channel icons in the background
     */
    async cacheChannelIcons(channels) {
        try {
            // Get all logo URLs
            const logoUrls = channels
                .filter(c => c.logo)
                .map(c => c.logo);

            if (logoUrls.length === 0) return;

            console.log(`[ChannelList] Caching ${logoUrls.length} icons...`);

            // Bulk cache icons
            const cachedIcons = await window.electronAPI.bulkCacheIcons(logoUrls);

            // Update logos with cached versions
            this.channels.forEach(channel => {
                if (channel.logo && cachedIcons[channel.logo]) {
                    channel.cachedLogo = cachedIcons[channel.logo];
                }
            });

            // Re-render with cached logos
            this.filterChannels(this.searchInput.value, this.groupSelect.value);

            console.log('[ChannelList] Icon caching complete');
        } catch (error) {
            console.error('[ChannelList] Error caching icons:', error);
        }
    }

    /**
     * Update group select dropdown
     */
    updateGroupSelect(groupNames) {
        // Clear existing options except first
        while (this.groupSelect.options.length > 1) {
            this.groupSelect.remove(1);
        }

        // Add favorites group if there are favorites
        if (this.favorites.size > 0) {
            const favOption = document.createElement('option');
            favOption.value = '__favorites__';
            favOption.textContent = i18n.t('player.favorites');
            this.groupSelect.appendChild(favOption);
        }

        // Add group options
        groupNames.sort().forEach(group => {
            const option = document.createElement('option');
            option.value = group;
            option.textContent = `${group} (${this.groups[group].length})`;
            this.groupSelect.appendChild(option);
        });
    }

    /**
     * Render list of channels
     */
    renderChannels(channels) {
        // Clear container (keeping empty state)
        const items = this.container.querySelectorAll('.channel-item');
        items.forEach(item => item.remove());

        // Create channel items
        const fragment = document.createDocumentFragment();

        channels.forEach(channel => {
            const item = this.createChannelItem(channel);
            fragment.appendChild(item);
        });

        this.container.appendChild(fragment);
    }

    /**
     * Create a channel item element
     */
    createChannelItem(channel) {
        const item = document.createElement('div');
        item.className = 'channel-item';
        item.dataset.id = channel.id;

        if (channel.id === this.activeChannelId) {
            item.classList.add('active');
        }

        // Logo or placeholder
        const logoUrl = channel.cachedLogo || channel.logo;
        if (logoUrl) {
            const logo = document.createElement('img');
            logo.className = 'channel-logo';
            logo.src = logoUrl;
            logo.alt = channel.name;
            logo.onerror = () => {
                logo.replaceWith(this.createLogoPlaceholder(channel.name));
            };
            item.appendChild(logo);
        } else {
            item.appendChild(this.createLogoPlaceholder(channel.name));
        }

        // Info container
        const info = document.createElement('div');
        info.className = 'channel-info';

        const name = document.createElement('div');
        name.className = 'channel-name';
        name.textContent = channel.name;
        info.appendChild(name);

        const group = document.createElement('div');
        group.className = 'channel-group';
        group.textContent = channel.group;
        info.appendChild(group);

        item.appendChild(info);

        // Favorite button
        const favBtn = this.createFavoriteButton(channel);
        item.appendChild(favBtn);

        // Click handler
        item.addEventListener('click', () => {
            if (this.onChannelClick) {
                this.onChannelClick(channel);
            }
        });

        return item;
    }

    /**
     * Create favorite toggle button
     */
    createFavoriteButton(channel) {
        const btn = document.createElement('button');
        btn.className = 'favorite-btn';
        const isFav = this.favorites.has(channel.url);

        if (isFav) {
            btn.classList.add('active');
        }

        // Star SVG icon
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>`;

        btn.title = isFav ? i18n.t('player.removeFavorite') : i18n.t('player.addFavorite');

        // Click handler - stop propagation to prevent channel play
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.toggleFavorite(channel, btn);
        });

        return btn;
    }

    /**
     * Toggle favorite status for a channel
     */
    async toggleFavorite(channel, btn) {
        try {
            const result = await window.electronAPI.toggleFavorite(channel.url);
            const isFav = result.isFavorite;

            if (isFav) {
                this.favorites.add(channel.url);
                btn.classList.add('active');
            } else {
                this.favorites.delete(channel.url);
                btn.classList.remove('active');
            }

            // Update star icon fill
            const svg = btn.querySelector('svg');
            if (svg) {
                svg.setAttribute('fill', isFav ? 'currentColor' : 'none');
            }

            btn.title = isFav ? i18n.t('player.removeFavorite') : i18n.t('player.addFavorite');

            // Refresh group select to show/hide favorites group
            this.updateGroupSelect(Object.keys(this.groups));

            // If currently filtering by favorites, re-render
            if (this.groupSelect.value === '__favorites__') {
                this.filterChannels(this.searchInput.value, '__favorites__');
            }
        } catch (error) {
            console.error('[ChannelList] Error toggling favorite:', error);
        }
    }

    /**
     * Create logo placeholder with initials
     */
    createLogoPlaceholder(name) {
        const placeholder = document.createElement('div');
        placeholder.className = 'channel-logo-placeholder';
        placeholder.textContent = name.charAt(0).toUpperCase();
        return placeholder;
    }

    /**
     * Filter channels by search query and group
     */
    filterChannels(query, group) {
        let filtered = this.channels;

        // Filter by favorites
        if (group === '__favorites__') {
            filtered = filtered.filter(c => this.favorites.has(c.url));
        }
        // Filter by group
        else if (group && group !== 'all') {
            filtered = filtered.filter(c => c.group === group);
        }

        // Filter by search query
        if (query && query.trim()) {
            const lowerQuery = query.toLowerCase();
            filtered = filtered.filter(c =>
                c.name.toLowerCase().includes(lowerQuery)
            );
        }

        this.renderChannels(filtered);
    }

    /**
     * Set active channel by ID
     */
    setActive(channelId) {
        this.activeChannelId = channelId;

        // Update UI
        const items = this.container.querySelectorAll('.channel-item');
        items.forEach(item => {
            item.classList.toggle('active', item.dataset.id === channelId);
        });

        // Scroll active item into view
        const activeItem = this.container.querySelector('.channel-item.active');
        if (activeItem) {
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    /**
     * Clear the channel list
     */
    clear() {
        this.channels = [];
        this.groups = {};
        this.activeChannelId = null;

        const items = this.container.querySelectorAll('.channel-item');
        items.forEach(item => item.remove());

        this.emptyState.classList.remove('hidden');
    }
}
