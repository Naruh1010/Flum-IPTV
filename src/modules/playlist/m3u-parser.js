/**
 * M3U Parser - Playlist File Parser
 * 
 * Parses M3U and M3U8 playlist files to extract channel
 * information including names, URLs, logos, and groups.
 */

export class M3UParser {
    /**
     * Parse M3U content into channel objects
     * @param {string} content - Raw M3U file content
     * @returns {Array} Array of channel objects
     */
    static parse(content) {
        const lines = content.split('\n').map(line => line.trim());
        const channels = [];

        let currentChannel = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Skip empty lines and header
            if (!line || line === '#EXTM3U') continue;

            // Parse EXTINF line (channel metadata)
            if (line.startsWith('#EXTINF:')) {
                currentChannel = M3UParser.parseExtInf(line);
            }
            // URL line (follows EXTINF)
            else if (!line.startsWith('#') && currentChannel) {
                currentChannel.url = line;
                currentChannel.id = M3UParser.generateId(currentChannel);
                channels.push(currentChannel);
                currentChannel = null;
            }
        }

        return channels;
    }

    /**
     * Parse EXTINF line to extract metadata
     * @param {string} line - EXTINF line
     * @returns {Object} Channel metadata object
     */
    static parseExtInf(line) {
        const channel = {
            name: 'Unknown Channel',
            group: 'Uncategorized',
            logo: null,
            tvgId: null,
            tvgName: null
        };

        // Extract attributes like tvg-logo, group-title, etc. FIRST
        const attributes = M3UParser.parseAttributes(line);

        if (attributes['tvg-logo']) {
            channel.logo = attributes['tvg-logo'];
        }
        if (attributes['tvg-id']) {
            channel.tvgId = attributes['tvg-id'];
        }
        if (attributes['tvg-name']) {
            channel.tvgName = attributes['tvg-name'];
        }
        if (attributes['group-title']) {
            channel.group = attributes['group-title'];
        }

        // Find the channel name - it's after the LAST comma in the line
        // Format: #EXTINF:-1 tvg-id="x" tvg-name="y" group-title="z",Channel Name
        const lastCommaIndex = line.lastIndexOf(',');
        if (lastCommaIndex !== -1) {
            const nameAfterComma = line.substring(lastCommaIndex + 1).trim();
            if (nameAfterComma) {
                channel.name = nameAfterComma;
            }
        }

        // If still no name, try tvg-name attribute
        if (channel.name === 'Unknown Channel' && channel.tvgName) {
            channel.name = channel.tvgName;
        }

        return channel;
    }

    /**
     * Parse attributes from EXTINF line
     * @param {string} line - EXTINF line
     * @returns {Object} Attributes object
     */
    static parseAttributes(line) {
        const attributes = {};
        // Match patterns like: attribute="value" or attribute='value'
        const regex = /([a-zA-Z-]+)=["']([^"']+)["']/g;
        let match;

        while ((match = regex.exec(line)) !== null) {
            attributes[match[1].toLowerCase()] = match[2];
        }

        return attributes;
    }

    /**
     * Generate unique ID for channel
     * @param {Object} channel - Channel object
     * @returns {string} Unique ID
     */
    static generateId(channel) {
        const source = channel.tvgId || channel.name || Date.now().toString();
        let hash = 0;
        for (let i = 0; i < source.length; i++) {
            const char = source.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Group channels by their group attribute
     * @param {Array} channels - Array of channels
     * @returns {Object} Channels grouped by category
     */
    static groupByCategory(channels) {
        return channels.reduce((groups, channel) => {
            const group = channel.group || 'Uncategorized';
            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(channel);
            return groups;
        }, {});
    }

    /**
     * Search channels by name
     * @param {Array} channels - Array of channels
     * @param {string} query - Search query
     * @returns {Array} Matching channels
     */
    static search(channels, query) {
        if (!query || query.trim() === '') {
            return channels;
        }

        const lowerQuery = query.toLowerCase();
        return channels.filter(channel =>
            channel.name.toLowerCase().includes(lowerQuery) ||
            channel.group.toLowerCase().includes(lowerQuery)
        );
    }
}
