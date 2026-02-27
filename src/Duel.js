/**
 * Duel.js — Manages 1v1 Mage Duel real-time state via Supabase Realtime.
 *
 * Usage:
 *   const duel = new Duel(supabase, playerName);
 *   await duel.create();               // Host: creates room, returns roomCode
 *   await duel.join(roomCode);         // Guest: joins existing room
 *   duel.broadcast({ score, wpm, barriers, status }); // Send state
 *   duel.onOpponentUpdate = (state) => { ... };
 *   duel.disconnect();
 */
export class Duel {
    constructor(supabase, playerName) {
        this.supabase = supabase;
        this.playerName = playerName || 'Anonymous Mage';
        this.roomCode = null;
        this.channel = null;
        this.isHost = false;

        // Callbacks
        this.onOpponentUpdate = null;   // (opponentState) => void
        this.onOpponentJoined = null;   // () => void
        this.onOpponentLeft = null;     // () => void
    }

    /**
     * Generate a short, readable room code.
     */
    _generateCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }

    /**
     * HOST: Create a new Duel room and start listening for an opponent.
     * @returns {string} The generated Room Code.
     */
    async create() {
        this.isHost = true;
        this.roomCode = this._generateCode();
        await this._subscribe();
        return this.roomCode;
    }

    /**
     * GUEST: Join an existing Duel room by code.
     * @param {string} roomCode
     */
    async join(roomCode) {
        this.isHost = false;
        this.roomCode = roomCode.toUpperCase().trim();
        await this._subscribe();
    }

    /**
     * Subscribe to the Supabase Realtime channel for this room.
     */
    async _subscribe() {
        const channelName = `duel:${this.roomCode}`;

        // Clean up any previous channel
        if (this.channel) {
            await this.supabase.removeChannel(this.channel);
        }

        this.channel = this.supabase.channel(channelName, {
            config: { presence: { key: this.playerName } }
        });

        // Listen for real-time game state broadcasts
        this.channel.on('broadcast', { event: 'state' }, ({ payload }) => {
            if (payload.player !== this.playerName && this.onOpponentUpdate) {
                this.onOpponentUpdate(payload);
            }
        });

        // Presence tracking: detect when opponent joins or leaves
        this.channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
            if (key !== this.playerName && this.onOpponentJoined) {
                this.onOpponentJoined();
            }
        });

        this.channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            if (key !== this.playerName && this.onOpponentLeft) {
                this.onOpponentLeft();
            }
        });

        await this.channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await this.channel.track({ online_at: new Date().toISOString() });
            }
        });
    }

    /**
     * Broadcast the local player's current game state to the opponent.
     * @param {{ score: number, wpm: number, barriers: number, status: string }} payload
     */
    broadcast(payload) {
        if (!this.channel) return;
        this.channel.send({
            type: 'broadcast',
            event: 'state',
            payload: { player: this.playerName, ...payload }
        });
    }

    /**
     * Disconnect from the duel channel.
     */
    async disconnect() {
        if (this.channel && this.supabase) {
            await this.supabase.removeChannel(this.channel);
        }
        this.channel = null;
        this.roomCode = null;
    }
}
