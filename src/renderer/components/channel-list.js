/**
 * ChannelList - Channel List Component
 * 
 * Renders and manages the channel list sidebar with
 * search, filtering, and selection functionality.
 */

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
     * Render channel list and populate group filter
     */
    async render(channels, groups) {
        this.channels = channels;
        this.groups = groups;

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

        // Click handler
        item.addEventListener('click', () => {
            if (this.onChannelClick) {
                this.onChannelClick(channel);
            }
        });

        return item;
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

        // Filter by group
        if (group && group !== 'all') {
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
