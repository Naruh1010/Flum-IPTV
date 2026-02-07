/**
 * LibraryView - Playlist Library Component
 * 
 * Manages the library view showing saved playlists
 * with add, edit, delete functionality.
 */

import { i18n } from '../modules/i18n.js';

export class LibraryView {
    constructor({ onPlaylistOpen, onSettingsOpen }) {
        this.onPlaylistOpen = onPlaylistOpen;
        this.onSettingsOpen = onSettingsOpen;

        this.playlists = [];
        this.selectedFile = null;

        this.cacheElements();
        this.setupEventListeners();
    }

    cacheElements() {
        // Library elements
        this.view = document.getElementById('library-view');
        this.grid = document.getElementById('playlist-grid');
        this.emptyState = document.getElementById('empty-library');
        this.searchInput = document.getElementById('library-search');

        // Buttons
        this.btnAddPlaylist = document.getElementById('btn-add-playlist');
        this.btnSettings = document.getElementById('btn-settings');

        // Add Modal
        this.addModal = document.getElementById('add-playlist-modal');
        this.tabButtons = this.addModal.querySelectorAll('.tab');
        this.tabContents = this.addModal.querySelectorAll('.tab-content');
        this.btnSelectFile = document.getElementById('btn-select-file');
        this.selectedFileName = document.getElementById('selected-file-name');
        this.urlInput = document.getElementById('playlist-url-input');
        this.nameInput = document.getElementById('playlist-name-input');
        this.btnCancelAdd = document.getElementById('btn-cancel-add');
        this.btnConfirmAdd = document.getElementById('btn-confirm-add');

        // Edit Modal
        this.editModal = document.getElementById('edit-playlist-modal');
        this.editNameInput = document.getElementById('edit-playlist-name');
        this.editUrlInput = document.getElementById('edit-playlist-url');
        this.btnCancelEdit = document.getElementById('btn-cancel-edit');
        this.btnConfirmEdit = document.getElementById('btn-confirm-edit');
    }

    setupEventListeners() {
        // Header buttons
        this.btnAddPlaylist.addEventListener('click', () => this.showAddModal());
        this.btnSettings.addEventListener('click', () => this.onSettingsOpen?.());

        // Search
        this.searchInput.addEventListener('input', (e) => this.filterPlaylists(e.target.value));

        // Tab switching
        this.tabButtons.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Add modal
        this.btnSelectFile.addEventListener('click', () => this.selectFile());
        this.btnCancelAdd.addEventListener('click', () => this.hideAddModal());
        this.btnConfirmAdd.addEventListener('click', () => this.confirmAdd());

        // Edit modal
        this.btnCancelEdit.addEventListener('click', () => this.hideEditModal());
        this.btnConfirmEdit.addEventListener('click', () => this.confirmEdit());

        // Modal backdrop clicks
        this.addModal.addEventListener('click', (e) => {
            if (e.target === this.addModal) this.hideAddModal();
        });
        this.editModal.addEventListener('click', (e) => {
            if (e.target === this.editModal) this.hideEditModal();
        });
    }

    async loadPlaylists() {
        try {
            this.playlists = await window.electronAPI.getPlaylists();
            this.render();
        } catch (error) {
            console.error('[LibraryView] Error loading playlists:', error);
        }
    }

    render() {
        // Clear existing cards
        const cards = this.grid.querySelectorAll('.playlist-card');
        cards.forEach(c => c.remove());

        if (this.playlists.length === 0) {
            this.emptyState.classList.remove('hidden');
            return;
        }

        this.emptyState.classList.add('hidden');

        this.playlists.forEach(playlist => {
            const card = this.createPlaylistCard(playlist);
            this.grid.insertBefore(card, this.emptyState);
        });
    }

