/**
 * PlaylistManager - Playlist State Management
 * 
 * Manages loaded playlists, current channel selection,
 * and provides events for UI updates.
 */

import { M3UParser } from './m3u-parser.js';
import { Storage } from './storage.js';

export class PlaylistManager {
    constructor() {
        this.channels = [];
        this.groups = {};
        this.currentChannel = null;
        this.currentPlaylist = null;

        // Event callbacks
        this.onPlaylistLoaded = null;
        this.onChannelSelected = null;
        this.onError = null;
    }

    /**
     * Load playlist from content string
     * @param {string} content - M3U content
     * @param {string} name - Playlist name
     */
    loadFromContent(content, name = 'Playlist') {
        try {
            this.channels = M3UParser.parse(content);
            this.groups = M3UParser.groupByCategory(this.channels);
            this.currentPlaylist = { name, channelCount: this.channels.length };

            console.log(`[PlaylistManager] Loaded ${this.channels.length} channels in ${Object.keys(this.groups).length} groups`);

            // Save to recent playlists
            Storage.addRecentPlaylist({ name, channelCount: this.channels.length });

            if (this.onPlaylistLoaded) {
                this.onPlaylistLoaded({
                    channels: this.channels,
                    groups: this.groups,
                    playlist: this.currentPlaylist
                });
            }

            return true;
        } catch (error) {
            console.error('[PlaylistManager] Parse error:', error);
            if (this.onError) {
                this.onError(error);
            }
            return false;
        }
    }

    /**
     * Select and play a channel
     * @param {Object|string} channel - Channel object or ID
     */
    selectChannel(channel) {
        // Find channel if ID was passed
        if (typeof channel === 'string') {
            channel = this.channels.find(c => c.id === channel);
        }

        if (!channel) {
            console.error('[PlaylistManager] Channel not found');
            return;
        }

        this.currentChannel = channel;
        Storage.addToHistory(channel);

        console.log(`[PlaylistManager] Selected: ${channel.name}`);

        if (this.onChannelSelected) {
            this.onChannelSelected(channel);
        }
    }

    /**
     * Get channels filtered by group
     * @param {string} groupName - Group name to filter
     * @returns {Array} Filtered channels
     */
    getChannelsByGroup(groupName) {
        if (!groupName || groupName === 'all') {
            return this.channels;
        }
        return this.groups[groupName] || [];
    }

    /**
     * Search channels
     * @param {string} query - Search query
     * @returns {Array} Matching channels
     */
    searchChannels(query) {
        return M3UParser.search(this.channels, query);
    }

    /**
     * Get list of all groups
     * @returns {Array} Group names
     */
    getGroups() {
        return Object.keys(this.groups).sort();
    }

    /**
     * Get recently watched channels
     * @returns {Array} Recent channels
     */
    getRecentChannels() {
        return Storage.getHistory();
    }

    /**
     * Get next channel in list
     * @returns {Object|null} Next channel
     */
    getNextChannel() {
        if (!this.currentChannel || this.channels.length === 0) return null;

        const currentIndex = this.channels.findIndex(c => c.id === this.currentChannel.id);
        const nextIndex = (currentIndex + 1) % this.channels.length;
        return this.channels[nextIndex];
    }

    /**
     * Get previous channel in list
     * @returns {Object|null} Previous channel
     */
    getPreviousChannel() {
        if (!this.currentChannel || this.channels.length === 0) return null;

        const currentIndex = this.channels.findIndex(c => c.id === this.currentChannel.id);
        const prevIndex = currentIndex === 0 ? this.channels.length - 1 : currentIndex - 1;
        return this.channels[prevIndex];
    }

    /**
     * Clear all loaded data
     */
    clear() {
        this.channels = [];
        this.groups = {};
        this.currentChannel = null;
        this.currentPlaylist = null;
    }
}
