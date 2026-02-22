import { supabase } from './supabaseClient.js';

const LOCAL_KEY = 'typermaster_hall_of_fame_v2';

export class Leaderboard {
    constructor() {
        // Local cache for instant UI renders — fallback when offline
        this._local = this._loadLocal();
    }

    // ─── Local Storage Helpers ──────────────────────────────────────────────

    _emptyTemplate() {
        return {
            easy: { score: [], wpm: [], accuracy: [] },
            normal: { score: [], wpm: [], accuracy: [] },
            hard: { score: [], wpm: [], accuracy: [] },
            hell: { score: [], wpm: [], accuracy: [] },
            scribe: { score: [], wpm: [], accuracy: [] }
        };
    }

    _loadLocal() {
        try {
            const stored = localStorage.getItem(LOCAL_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed && parsed.easy) {
                    if (!parsed.scribe) parsed.scribe = { score: [], wpm: [], accuracy: [] };
                    return parsed;
                }
            }
        } catch (e) { /* ignore */ }
        return this._emptyTemplate();
    }

    _saveLocal() {
        try {
            localStorage.setItem(LOCAL_KEY, JSON.stringify(this._local));
        } catch (e) { /* ignore */ }
    }

    _pushToLocal(difficulty, entry) {
        const d = this._local[difficulty];
        if (!d) return;

        d.score.push({ ...entry });
        d.wpm.push({ ...entry });
        if (entry.score > 500) d.accuracy.push({ ...entry });

        d.score.sort((a, b) => b.score - a.score || b.wpm - a.wpm);
        d.wpm.sort((a, b) => b.wpm - a.wpm || b.score - a.score);
        d.accuracy.sort((a, b) => b.accuracy - a.accuracy || b.wpm - a.wpm);

        d.score = d.score.slice(0, 10);
        d.wpm = d.wpm.slice(0, 10);
        d.accuracy = d.accuracy.slice(0, 10);

        this._saveLocal();
    }

    // ─── Public API (all async) ─────────────────────────────────────────────

    /**
     * Returns top 10 entries for a given difficulty + category.
     * Tries Supabase first, falls back to localStorage.
     */
    async getTopScores(difficulty, category) {
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('leaderboard')
                    .select('name, score, wpm, accuracy, created_at')
                    .eq('difficulty', difficulty)
                    .eq('category', category)
                    .order(category, { ascending: false })
                    .limit(10);

                if (!error && data) return data;
            } catch (e) {
                console.warn('[Leaderboard] Supabase fetch failed, using local cache.', e);
            }
        }
        // Fallback: local cache
        return this._local[difficulty]?.[category] || [];
    }

    /**
     * Checks if a score qualifies for the global top 10.
     * Tries Supabase first, falls back to localStorage.
     */
    async isTop10(difficulty, score, wpm, accuracy) {
        if (score === 0) return false;

        if (supabase) {
            try {
                // Check each category
                const checks = await Promise.all([
                    supabase.from('leaderboard').select('score').eq('difficulty', difficulty).eq('category', 'score').order('score', { ascending: false }).limit(10),
                    supabase.from('leaderboard').select('wpm').eq('difficulty', difficulty).eq('category', 'wpm').order('wpm', { ascending: false }).limit(10),
                    supabase.from('leaderboard').select('accuracy').eq('difficulty', difficulty).eq('category', 'accuracy').order('accuracy', { ascending: false }).limit(10),
                ]);

                const [scoreRes, wpmRes, accRes] = checks;

                const beatsBoard = (val, list, field) => {
                    if (!list || list.length < 10) return true;
                    return val > list[list.length - 1][field];
                };

                return beatsBoard(score, scoreRes.data, 'score')
                    || beatsBoard(wpm, wpmRes.data, 'wpm')
                    || (score > 500 && beatsBoard(accuracy, accRes.data, 'accuracy'));

            } catch (e) {
                console.warn('[Leaderboard] Supabase isTop10 failed, using local.', e);
            }
        }

        // Fallback: local check
        const d = this._local[difficulty];
        if (!d) return false;
        const check = (val, list, field) => list.length < 10 || val > (list[list.length - 1]?.[field] ?? 0);
        return check(score, d.score, 'score') || check(wpm, d.wpm, 'wpm') || (score > 500 && check(accuracy, d.accuracy, 'accuracy'));
    }

    /**
     * Saves a score entry to Supabase (all 3 categories) and local cache.
     */
    async addScore(difficulty, name, score, wpm, accuracy) {
        const entry = {
            name: name || 'Anonymous Mage',
            score,
            wpm,
            accuracy,
            date: new Date().toLocaleDateString()
        };

        // Always update local cache immediately (instant UI feedback)
        this._pushToLocal(difficulty, entry);

        if (supabase) {
            try {
                const rows = [
                    { difficulty, category: 'score', name: entry.name, score, wpm, accuracy },
                    { difficulty, category: 'wpm', name: entry.name, score, wpm, accuracy },
                ];
                if (score > 500) {
                    rows.push({ difficulty, category: 'accuracy', name: entry.name, score, wpm, accuracy });
                }

                const { error } = await supabase.from('leaderboard').insert(rows);
                if (error) console.warn('[Leaderboard] Insert failed:', error.message);
            } catch (e) {
                console.warn('[Leaderboard] Supabase addScore failed.', e);
            }
        }
    }
}
