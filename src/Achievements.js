export class Achievements {
    constructor(audioController) {
        this.audio = audioController;
        this.unlocked = new Set();
        
        // Load from local storage for now (Sync to Supabase later if requested)
        const saved = localStorage.getItem('typerMaster_achievements');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                parsed.forEach(id => this.unlocked.add(id));
            } catch (e) {
                console.error("Failed to parse achievements", e);
            }
        }

        // Achievement definitions
        this.definitions = {
            'first_blood': { id: 'first_blood', name: 'First Blood', description: 'Type your first word.', title: 'Apprentice' },
            'speed_demon': { id: 'speed_demon', name: 'Speed Demon', description: 'Reach 100 WPM.', title: 'Speedcaster' },
            'untouchable': { id: 'untouchable', name: 'Untouchable', description: 'Reach a 50x Combo streak.', title: 'The Undefeated' },
            'boss_slayer': { id: 'boss_slayer', name: 'Boss Slayer', description: 'Defeat your first Boss.', title: 'Dragonbane' },
            'millionaire': { id: 'millionaire', name: 'Archmage', description: 'Reach Level 10.', title: 'Archmage' },
            'survivor': { id: 'survivor', name: 'Survivor', description: 'Survive for 5 minutes in a single run.', title: 'The Enduring' }
        };
        
        // Callbacks for UI updates
        this.onUnlockCallback = null;
    }

    _save() {
        localStorage.setItem('typerMaster_achievements', JSON.stringify(Array.from(this.unlocked)));
    }

    onEvent(eventName, data) {
        if (eventName === 'word_typed') {
            this.checkUnlock('first_blood');
        } else if (eventName === 'wpm_update') {
            if (data.wpm >= 100) this.checkUnlock('speed_demon');
        } else if (eventName === 'combo_update') {
            if (data.combo >= 50) this.checkUnlock('untouchable');
        } else if (eventName === 'boss_defeated') {
            this.checkUnlock('boss_slayer');
        } else if (eventName === 'level_up') {
            if (data.level >= 10) this.checkUnlock('millionaire');
        } else if (eventName === 'time_survived') {
            if (data.time >= 300) this.checkUnlock('survivor'); // 300 seconds = 5 mins
        }
    }

    checkUnlock(achievementId) {
        if (!this.unlocked.has(achievementId) && this.definitions[achievementId]) {
            this.unlocked.add(achievementId);
            this._save();
            
            const def = this.definitions[achievementId];
            if (this.audio) this.audio.playSound('tada'); // Assumes a triumph sound exists
            
            if (this.onUnlockCallback) {
                this.onUnlockCallback(def);
            }
            
            console.log(`Unlocked Achievement: ${def.name}! You earned the title: ${def.title}`);
        }
    }

    getUnlockedTitles() {
        return Array.from(this.unlocked).map(id => this.definitions[id].title);
    }
    
    getUnlockedAchievements() {
        return Array.from(this.unlocked).map(id => this.definitions[id]);
    }
}
