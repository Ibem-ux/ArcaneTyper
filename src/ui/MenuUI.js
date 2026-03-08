export class MenuUI {
    constructor(game, startMenu) {
        this.game = game;
        this.startMenu = startMenu;

        // Patch Board Elements
        this.patchBoardMenu = document.getElementById('patch-board-menu');
        this.openPatchBoardBtn = document.getElementById('open-patch-board-btn');
        this.closePatchBoardBtn = document.getElementById('close-patch-board-btn');
        this.patchNotesContainer = document.getElementById('patch-notes-container');

        this.patchNotes = [
            {
                version: "v2.2.4",
                date: "March 7, 2026",
                desc: "Dashboard UI Polish & Layout Simplification",
                changes: [
                    "Moved Spellbook (dictionary selector) to the top-right corner of the main dashboard for quicker access.",
                    "Removed Spellbook and Discipline from the central selectors to declutter the dashboard.",
                    "Moved Discipline (class selector) into the Mage Profile panel as an interactive dropdown.",
                    "Fixed: Multiple layout-breaking HTML structure errors that caused the dashboard to go blank."
                ]
            },
            {
                version: "v2.2.3",
                date: "March 3, 2026",
                desc: "Guest Mode, Magical Toasts & Scribe Improvements",
                changes: [
                    "Added Guest Account system — play without registering using a temporary Mage Title.",
                    "Guests can access Arcane Survival, The Scribe's Trial, and the Hall of Fame.",
                    "Guest scores are submitted to the leaderboard under their chosen alias.",
                    "Replaced all browser alert() dialogs with animated Magical Toast notifications.",
                    "Added Escape key support to instantly dismiss toasts and close the Duel Lobby.",
                    "Fixed: Dashboard blur/unclickable state after returning from Profile or Duel Lobby.",
                    "Fixed: Scribe mode and duration dropdowns were losing focus immediately when clicked.",
                    "Fixed: Scribe Timed mode now uses full paragraphs instead of random disconnected words.",
                    "Expanded Arcane Dictionary: ~150 new words and 15 new lore paragraphs added."
                ]
            },
            {
                version: "v2.2.2",
                date: "February 28, 2026",
                desc: "UI Polish & Layout Adjustments",
                changes: [
                    "Fixed the overlapping layout in the Mage Profile.",
                    "Adjusted the Start Menu layout to prevent scrolling on standard displays.",
                    "Fixed Mage and Tower silhouette hover interactions."
                ]
            },
            {
                version: "v2.2.1",
                date: "February 28, 2026",
                desc: "Emergency Patch - Mage Duel Fixes",
                changes: [
                    "Fixed an issue where creating a Mage Duel lobby would immediately start the game by oneself.",
                    "Corrected the Suppabase Realtime presence payload evaluation for the local host.",
                    "Added this enchanted Patch Board for easier access to updates!",
                    "Improved layout responsiveness on mobile devices (Silhouettes format to edges).",
                    "Added 'Enter' key support as an alternative to 'Tab' for casting Supernova."
                ]
            },
            {
                version: "v2.2.0",
                date: "February 27, 2026",
                desc: "Multiplayer Real-Time Mage Duels",
                changes: [
                    "Introduced 1v1 Mage Duels.",
                    "Battle other typers in real time using 6-character room codes.",
                    "Live opponent tracking (Score, WPM, Barriers) powered by Supabase Realtime."
                ]
            },
            {
                version: "v2.1.0",
                date: "February 23, 2026",
                desc: "The Scribe's Trial & Canvas Engine",
                changes: [
                    "New Practice Mode: The Scribe's Trial with timed modes (15s, 30s, 60s).",
                    "Added classic continuous-flow spaced-word mechanics and graphing.",
                    "Overhauled the game to run on an HTML5 `<canvas>` engine for better performance."
                ]
            }
        ];
    }

    init() {
        this.populatePatchBoard();
        this.setupListeners();
    }

    populatePatchBoard() {
        if (!this.patchNotesContainer) return;

        this.patchNotesContainer.innerHTML = '';
        this.patchNotes.forEach(patch => {
            const item = document.createElement('div');
            item.className = 'patch-item';

            const header = document.createElement('div');
            header.className = 'patch-header';
            header.innerHTML = `<span class="patch-version">${patch.version}</span><span class="patch-date">${patch.date}</span>`;

            const body = document.createElement('div');
            body.className = 'patch-body';
            const p = document.createElement('p');
            p.innerText = patch.desc;
            const ul = document.createElement('ul');

            patch.changes.forEach(change => {
                const li = document.createElement('li');
                li.innerText = change;
                ul.appendChild(li);
            });

            body.appendChild(p);
            body.appendChild(ul);
            item.appendChild(header);
            item.appendChild(body);
            this.patchNotesContainer.appendChild(item);
        });
    }

    setupListeners() {
        if (this.openPatchBoardBtn) {
            this.openPatchBoardBtn.addEventListener('click', () => {
                this.startMenu.classList.remove('active');
                this.startMenu.classList.add('hidden');
                this.patchBoardMenu.classList.remove('hidden');
                // small delay to let display:flex apply before opacity transition
                setTimeout(() => {
                    this.patchBoardMenu.classList.add('active');
                }, 10);
            });
        }

        if (this.closePatchBoardBtn) {
            this.closePatchBoardBtn.addEventListener('click', () => {
                this.patchBoardMenu.classList.remove('active');
                this.patchBoardMenu.classList.add('hidden');
                this.startMenu.classList.remove('hidden');
                this.startMenu.classList.add('active');
            });
        }
    }
}
