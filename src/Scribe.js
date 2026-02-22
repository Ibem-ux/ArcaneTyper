export class Scribe {
    constructor(dictionary, stats) {
        this.dictionary = dictionary;
        this.stats = stats;

        this.container = document.getElementById('practice-text-container');
        this.wpmDisplay = document.getElementById('practice-wpm');
        this.accDisplay = document.getElementById('practice-acc');

        this.resultsMenu = document.getElementById('practice-results');
        this.resWpm = document.getElementById('practice-res-wpm');
        this.resAcc = document.getElementById('practice-res-acc');

        this.words = [];
        this.wordElements = [];

        this.currentWordIdx = 0;
        this.currentLetterIdx = 0;

        this.isRunning = false;
        this.updateInterval = null;

        // Custom practice stats
        this.startTime = null;
        this.keystrokes = 0;
        this.correctKeystrokes = 0;

        this.inputReady = false; // prevents immediate click/enter from triggering
    }

    start() {
        this.resultsMenu.classList.add('hidden');
        this.container.innerHTML = "";

        // Generate a paragraph of words
        const paragraph = this.dictionary.getRandomParagraph();
        this.words = paragraph.split(' ');

        this.currentWordIdx = 0;
        this.currentLetterIdx = 0;

        this.startTime = null; // Starts on first keypress
        this.keystrokes = 0;
        this.correctKeystrokes = 0;

        this.renderText();
        this.updateHUD();

        this.isRunning = true;
        this.inputReady = false;

        // Prevent whatever key/click started this from registering as a press
        setTimeout(() => {
            this.inputReady = true;
        }, 100);

        this.updateInterval = setInterval(() => this.updateHUD(), 1000); // Update WPM every second
    }

    stop() {
        this.isRunning = false;
        this.inputReady = false;
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }

    renderText() {
        this.container.innerHTML = "";
        this.wordElements = [];

        this.words.forEach((wordText, wIdx) => {
            const wordEl = document.createElement('div');
            wordEl.className = 'word';

            // Render letters
            const letterElements = [];
            for (let i = 0; i < wordText.length; i++) {
                const letterEl = document.createElement('span');
                letterEl.className = 'letter';
                letterEl.textContent = wordText[i];
                wordEl.appendChild(letterEl);
                letterElements.push(letterEl);
            }

            // Optional: space rendered after the word (except the last word)
            if (wIdx < this.words.length - 1) {
                const spaceEl = document.createElement('span');
                spaceEl.className = 'letter space';
                spaceEl.innerHTML = '&nbsp;'; // visual space
                wordEl.appendChild(spaceEl);
                letterElements.push(spaceEl); // treat space as part of the "word" sequence
            }

            this.container.appendChild(wordEl);
            this.wordElements.push(letterElements);
        });

        this.updateCursor();
    }

    updateCursor() {
        // Clear all active
        const allActive = this.container.querySelectorAll('.active');
        allActive.forEach(el => el.classList.remove('active'));

        if (this.currentWordIdx < this.wordElements.length) {
            const currentLetters = this.wordElements[this.currentWordIdx];
            if (this.currentLetterIdx < currentLetters.length) {
                currentLetters[this.currentLetterIdx].classList.add('active');
            }
        }
    }

    handleKeyDown(e) {
        if (!this.isRunning || !this.inputReady) return;

        // Ignore meta keys
        if (e.ctrlKey || e.altKey || e.metaKey || e.key.length > 1 && e.key !== ' ' && e.key !== 'Backspace') return;

        if (!this.startTime) {
            this.startTime = Date.now();
        }

        const currentWordLength = this.wordElements[this.currentWordIdx].length;
        const currentLetterEl = this.wordElements[this.currentWordIdx][this.currentLetterIdx];

        if (e.key === 'Backspace') {
            if (this.currentLetterIdx > 0) {
                this.currentLetterIdx--;
                const prevEl = this.wordElements[this.currentWordIdx][this.currentLetterIdx];
                prevEl.classList.remove('correct', 'incorrect');
                this.updateCursor();
            } else if (this.currentWordIdx > 0) {
                // Cannot backspace across strictly completed words if desired, but here we'll allow it
                this.currentWordIdx--;
                this.currentLetterIdx = this.wordElements[this.currentWordIdx].length - 1;
                const prevEl = this.wordElements[this.currentWordIdx][this.currentLetterIdx];
                prevEl.classList.remove('correct', 'incorrect');
                this.updateCursor();
            }
            return;
        }

        // Expected character
        let expectedChar = currentLetterEl.textContent;
        if (currentLetterEl.classList.contains('space')) {
            expectedChar = ' ';
        }

        this.keystrokes++;

        if (e.key === expectedChar) {
            this.correctKeystrokes++;
            currentLetterEl.classList.add('correct');
            currentLetterEl.classList.remove('incorrect');
        } else {
            currentLetterEl.classList.add('incorrect');
            currentLetterEl.classList.remove('correct');
        }

        this.currentLetterIdx++;

        // Advance to next word if we completed this one
        if (this.currentLetterIdx >= currentWordLength) {
            this.currentWordIdx++;
            this.currentLetterIdx = 0;

            // Did we finish the entire paragraph?
            if (this.currentWordIdx >= this.words.length) {
                this.finishTrial();
                return;
            }
        }

        this.updateCursor();
        this.updateHUD(); // immediate visual update on keystroke
    }

    getWPM() {
        if (!this.startTime || this.keystrokes === 0) return 0;
        const minutesElapsed = (Date.now() - this.startTime) / 60000;
        if (minutesElapsed === 0) return 0;
        return Math.round((this.correctKeystrokes / 5) / minutesElapsed);
    }

    getAccuracy() {
        if (this.keystrokes === 0) return 100;
        return Math.round((this.correctKeystrokes / this.keystrokes) * 100);
    }

    updateHUD() {
        this.wpmDisplay.innerText = this.getWPM();
        this.accDisplay.innerText = this.getAccuracy();
    }

    finishTrial() {
        this.stop();
        this.wpmDisplay.innerText = this.getWPM();
        this.accDisplay.innerText = this.getAccuracy();

        // Show results menu
        this.resWpm.innerText = this.getWPM();
        this.resAcc.innerText = this.getAccuracy();
        this.resultsMenu.classList.remove('hidden');

        if (this.onTrialComplete) {
            this.onTrialComplete(this.getWPM(), this.getAccuracy());
        }
    }
}
