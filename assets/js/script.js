class MixDJPlayer {
    constructor() {
        this.data = null;
        this.players = {};
        this.globalVolumeMode = true;
        this.globalVolume = 0.7;
        this.fadeInEnabled = true;
        this.fadeOutEnabled = true;
        this.globalLoop = false;
        this.globalControlsSetup = false;
        this.fadeDuration = 1000; // 1 second
        this.currentlyPlaying = null; // Track which player is currently playing
        this.init();
    }

    async init() {
        try {
            // Use global musicData variable instead of fetching JSON
            this.data = musicData;

            this.setupGlobalControls();
            this.setupKeyboardShortcuts();
            this.createPlayers();
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu:', error);
        }
    }

    setupGlobalControls() {
        const globalVolumeMode = document.getElementById('globalVolumeMode');
        const globalVolume = document.getElementById('globalVolume');
        const volumeDisplay = globalVolume.nextElementSibling;
        const globalSeek = document.getElementById('globalSeek');
        const globalPlayBtn = document.getElementById('globalPlayBtn');
        const globalLoop = document.getElementById('globalLoop');
        const globalFadeIn = document.getElementById('globalFadeIn');
        const globalFadeOut = document.getElementById('globalFadeOut');

        // Global play/pause button
        globalPlayBtn.addEventListener('click', () => {
            if (this.currentlyPlaying) {
                const player = this.players[this.currentlyPlaying];
                if (player.audio.paused) {
                    player.audio.play();
                    globalPlayBtn.textContent = '⏸';
                } else {
                    player.audio.pause();
                    globalPlayBtn.textContent = '▶';
                }
            }
        });

        // Global controls
        globalLoop.addEventListener('change', (e) => {
            if (this.currentlyPlaying) {
                const player = this.players[this.currentlyPlaying];
                player.loopEnabled = e.target.checked;
            }
        });

        globalFadeIn.addEventListener('change', (e) => {
            if (this.currentlyPlaying) {
                const player = this.players[this.currentlyPlaying];
                player.fadeInEnabled = e.target.checked;
            }
        });

        globalFadeOut.addEventListener('change', (e) => {
            if (this.currentlyPlaying) {
                const player = this.players[this.currentlyPlaying];
                player.fadeOutEnabled = e.target.checked;
            }
        });

        globalVolumeMode.addEventListener('change', (e) => {
            this.globalVolumeMode = e.target.checked;
            this.updateVolumeControlsState();
            this.updateAllVolumes();
        });

        globalVolume.addEventListener('input', (e) => {
            this.globalVolume = e.target.value / 100;
            volumeDisplay.textContent = e.target.value + '%';
            if (this.globalVolumeMode) {
                this.updateAllVolumes();
                this.syncIndividualVolumeSliders();
            }
        });

        // Global seek control
        let isGlobalSeeking = false;
        globalSeek.addEventListener('mousedown', () => {
            isGlobalSeeking = true;
        });

        globalSeek.addEventListener('mouseup', () => {
            if (this.currentlyPlaying && isGlobalSeeking) {
                const player = this.players[this.currentlyPlaying];
                if (player.audio) {
                    const seekTime = parseFloat(globalSeek.value);
                    player.audio.currentTime = seekTime;
                }
            }
            isGlobalSeeking = false;
        });

        globalSeek.addEventListener('input', (e) => {
            if (this.currentlyPlaying && isGlobalSeeking) {
                const player = this.players[this.currentlyPlaying];
                if (player.audio) {
                    const seekTime = parseFloat(e.target.value);
                    player.audio.currentTime = seekTime;
                }
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Chỉ xử lý phím tắt khi không focus vào input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    this.handleGlobalPlayPause();
                    break;
                
                case 'ArrowUp':
                    e.preventDefault();
                    this.adjustGlobalVolume(5);
                    break;
                
                case 'ArrowDown':
                    e.preventDefault();
                    this.adjustGlobalVolume(-5);
                    break;
                
                case 'ArrowLeft':
                    e.preventDefault();
                    this.seekGlobalAudio(-10);
                    break;
                
                case 'ArrowRight':
                    e.preventDefault();
                    this.seekGlobalAudio(10);
                    break;
                
                case 'KeyM':
                    e.preventDefault();
                    this.toggleMute();
                    break;
                
                case 'KeyL':
                    e.preventDefault();
                    this.toggleGlobalLoop();
                    break;
            }
        });

        // Hiển thị tooltip shortcuts
        this.showKeyboardShortcuts();
    }

    handleGlobalPlayPause() {
        const globalPlayBtn = document.getElementById('globalPlayBtn');
        if (globalPlayBtn) {
            globalPlayBtn.click();
            this.showKeyboardFeedback('Play/Pause');
        }
    }

    adjustGlobalVolume(delta) {
        const globalVolume = document.getElementById('globalVolume');
        const volumeDisplay = globalVolume.nextElementSibling;
        
        if (globalVolume) {
            let newValue = parseInt(globalVolume.value) + delta;
            newValue = Math.max(0, Math.min(100, newValue));
            
            globalVolume.value = newValue;
            volumeDisplay.textContent = newValue + '%';
            
            this.globalVolume = newValue / 100;
            if (this.globalVolumeMode) {
                this.updateAllVolumes();
                this.syncIndividualVolumeSliders();
            }
            
            this.showKeyboardFeedback(`Volume: ${newValue}%`);
        }
    }

    seekGlobalAudio(seconds) {
        if (this.currentlyPlaying) {
            const player = this.players[this.currentlyPlaying];
            if (player.audio) {
                let newTime = player.audio.currentTime + seconds;
                newTime = Math.max(0, Math.min(player.audio.duration || 0, newTime));
                player.audio.currentTime = newTime;
                
                const direction = seconds > 0 ? 'Forward' : 'Backward';
                this.showKeyboardFeedback(`Seek ${direction} ${Math.abs(seconds)}s`);
            }
        }
    }

    toggleMute() {
        const globalVolume = document.getElementById('globalVolume');
        const volumeDisplay = globalVolume.nextElementSibling;
        
        if (this.lastVolume === undefined) {
            this.lastVolume = parseInt(globalVolume.value);
        }
        
        if (parseInt(globalVolume.value) > 0) {
            this.lastVolume = parseInt(globalVolume.value);
            globalVolume.value = 0;
            volumeDisplay.textContent = '0% (Muted)';
            this.showKeyboardFeedback('Muted');
        } else {
            globalVolume.value = this.lastVolume || 70;
            volumeDisplay.textContent = globalVolume.value + '%';
            this.showKeyboardFeedback('Unmuted');
        }
        
        this.globalVolume = globalVolume.value / 100;
        if (this.globalVolumeMode) {
            this.updateAllVolumes();
            this.syncIndividualVolumeSliders();
        }
    }

    toggleGlobalLoop() {
        const globalLoop = document.getElementById('globalLoop');
        if (globalLoop) {
            globalLoop.checked = !globalLoop.checked;
            this.showKeyboardFeedback(`Loop: ${globalLoop.checked ? 'ON' : 'OFF'}`);
        }
    }

    showKeyboardFeedback(message) {
        // Xóa feedback cũ nếu có
        const oldFeedback = document.getElementById('keyboard-feedback');
        if (oldFeedback) {
            oldFeedback.remove();
        }

        // Tạo feedback mới
        const feedback = document.createElement('div');
        feedback.id = 'keyboard-feedback';
        feedback.className = 'keyboard-feedback';
        feedback.textContent = message;
        document.body.appendChild(feedback);

        // Auto remove sau 1.5 giây
        setTimeout(() => {
            if (feedback) {
                feedback.style.opacity = '0';
                setTimeout(() => feedback.remove(), 300);
            }
        }, 1500);
    }

    showKeyboardShortcuts() {
        // Tạo tooltip hoặc thông báo phím tắt
        if (!document.getElementById('keyboard-shortcuts-info')) {
            const shortcutsInfo = document.createElement('div');
            shortcutsInfo.id = 'keyboard-shortcuts-info';
            shortcutsInfo.innerHTML = `
                <div class="shortcuts-tooltip">
                    <h4>🎹 Phím tắt:</h4>
                    <p><kbd>Space</kbd> - Play/Pause</p>
                    <p><kbd>↑</kbd><kbd>↓</kbd> - Volume ±5</p>
                    <p><kbd>←</kbd><kbd>→</kbd> - Seek ±10s</p>
                    <p><kbd>M</kbd> - Mute/Unmute</p>
                    <p><kbd>L</kbd> - Toggle Loop</p>
                </div>
            `;
            document.body.appendChild(shortcutsInfo);
            
            // Auto hide sau 5 giây
            setTimeout(() => {
                if (shortcutsInfo) {
                    shortcutsInfo.style.opacity = '0';
                    setTimeout(() => shortcutsInfo.remove(), 300);
                }
            }, 5000);
        }
    }

    updateVolumeControlsState() {
        Object.keys(this.players).forEach(categoryKey => {
            const volumeSlider = document.getElementById(`volume-${categoryKey}`);
            const volumeContainer = volumeSlider.closest('.player-volume');

            if (this.globalVolumeMode) {
                volumeSlider.disabled = true;
                volumeContainer.style.opacity = '0.5';
            } else {
                volumeSlider.disabled = false;
                volumeContainer.style.opacity = '1';
            }
        });
    }

    syncIndividualVolumeSliders() {
        const globalVolumeValue = Math.round(this.globalVolume * 100);
        Object.keys(this.players).forEach(categoryKey => {
            const volumeSlider = document.getElementById(`volume-${categoryKey}`);
            const volumeDisplay = volumeSlider.nextElementSibling;
            volumeSlider.value = globalVolumeValue;
            volumeDisplay.textContent = globalVolumeValue + '%';
            this.players[categoryKey].volume = this.globalVolume;
        });
    }

    createPlayers() {
        const container = document.getElementById('playersContainer');

        this.data.forEach((category, index) => {
            const categoryKey = this.generateCategoryKey(category.title, index);
            const playerElement = this.createPlayerElement(categoryKey, category);
            container.appendChild(playerElement);

            this.players[categoryKey] = {
                element: playerElement,
                audio: null,
                currentTrackIndex: 0,
                isPlaying: false,
                volume: 0.7,
                loop: false,
                fadeIn: true,
                fadeOut: true,
                playlist: category.playlist
            };

            this.setupPlayerControls(categoryKey);
            
            // Load first track by default
            if (category.playlist && category.playlist.length > 0) {
                this.selectTrack(categoryKey, 0);
            }
        });
    }

    generateCategoryKey(title, index) {
        return title.toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 10) + index;
    }

    createPlayerElement(categoryKey, category) {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player';
        playerDiv.id = `player-${categoryKey}`;

        const categoryTitle = category.title;

        playerDiv.innerHTML = `
            <div class="player-header">
                <h3 class="category-title">${categoryTitle}</h3>
            </div>
            
            <div class="audio-controls">
                <div class="track-info">
                    <div class="current-track" id="track-${categoryKey}">Chưa chọn bài hát</div>
                    <div class="time-display" id="time-${categoryKey}">00:00 / 00:00</div>
                    
                </div>
                
                <div class="main-controls">
                    <button class="play-btn" id="play-${categoryKey}">▶</button>
                    <div class="seek-container">
                        <input type="range" class="seek-bar" id="seek-${categoryKey}" min="0" max="0" value="0" step="0.1" title="Seek position">
                    </div>
                </div>
                
                <div class="player-volume">
                    <label>Volume:</label>
                    <div class="volume-slider-container">
                        <input type="range" class="volume-slider" id="volume-${categoryKey}" min="0" max="100" value="70" title="Volume control">
                        <span class="volume-display">70%</span>
                    </div>
                </div>
            </div>
            
            <div class="playlist" id="playlist-${categoryKey}">
                ${this.createPlaylistHTML(category.playlist)}
            </div>
        `;

        return playerDiv;
    }

    getCategoryDisplayName(categoryKey) {
        // This method is no longer needed since we use the title directly from data
        return categoryKey;
    }

    createPlaylistHTML(categoryData) {
        return categoryData.map((track, index) =>
            `<div class="playlist-item" data-index="${index}">${track.title}</div>`
        ).join('');
    }

    setupPlayerControls(categoryKey) {
        const player = this.players[categoryKey];
        const playBtn = document.getElementById(`play-${categoryKey}`);
        const volumeSlider = document.getElementById(`volume-${categoryKey}`);
        const volumeDisplay = volumeSlider.nextElementSibling;
        const seekBar = document.getElementById(`seek-${categoryKey}`);
        const playlist = document.getElementById(`playlist-${categoryKey}`);

        // Play/Pause button
        playBtn.addEventListener('click', () => {
            if (player.isPlaying) {
                this.pausePlayer(categoryKey);
            } else {
                this.playPlayer(categoryKey);
            }
        });

        // Volume control
        volumeSlider.addEventListener('input', (e) => {
            if (!this.globalVolumeMode) {
                player.volume = e.target.value / 100;
                volumeDisplay.textContent = e.target.value + '%';
                if (player.audio) {
                    player.audio.volume = player.volume;
                }
            }
        });

        // Seek bar control
        let isSeeking = false;
        seekBar.addEventListener('mousedown', () => {
            isSeeking = true;
        });

        seekBar.addEventListener('mouseup', () => {
            if (player.audio && isSeeking) {
                const seekTime = parseFloat(seekBar.value);
                player.audio.currentTime = seekTime;
            }
            isSeeking = false;
        });

        seekBar.addEventListener('input', (e) => {
            if (player.audio && isSeeking) {
                const seekTime = parseFloat(e.target.value);
                player.audio.currentTime = seekTime;
            }
        });

        // Global controls event listeners (only set up once)
        if (!this.globalControlsSetup) {
            globalLoop.addEventListener('change', (e) => {
                this.globalLoop = e.target.checked;
            });

            globalFadeIn.addEventListener('change', (e) => {
                this.fadeInEnabled = e.target.checked;
            });

            globalFadeOut.addEventListener('change', (e) => {
                this.fadeOutEnabled = e.target.checked;
            });

            this.globalControlsSetup = true;
        }

        // Playlist item clicks
        playlist.addEventListener('click', (e) => {
            if (e.target.classList.contains('playlist-item')) {
                const index = parseInt(e.target.dataset.index);
                this.selectTrack(categoryKey, index);
            }
        });

        // Select first track by default
        if (player.playlist.length > 0) {
            this.selectTrack(categoryKey, 0);
        }

        // Initialize volume control state
        this.updateVolumeControlsState();
    }

    selectTrack(categoryKey, index) {
        const player = this.players[categoryKey];
        const wasPlaying = player.isPlaying;

        // Stop current audio if playing
        if (player.audio) {
            this.stopPlayer(categoryKey);
        }

        player.currentTrackIndex = index;
        const track = player.playlist[index];

        // Update UI
        const trackDisplay = document.getElementById(`track-${categoryKey}`);
        trackDisplay.textContent = track.title;

        // Update playlist highlighting
        const playlistItems = document.querySelectorAll(`#playlist-${categoryKey} .playlist-item`);
        playlistItems.forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });

        // Create new audio element
        player.audio = new Audio(track.path);
        player.audio.loop = this.globalLoop;

        // Set initial volume
        const effectiveVolume = this.globalVolumeMode ?
            player.volume * this.globalVolume : player.volume;
        player.audio.volume = effectiveVolume;

        // Setup audio event listeners
        this.setupAudioEvents(categoryKey);

        // Auto play if was playing before
        if (wasPlaying) {
            this.playPlayer(categoryKey);
        }
    }

    setupAudioEvents(categoryKey) {
        const player = this.players[categoryKey];
        const audio = player.audio;
        const timeDisplay = document.getElementById(`time-${categoryKey}`);
        const seekBar = document.getElementById(`seek-${categoryKey}`);

        audio.addEventListener('loadedmetadata', () => {
            this.updateTimeDisplay(categoryKey);
            seekBar.max = audio.duration || 0;
        });

        audio.addEventListener('timeupdate', () => {
            this.updateTimeDisplay(categoryKey);
            this.updateSeekBar(categoryKey);
            this.handleLoopPoints(categoryKey);

            // Update global player bar if this is the currently playing track
            if (this.currentlyPlaying === categoryKey) {
                this.updateGlobalTimeDisplay();
                this.updateGlobalSeekBar();
            }
        });

        audio.addEventListener('ended', () => {
            if (!player.loop) {
                this.stopPlayer(categoryKey);
            }
        });

        audio.addEventListener('error', (e) => {
            console.error(`Lỗi phát nhạc ${categoryKey}:`, e);
            this.stopPlayer(categoryKey);
        });
    }

    updateGlobalTimeDisplay() {
        if (!this.currentlyPlaying) return;

        const player = this.players[this.currentlyPlaying];
        const audio = player.audio;

        if (audio) {
            const current = this.formatTime(audio.currentTime);
            const duration = this.formatTime(audio.duration || 0);
            document.getElementById('globalCurrentTime').textContent = current;
            document.getElementById('globalDuration').textContent = duration;
        }
    }

    updateGlobalSeekBar() {
        if (!this.currentlyPlaying) return;

        const player = this.players[this.currentlyPlaying];
        const audio = player.audio;
        const globalSeek = document.getElementById('globalSeek');

        if (audio && audio.duration && !globalSeek.matches(':active')) {
            globalSeek.max = audio.duration;
            globalSeek.value = audio.currentTime;
        }
    }

    handleLoopPoints(categoryKey) {
        const player = this.players[categoryKey];
        const audio = player.audio;
        const track = player.playlist[player.currentTrackIndex];
        const globalLoop = document.getElementById('globalLoop');

        if (globalLoop && globalLoop.checked && track.endLoop !== null && track.endLoop !== undefined) {
            if (audio.currentTime >= track.endLoop) {
                const startTime = track.startLoop !== null && track.startLoop !== undefined
                    ? track.startLoop : 0;
                audio.currentTime = startTime;
            }
        }
    }

    updateSeekBar(categoryKey) {
        const player = this.players[categoryKey];
        const audio = player.audio;
        const seekBar = document.getElementById(`seek-${categoryKey}`);

        if (audio && audio.duration && !seekBar.matches(':active')) {
            seekBar.value = audio.currentTime;
        }
    }

    async playPlayer(categoryKey) {
        // Stop all other players first
        await this.stopAllOtherPlayers(categoryKey);

        const player = this.players[categoryKey];
        if (!player.audio) return;

        try {
            const track = player.playlist[player.currentTrackIndex];

            // Handle loop points if specified
            if (track.startLoop !== null && track.startLoop !== undefined) {
                player.audio.currentTime = track.startLoop;
            }

            // Fade in effect
            const globalFadeIn = document.getElementById('globalFadeIn');
            if (globalFadeIn && globalFadeIn.checked) {
                player.audio.volume = 0;
                await player.audio.play();
                this.fadeIn(player.audio, this.globalVolumeMode ?
                    player.volume * this.globalVolume : player.volume);
            } else {
                await player.audio.play();
            }

            player.isPlaying = true;
            this.currentlyPlaying = categoryKey;
            document.getElementById(`play-${categoryKey}`).textContent = '⏸';
            player.element.classList.add('playing');

            // Update global player bar
            const currentTrack = player.playlist[player.currentTrackIndex];
            this.updateGlobalPlayerDisplay(categoryKey, player.currentTrackIndex, currentTrack.title);

        } catch (error) {
            console.error(`Lỗi phát nhạc ${categoryKey}:`, error);
        }
    }

    async stopAllOtherPlayers(exceptCategory) {
        for (const categoryKey of Object.keys(this.players)) {
            if (categoryKey !== exceptCategory) {
                await this.pausePlayer(categoryKey);
            }
        }
    }

    updateGlobalPlayerBar(categoryKey) {
        const player = this.players[categoryKey];
        const track = player.playlist[player.currentTrackIndex];
        const category = this.data.find(cat =>
            this.generateCategoryKey(cat.title, this.data.indexOf(cat)) === categoryKey
        );

        document.getElementById('globalTrackTitle').textContent = track.title;
        document.getElementById('globalTrackCategory').textContent = category ? category.title : '-';
    }

    async pausePlayer(categoryKey) {
        const player = this.players[categoryKey];
        if (!player.audio) return;

        const globalFadeOut = document.getElementById('globalFadeOut');
        if (globalFadeOut && globalFadeOut.checked && player.isPlaying) {
            await this.fadeOut(player.audio);
        }

        player.audio.pause();
        player.isPlaying = false;
        document.getElementById(`play-${categoryKey}`).textContent = '▶';
        player.element.classList.remove('playing');

        // Clear global player if this was the currently playing
        if (this.currentlyPlaying === categoryKey) {
            this.clearGlobalPlayerDisplay();
        }
    }

    stopPlayer(categoryKey) {
        const player = this.players[categoryKey];
        if (!player.audio) return;

        player.audio.pause();
        player.audio.currentTime = 0;
        player.isPlaying = false;
        document.getElementById(`play-${categoryKey}`).textContent = '▶';
        player.element.classList.remove('playing');

        // Reset seek bar
        const seekBar = document.getElementById(`seek-${categoryKey}`);
        seekBar.value = 0;

        // Clear global player if this was the currently playing
        if (this.currentlyPlaying === categoryKey) {
            this.currentlyPlaying = null;
            this.clearGlobalPlayerBar();
        }
    }

    clearGlobalPlayerBar() {
        document.getElementById('globalTrackTitle').textContent = 'Chưa phát nhạc';
        document.getElementById('globalTrackCategory').textContent = '-';
        document.getElementById('globalCurrentTime').textContent = '00:00';
        document.getElementById('globalDuration').textContent = '00:00';
        document.getElementById('globalSeek').value = 0;
    }

    fadeIn(audio, targetVolume) {
        return new Promise((resolve) => {
            const step = targetVolume / (this.fadeDuration / 50);
            const fadeInterval = setInterval(() => {
                if (audio.volume < targetVolume) {
                    audio.volume = Math.min(audio.volume + step, targetVolume);
                } else {
                    clearInterval(fadeInterval);
                    resolve();
                }
            }, 50);
        });
    }

    fadeOut(audio) {
        return new Promise((resolve) => {
            const startVolume = audio.volume;
            const step = startVolume / (this.fadeDuration / 50);
            const fadeInterval = setInterval(() => {
                if (audio.volume > 0) {
                    audio.volume = Math.max(audio.volume - step, 0);
                } else {
                    clearInterval(fadeInterval);
                    resolve();
                }
            }, 50);
        });
    }

    updateTimeDisplay(categoryKey) {
        const player = this.players[categoryKey];
        const audio = player.audio;
        const timeDisplay = document.getElementById(`time-${categoryKey}`);

        if (audio) {
            const current = this.formatTime(audio.currentTime);
            const duration = this.formatTime(audio.duration || 0);
            timeDisplay.textContent = `${current} / ${duration}`;
        }
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    updateAllVolumes() {
        Object.keys(this.players).forEach(categoryKey => {
            const player = this.players[categoryKey];
            if (player.audio) {
                player.audio.volume = this.globalVolumeMode ?
                    player.volume * this.globalVolume : player.volume;
            }
        });
    }

    stopCurrentlyPlaying() {
        if (this.currentlyPlaying) {
            const { category, index } = this.currentlyPlaying;
            const player = this.players[category];
            if (player) {
                player.stop(index);
            }
        }
    }

    updateGlobalPlayerDisplay(category, index, title) {
        this.currentlyPlaying = category;
        document.getElementById('globalTrackTitle').textContent = title;
        document.getElementById('globalTrackCategory').textContent = category;

        const globalPlayBtn = document.getElementById('globalPlayBtn');
        if (globalPlayBtn) {
            globalPlayBtn.textContent = '⏸';
        }
    }

    clearGlobalPlayerDisplay() {
        this.currentlyPlaying = null;
        document.getElementById('globalTrackTitle').textContent = 'Chưa phát nhạc';
        document.getElementById('globalTrackCategory').textContent = '-';

        const globalPlayBtn = document.getElementById('globalPlayBtn');
        if (globalPlayBtn) {
            globalPlayBtn.textContent = '▶';
        }

        // Reset seek bar and time display
        const globalSeek = document.getElementById('globalSeek');
        const globalCurrentTime = document.getElementById('globalCurrentTime');
        const globalDuration = document.getElementById('globalDuration');

        if (globalSeek) globalSeek.value = 0;
        if (globalCurrentTime) globalCurrentTime.textContent = '00:00';
        if (globalDuration) globalDuration.textContent = '00:00';
    }
}

// Initialize the Mix DJ Player when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MixDJPlayer();
});