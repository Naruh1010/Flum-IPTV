# 📺 Flum IPTV

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows%20|%20macOS%20|%20Linux-lightgrey)
![License](https://img.shields.io/badge/License-MIT-blue)

**A modern cross-platform (coming soon) IPTV player with HLS and DASH support**

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Configuration](#️-configuration)

</div>

---

## 🎯 Description

**Flum IPTV** is an elegant and powerful desktop application for playing IPTV playlists (M3U/M3U8). Designed with a simple andmodern interface, it allows you to manage multiple playlists, watch live channels, and record content directly from the application.

### Why Flum IPTV?

- 🎨 **Modern Interface** - Modern Dark theme mode
- ⚡ **Performance** - Built with HLS.js for maximum compatibility
- 🌐 **Multi-language** - Support for Spanish, English, and Portuguese
-  **Recording** - Record your favorite programs in WebM format

---

## ✨ Features

### Playlist Management
- 📁 Import playlists from **local file** or **remote URL**
- ✏️ Edit name and URL of existing playlists
- 🔄 Manually refresh playlists to get latest channels
- 🗑️ Delete playlists with confirmation
- 🔍 Search playlists by name

### Video Player
- ▶️ Playback of **HLS** and **DASH** streams
- ⏮️⏭️ Quick navigation between channels
- 🔊 Volume control with slider
- 🖥️ Fullscreen mode
- 🎛️ Auto-hiding controls
- 📊 **Quality selection** - Switch between available resolutions (Auto, 1080p, 720p, etc.)
- ⭐ **Favorites** - Mark channels as favorites for quick access

### Recording
- ⏺️ Record live streams to **WebM** (VP8 + Opus)
- 🎚️ Three quality presets:
  - **Low** - 500 kbps (saves space)
  - **Medium** - 1.5 Mbps (quality/size balance)
  - **High** - 3 Mbps (maximum quality)
- 📁 Automatic saving to Downloads folder

### Customization
- 🌙 Dark theme
- 🎨 Customizable accent color or synced with system
- 🌐 Multi-language support (ES/EN/PT)
- 💾 Channel icon caching for fast loading
- ⌨️ **Customizable keyboard shortcuts** - Rebind controls to your preference

### External Player Integration
- 🔗 Open streams in **VLC**, **MPV**, or other players
- 🔍 Automatic detection of installed players
- ⚙️ Manual player path configuration

---

## 📦 Installation

### Prerequisites
- [Node.js](https://nodejs.org/) 18 or higher
- npm (included with Node.js)

### Steps

1. **Clone the repository**
```bash
git clone https://github.com/Naruh1010/Flum-IPTV.git
cd Flum-IPTV
```

2. **Install dependencies**
```bash
npm install
```

3. **Run the application**
```bash
npm start
```

---

## 🚀 Usage

### Adding a Playlist

1. Click on **"+ New Playlist"** on the main screen
2. Choose the import method:
   - **File**: Select a local `.m3u` or `.m3u8` file
   - **URL**: Paste a remote playlist URL
3. Optionally, assign a custom name
4. Click **"Add"**

### Playing a Channel

1. Select a playlist from your library
2. Navigate channels using:
   - The search bar to filter
   - The group selector for categories
3. Click on a channel to play it
4. Use the controls to:
   - ▶️/⏸️ Play/Pause
   - ⏮️/⏭️ Previous/Next channel
   - 🔊 Adjust volume
   - ⏺️ Start recording
   - 🖥️ Fullscreen
   - ⚙️ Quality selection (when multiple levels are available)
   - ⭐ Toggle favorite

### Recording a Stream

1. While playing a channel, click the ⏺️ button
2. Recording will start immediately (red indicator visible)
3. Click ⏹️ to stop
4. The file will be automatically saved to your Downloads folder

---

## ⚙️ Configuration

Access settings from the ⚙️ icon in the top right corner.

### Appearance
| Option | Description |
|--------|-------------|
| **Accent color** | Sync with system or choose manually |
| **Language** | Español, English, Português |

### Data and Cache
| Option | Description |
|--------|-------------|
| **Space used** | Shows icon cache size |
| **Open data folder** | Opens the app's data location |
| **Clear icon cache** | Frees space by deleting downloaded icons |

### External Player
| Option | Description |
|--------|-------------|
| **Use external player** | Open streams in VLC/MPV |
| **Player path** | Manually configure the location |
| **Automatically detected** | Use the detected player |

### Recording
| Option | Description |
|--------|-------------|
| **Recording quality** | Low (500kbps), Medium (1.5Mbps), High (3Mbps) |
| **Output format** | WebM (VP8 + Opus) at 30 fps max |

### Keyboard Shortcuts
| Option | Description |
|--------|-------------|
| **Rebindable shortcuts** | Click a key to reassign Play/Pause, Mute, Fullscreen, Volume, and Channel navigation |
| **Reset shortcuts** | Restore default key bindings |

### Reset
| Option | Description |
|--------|-------------|
| **Reset all** | Deletes all data and restarts the app |

---

##  Supported Formats

### Playlists
- ✅ M3U
- ✅ M3U8

### Streams
- ✅ HLS (HTTP Live Streaming)
- ✅ DASH (Dynamic Adaptive Streaming over HTTP)

### Recording Output
- ✅ WebM (VP8 video + Opus audio)

---

## 🗂️ Data Storage

Application data is stored in:

| System | Location |
|--------|----------|
| **Windows** | `%USERPROFILE%\.FlumIPTVData` |
| **macOS** | `~/.FlumIPTVData` |
| **Linux** | `~/.FlumIPTVData` |

Contents:
- `playlists.json` - Saved playlists
- `settings.json` - User settings
- `icons/` - Channel icon cache

---

## 📄 License

This project is under the MIT License. See the [LICENSE](LICENSE) file for more details.

---

<div align="center">

**[⬆ Back to top](#-flum-iptv)**

</div>
