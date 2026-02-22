export class Leaderboard {
    constructor() {
        this.storageKey = 'typermaster_hall_of_fame_v2'; // Bumped version to clear old incompatible structure
        this.data = this.load();
    }

    resetDataTemplate() {
        return {
            easy: { score: [], wpm: [], accuracy: [] },
            normal: { score: [], wpm: [], accuracy: [] },
            hard: { score: [], wpm: [], accuracy: [] },
            hell: { score: [], wpm: [], accuracy: [] }
        };
    }

    load() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Basic validation
                if (parsed && typeof parsed === 'object' && parsed.easy) {
                    return parsed;
                }
            } catch (e) {
                console.error("Failed to load leaderboard data.", e);
            }
        }
        return this.resetDataTemplate();
    }

    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    }

    getTopScores(difficulty, category) {
        if (!this.data[difficulty]) return [];
        return this.data[difficulty][category] || [];
    }

    isTop10(difficulty, score, wpm, accuracy) {
        // Must type at least something to qualify (prevent 0 score/0 wpm spam)
        if (score === 0) return false;
        if (!this.data[difficulty]) return false;

        const diffData = this.data[difficulty];

        const checkCategory = (val, cat, sortDesc) => {
            const list = diffData[cat];
            if (list.length < 10) return true; // Room for more

            const worstOnBoard = list[list.length - 1][cat];
            return sortDesc ? val > worstOnBoard : val < worstOnBoard;
        };

        const isTopScore = checkCategory(score, 'score', true);
        const isTopWpm = checkCategory(wpm, 'wpm', true);
        const isTopAcc = score > 500 && checkCategory(accuracy, 'accuracy', true);

        return isTopScore || isTopWpm || isTopAcc;
    }

    addScore(difficulty, name, score, wpm, accuracy) {
        if (!this.data[difficulty]) return;

        const entry = {
            name: name || 'Anonymous Mage',
            score: score,
            wpm: wpm,
            accuracy: accuracy,
            date: new Date().toLocaleDateString()
        };

        const diffData = this.data[difficulty];

        // Add to all categories
        diffData.score.push({ ...entry });
        diffData.wpm.push({ ...entry });

        // Only add to accuracy if they actually played a bit (score > 500)
        if (score > 500) {
            diffData.accuracy.push({ ...entry });
        }

        // Sort descending
        diffData.score.sort((a, b) => b.score - a.score || b.wpm - a.wpm);
        diffData.wpm.sort((a, b) => b.wpm - a.wpm || b.score - a.score);
        diffData.accuracy.sort((a, b) => b.accuracy - a.accuracy || b.wpm - a.wpm);

        // Trim to top 10
        diffData.score = diffData.score.slice(0, 10);
        diffData.wpm = diffData.wpm.slice(0, 10);
        diffData.accuracy = diffData.accuracy.slice(0, 10);

        this.save();
    }
}
