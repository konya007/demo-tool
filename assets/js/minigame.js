class LuckyNumberSpinner {
    constructor() {
        this.participants = [];
        this.winners = [];
        this.luckyCount = 10;
        this.spinDuration = 5000; // 5 seconds
        this.sfxVolume = 0.7;
        this.isSpinning = false;
        this.currentSpinIndex = 0;
        
        // Audio elements
        this.kickAudio = null;
        this.applauseAudio = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupAudio();
        this.showAdminPanel();
    }

    setupEventListeners() {
        // Admin panel events
        document.getElementById('startGame').addEventListener('click', () => this.startGame());
        document.getElementById('testAudio').addEventListener('click', () => this.testAudio());
        document.getElementById('sfxVolume').addEventListener('input', (e) => this.updateVolume(e.target.value));

        // Presentation panel events
        document.getElementById('spinButton').addEventListener('click', () => this.spinNumber());
        document.getElementById('backToAdmin').addEventListener('click', () => this.showAdminPanel());
        document.getElementById('resetGame').addEventListener('click', () => this.resetGame());

        // Modal events
        document.getElementById('continueButton').addEventListener('click', () => this.hideWinnerModal());
        document.getElementById('newGameButton').addEventListener('click', () => this.newGame());
    }

    setupAudio() {
        try {
            this.kickAudio = new Audio('assets/sfx/kick.wav');
            this.applauseAudio = new Audio('assets/sfx/tieng-vo-tay.mp3');
            
            this.kickAudio.volume = this.sfxVolume;
            this.applauseAudio.volume = this.sfxVolume;
            
            // Preload audio
            this.kickAudio.preload = 'auto';
            this.applauseAudio.preload = 'auto';
        } catch (error) {
            console.error('Audio setup error:', error);
        }
    }

    updateVolume(value) {
        this.sfxVolume = value / 100;
        document.querySelector('.volume-display').textContent = value + '%';
        
        if (this.kickAudio) this.kickAudio.volume = this.sfxVolume;
        if (this.applauseAudio) this.applauseAudio.volume = this.sfxVolume;
    }

    testAudio() {
        if (this.applauseAudio) {
            this.applauseAudio.currentTime = 0;
            this.applauseAudio.play().catch(e => console.error('Audio play error:', e));
        }
    }

    parseParticipants(data) {
        return data.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => {
                const parts = line.split('\t');
                if (parts.length >= 2) {
                    return {
                        name: parts[0].trim(),
                        id: parts[1].trim()
                    };
                }
                return null;
            })
            .filter(participant => participant !== null);
    }

    startGame() {
        const participantData = document.getElementById('participantData').value.trim();
        this.luckyCount = parseInt(document.getElementById('luckyCount').value);
        this.spinDuration = parseFloat(document.getElementById('spinDuration').value) * 1000;

        if (!participantData) {
            alert('Vui lòng nhập danh sách người tham gia!');
            return;
        }

        this.participants = this.parseParticipants(participantData);
        
        if (this.participants.length === 0) {
            alert('Định dạng dữ liệu không đúng! Vui lòng kiểm tra lại.');
            return;
        }

        if (this.participants.length < this.luckyCount) {
            alert(`Số lượng người tham gia (${this.participants.length}) không đủ cho ${this.luckyCount} số may mắn!`);
            return;
        }

        this.resetGame();
        this.showPresentationPanel();
        this.generateNumbers();
    }

    showAdminPanel() {
        document.getElementById('adminPanel').classList.add('active');
        document.getElementById('presentationPanel').classList.remove('active');
    }

    showPresentationPanel() {
        document.getElementById('adminPanel').classList.remove('active');
        document.getElementById('presentationPanel').classList.add('active');
        this.updateProgress();
        
        // Ensure numbers are generated when showing presentation
        if (this.participants.length > 0) {
            this.generateNumbers();
        }
    }

    generateNumbers() {
        const numberStrip = document.getElementById('numberStrip');
        numberStrip.innerHTML = '';

        // Get available participants
        const availableParticipants = this.participants.filter(p => 
            !this.winners.some(w => w.id === p.id)
        );

        if (availableParticipants.length === 0) return;

        // Create better randomized list - mix participants multiple times
        const virtualStack = [];
        
        // Create 30 cycles of shuffled participants to ensure variety
        for (let cycle = 0; cycle < 30; cycle++) {
            // Shuffle the available participants for each cycle
            const shuffled = [...availableParticipants];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            
            // Add shuffled participants to virtual stack
            shuffled.forEach(participant => {
                virtualStack.push({...participant, isVirtual: true});
            });
        }

        // Ensure we have exactly 100 items by trimming or padding
        while (virtualStack.length > 100) {
            virtualStack.pop();
        }
        while (virtualStack.length < 100) {
            const randomParticipant = availableParticipants[Math.floor(Math.random() * availableParticipants.length)];
            virtualStack.push({...randomParticipant, isVirtual: true});
        }

        // Add all virtual items to DOM
        virtualStack.forEach((participant, index) => {
            const numberItem = document.createElement('div');
            numberItem.className = 'number-item';
            numberItem.setAttribute('data-index', index);
            numberItem.innerHTML = `
                <div>
                    <div style="font-size: 0.7em; margin-bottom: 5px;">${participant.name}</div>
                    <div style="color: #4ecdc4;">${participant.id}</div>
                </div>
            `;
            numberStrip.appendChild(numberItem);
        });

        // Store virtual stack for later use
        this.virtualStack = virtualStack;
        
        // Reset position to show first items
        numberStrip.style.transform = 'translateY(0px)';
        numberStrip.style.transition = '';
    }

    prepareWinningItems(targetWinner) {
        const numberStrip = document.getElementById('numberStrip');
        
        // Get available participants for random items
        const availableParticipants = this.participants.filter(p => 
            !this.winners.some(w => w.id === p.id)
        );

        // Create winner item (this will be item 101, index 100)
        const winnerItem = document.createElement('div');
        winnerItem.className = 'number-item winner-item';
        winnerItem.setAttribute('data-index', '100');
        winnerItem.style.background = 'rgba(0, 255, 136, 0.1)'; // Slight highlight for debugging
        winnerItem.innerHTML = `
            <div>
                <div style="font-size: 0.7em; margin-bottom: 5px;">${targetWinner.name}</div>
                <div style="color: #4ecdc4;">${targetWinner.id}</div>
            </div>
        `;
        numberStrip.appendChild(winnerItem);

        // Add 2 more random items after winner (items 102, 103)
        for (let i = 0; i < 2; i++) {
            // Create different shuffled lists for variety
            const shuffled = [...availableParticipants];
            for (let j = shuffled.length - 1; j > 0; j--) {
                const k = Math.floor(Math.random() * (j + 1));
                [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
            }
            
            const randomParticipant = shuffled[Math.floor(Math.random() * shuffled.length)];
            const virtualItem = document.createElement('div');
            virtualItem.className = 'number-item';
            virtualItem.setAttribute('data-index', 101 + i);
            virtualItem.innerHTML = `
                <div>
                    <div style="font-size: 0.7em; margin-bottom: 5px;">${randomParticipant.name}</div>
                    <div style="color: #4ecdc4;">${randomParticipant.id}</div>
                </div>
            `;
            numberStrip.appendChild(virtualItem);
        }

        console.log(`Prepared winning items. Winner: ${targetWinner.name} at index 100`);
        console.log(`Total items in strip: ${numberStrip.children.length}`);
        
        return 100; // Always return index 100 (item 101)
    }

    async spinNumber() {
        if (this.isSpinning) return;
        
        const availableParticipants = this.participants.filter(p => 
            !this.winners.some(w => w.id === p.id)
        );

        if (availableParticipants.length === 0) {
            this.showCompletionModal();
            return;
        }

        this.isSpinning = true;
        document.getElementById('spinButton').disabled = true;

        // Select random winner
        const randomIndex = Math.floor(Math.random() * availableParticipants.length);
        const winner = availableParticipants[randomIndex];

        // Prepare winning items (add winner as item 101 + 2 virtual items)
        const targetIndex = this.prepareWinningItems(winner);

        await this.animateSpin(targetIndex);
        
        this.winners.push(winner);
        this.addWinnerToList(winner);
        this.updateProgress();
        
        // Play applause sound
        if (this.applauseAudio) {
            this.applauseAudio.currentTime = 0;
            this.applauseAudio.play().catch(e => console.error('Audio play error:', e));
        }

        this.showWinnerModal(winner);
        
        this.isSpinning = false;
        
        if (this.winners.length < this.luckyCount) {
            document.getElementById('spinButton').disabled = false;
        } else {
            setTimeout(() => this.showCompletionModal(), 2000);
        }
    }

    async animateSpin(targetIndex) {
        const numberStrip = document.getElementById('numberStrip');
        const items = numberStrip.querySelectorAll('.number-item');
        
        if (items.length === 0) return;

        const itemHeight = 120; // Height per item
        const containerHeight = 600; // Container height
        const centerOffset = (containerHeight / 2) - (itemHeight / 2);
        
        // Start from current position (usually 0)
        const startPosition = 0;
        
        // No cycle bonus - direct approach to target
        const fullCycles = 0;
        
        // Calculate total items currently in DOM
        const totalItems = items.length; // Only count existing items
        const oneCycleDistance = totalItems * itemHeight;
        
        // Final position to center the target item (item 101 = index 100)
        const finalPosition = -(targetIndex * itemHeight) + centerOffset;
        
        // Total distance = direct approach to final position
        const totalDistance = Math.abs(finalPosition);
        
        console.log(`Spinning: Direct approach, final position: ${finalPosition}px, total: ${totalDistance}px`);
        
        // Start spinning animation
        const startTime = Date.now();
        let currentPosition = startPosition;
        let lastKickTime = 0;
        let lastItemIndex = -1; // Track which item we just passed
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / this.spinDuration, 1);
            
            // Smooth ease-out curve
            const easeOut = 1 - Math.pow(1 - progress, 2.5);
            
            // Calculate current position
            if (progress < 1) {
                const animatedDistance = totalDistance * easeOut;
                currentPosition = startPosition - animatedDistance;
            } else {
                // Final position: exactly center the target
                currentPosition = finalPosition;
            }
            
            numberStrip.style.transform = `translateY(${currentPosition}px)`;
            
            // Enhanced audio system - play sound when crossing each item
            const currentTime = Date.now();
            
            // Calculate which item we're currently at
            const currentItemPosition = Math.abs(currentPosition) / itemHeight;
            const currentItemIndex = Math.floor(currentItemPosition);
            
            // Calculate speed for audio frequency (items per second)
            const speed = Math.abs(currentPosition - (numberStrip.lastPosition || startPosition));
            numberStrip.lastPosition = currentPosition;
            const itemsPerSecond = speed / itemHeight * 60; // Convert to items per second
            
            // Play sound when we cross to a new item AND we're moving fast enough
            if (currentItemIndex !== lastItemIndex && currentItemIndex >= 0 && speed > 1) {
                // Dynamic frequency based on speed - faster = more frequent
                const baseFrequency = 50; // Minimum time between sounds (ms)
                const speedMultiplier = Math.max(0.1, 1 - (progress * 0.7)); // Start fast, slow down
                const dynamicFrequency = baseFrequency / speedMultiplier;
                
                // Only play if enough time has passed since last sound
                if (currentTime - lastKickTime > dynamicFrequency && progress < 0.9) {
                    if (this.kickAudio) {
                        this.kickAudio.currentTime = 0;
                        this.kickAudio.volume = this.sfxVolume * speedMultiplier; // Volume decreases with speed
                        this.kickAudio.play().catch(e => console.error('Kick audio error:', e));
                        lastKickTime = currentTime;
                    }
                }
                
                lastItemIndex = currentItemIndex;
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation complete - final smooth positioning
                numberStrip.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                numberStrip.style.transform = `translateY(${finalPosition}px)`;
                
                // Highlight the winner after positioning
                setTimeout(() => {
                    const allItems = numberStrip.querySelectorAll('.number-item');
                    allItems.forEach((item, index) => {
                        item.classList.remove('highlight');
                        if (index === targetIndex) {
                            item.classList.add('highlight');
                        }
                    });
                    
                    // Reset and prepare for next spin
                    setTimeout(() => {
                        numberStrip.style.transition = '';
                        // Auto-regenerate for next spin
                        setTimeout(() => {
                            if (this.winners.length < this.luckyCount) {
                                this.generateNumbers();
                            }
                        }, 1500);
                    }, 500);
                }, 200);
            }
        };
        
        requestAnimationFrame(animate);
        
        // Wait for animation to complete
        await new Promise(resolve => setTimeout(resolve, this.spinDuration + 800));
    }

    addWinnerToList(winner) {
        const winnersList = document.getElementById('winnersList');
        const winnerItem = document.createElement('div');
        winnerItem.className = 'winner-item';
        winnerItem.innerHTML = `
            <div class="winner-name">#${this.winners.length} ${winner.name}</div>
            <div class="winner-id">${winner.id}</div>
        `;
        winnersList.appendChild(winnerItem);
    }

    updateProgress() {
        const progressText = document.getElementById('progressText');
        const progressFill = document.getElementById('progressFill');
        
        progressText.textContent = `${this.winners.length} / ${this.luckyCount}`;
        const percentage = (this.winners.length / this.luckyCount) * 100;
        progressFill.style.width = percentage + '%';
    }

    showWinnerModal(winner) {
        const modal = document.getElementById('winnerModal');
        const winnerName = document.getElementById('winnerName');
        const winnerNumber = document.getElementById('winnerNumber');
        
        winnerName.textContent = winner.name;
        winnerNumber.textContent = `ID: ${winner.id}`;
        
        modal.classList.add('active');
        this.createConfetti();
    }

    hideWinnerModal() {
        const modal = document.getElementById('winnerModal');
        modal.classList.remove('active');
        
        // Numbers are already regenerated automatically in animateSpin
        // No need to manually regenerate here
    }

    showCompletionModal() {
        const modal = document.getElementById('completionModal');
        modal.classList.add('active');
        this.createConfetti();
    }

    createConfetti() {
        const container = document.querySelector('.confetti-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.animationDelay = Math.random() * 3 + 's';
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            container.appendChild(confetti);
        }
        
        // Remove confetti after animation
        setTimeout(() => {
            container.innerHTML = '';
        }, 5000);
    }

    resetGame() {
        this.winners = [];
        this.currentSpinIndex = 0;
        this.isSpinning = false;
        
        document.getElementById('winnersList').innerHTML = '';
        document.getElementById('spinButton').disabled = false;
        document.getElementById('winnerModal').classList.remove('active');
        document.getElementById('completionModal').classList.remove('active');
        
        this.updateProgress();
    }

    newGame() {
        this.resetGame();
        this.showAdminPanel();
    }
}

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LuckyNumberSpinner();
});