    createPlaylistCard(playlist) {
        const card = document.createElement('div');
        card.className = 'playlist-card';
        card.dataset.id = playlist.id;

        // Format dates
        const addedDate = new Date(playlist.addedAt).toLocaleDateString('es-ES', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
        const updatedTime = new Date(playlist.updatedAt).toLocaleTimeString('es-ES', {
            hour: '2-digit', minute: '2-digit'
        });

        // Get translated labels
        const channelsLabel = i18n.t('library.card.channels');
        const addedLabel = i18n.t('library.card.added');
        const updatedLabel = i18n.t('library.card.updated');

        card.innerHTML = `
            <div class="playlist-info">
                <div class="playlist-name">${playlist.name}</div>
                <div class="playlist-meta">
                    ${playlist.channelCount} ${channelsLabel} | ${addedLabel}: ${addedDate} | ${updatedLabel}: ${updatedTime}
                </div>
            </div>
            <div class="playlist-actions">
                <button class="playlist-action-btn" data-action="refresh" title="${i18n.t('library.card.refresh')}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                </button>
                <button class="playlist-action-btn" data-action="edit" title="${i18n.t('library.card.edit')}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                </button>
                <button class="playlist-action-btn danger" data-action="delete" title="${i18n.t('library.card.delete')}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                </button>
            </div>
        `;

        // Card click - open playlist
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.playlist-action-btn')) {
                this.onPlaylistOpen?.(playlist);
            }
        });

        // Action buttons
        card.querySelectorAll('.playlist-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleAction(btn.dataset.action, playlist);
            });
        });

        return card;
    }

    async handleAction(action, playlist) {
        switch (action) {
            case 'refresh':
                await this.refreshPlaylist(playlist);
                break;
            case 'edit':
                this.showEditModal(playlist);
                break;
            case 'delete':
                await this.deletePlaylist(playlist);
                break;
        }
    }

    async refreshPlaylist(playlist) {
        console.log('[LibraryView] Refreshing playlist:', playlist.name);
        // Reload playlist data
        try {
            await window.electronAPI.refreshPlaylist(playlist.id);
            await this.loadPlaylists();
        } catch (error) {
            console.error('[LibraryView] Refresh failed:', error);
        }
    }

    async deletePlaylist(playlist) {
        if (confirm(i18n.t('modal.confirm.delete', { name: playlist.name }))) {
            await window.electronAPI.deletePlaylist(playlist.id);
            await this.loadPlaylists();
        }
    }

    filterPlaylists(query) {
        const cards = this.grid.querySelectorAll('.playlist-card');
        const lowerQuery = query.toLowerCase();

        cards.forEach(card => {
            const name = card.querySelector('.playlist-name').textContent.toLowerCase();
            card.style.display = name.includes(lowerQuery) ? '' : 'none';
        });
    }

    // Tab handling
    switchTab(tabId) {
        this.tabButtons.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabId}`);
        });
    }

    // Add Modal
    showAddModal() {
        this.selectedFile = null;
        this.selectedFileName.textContent = '';
        this.urlInput.value = '';
        this.nameInput.value = '';
        this.switchTab('file');
        this.addModal.classList.remove('hidden');
    }

    hideAddModal() {
        this.addModal.classList.add('hidden');
    }

    async selectFile() {
        const result = await window.electronAPI.openPlaylistDialog();
        if (result) {
            this.selectedFile = result.path;
            this.selectedFileName.textContent = result.path.split(/[\\/]/).pop();
            if (!this.nameInput.value) {
                this.nameInput.value = this.selectedFileName.textContent;
            }
        }
    }

    async confirmAdd() {
        const activeTab = this.addModal.querySelector('.tab.active').dataset.tab;
        const name = this.nameInput.value.trim();

        let playlistData = null;

        if (activeTab === 'file' && this.selectedFile) {
            playlistData = {
                source: 'file',
                path: this.selectedFile,
                name: name || this.selectedFile.split(/[\\/]/).pop()
            };
        } else if (activeTab === 'url' && this.urlInput.value.trim()) {
            const url = this.urlInput.value.trim();
            // Extract filename from URL without extension
            let defaultName = i18n.t('library.defaultPlaylistName');
            try {
                const urlPath = new URL(url).pathname;
                const filename = urlPath.split('/').pop();
                if (filename) {
                    defaultName = filename.replace(/\.(m3u8?|pls|xspf)$/i, '');
                }
            } catch {
                // If URL parsing fails, use default name
            }
            playlistData = {
                source: 'url',
                path: url,
                name: name || defaultName
            };
        }

        if (playlistData) {
            await window.electronAPI.addPlaylist(playlistData);
            this.hideAddModal();
            await this.loadPlaylists();
        }
    }

    // Edit Modal
    currentEditId = null;

    showEditModal(playlist) {
        this.currentEditId = playlist.id;
        this.editNameInput.value = playlist.name;
        this.editUrlInput.value = playlist.source === 'url' ? playlist.path : '';
        this.editUrlInput.disabled = playlist.source !== 'url';
        this.editModal.classList.remove('hidden');
    }

    hideEditModal() {
        this.editModal.classList.add('hidden');
        this.currentEditId = null;
    }

    async confirmEdit() {
        if (!this.currentEditId) return;

        const updates = {
            name: this.editNameInput.value.trim()
        };

        if (!this.editUrlInput.disabled && this.editUrlInput.value.trim()) {
            updates.path = this.editUrlInput.value.trim();
        }

        await window.electronAPI.updatePlaylist(this.currentEditId, updates);
        this.hideEditModal();
        await this.loadPlaylists();
    }

    show() {
        this.view.classList.add('active');
        this.loadPlaylists();
    }

    hide() {
        this.view.classList.remove('active');
    }
}
