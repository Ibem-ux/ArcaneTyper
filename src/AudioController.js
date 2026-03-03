export class AudioController {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.bgOscillator1 = null;
        this.bgOscillator2 = null;
        this.bgFilter = null;
        this.bgGain = null;

        // Tension Arpeggiator
        this.tensionOsc = null;
        this.tensionGain = null;
        this.tensionLfo = null;
        this.isPlayingBg = false;

        // Master volume
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.5; // Starts at 50%
        this.masterGain.connect(this.ctx.destination);

        // Intensity state
        this.currentIntensity = 0; // 0.0 to 1.0 based on combo
    }

    _resumeContext() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playMagicSpark() {
        this._resumeContext();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.1); // High pitch slide up

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.2);
    }

    playTypeSound() {
        this._resumeContext();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Short, high-pitched "tick"
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.05);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.1, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.06);
    }

    playErrorSound() {
        this._resumeContext();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Low "buzz"
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.linearRampToValueAtTime(90, t + 0.1);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.2);
    }

    playLevelUp() {
        this._resumeContext();
        const t = this.ctx.currentTime;

        // Fast Arpeggio (C major vi)
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

        notes.forEach((freq, index) => {
            const noteTime = t + index * 0.1;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, noteTime);

            gain.gain.setValueAtTime(0, noteTime);
            gain.gain.linearRampToValueAtTime(0.2, noteTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.3);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(noteTime);
            osc.stop(noteTime + 0.4);
        });
    }

    playComboSound(combo) {
        this._resumeContext();
        const t = this.ctx.currentTime;

        // Define melodies based on combo tier (10 = low, 50 = epic)
        let rootFreq = 440; // A4
        let notes = [];

        // All tiers will use pure 'sine' waves now to avoid any "static" or "buzzing" sound.
        // We simulate a magical harp or bell chime glissando.
        if (combo >= 50) {
            rootFreq = 880; // A5
            notes = [1, 1.25, 1.5, 1.666, 2.0]; // Ethereal 5-note sweep (Major pentatonic)
        } else if (combo >= 40) {
            rootFreq = 659.25; // E5
            notes = [1, 1.25, 1.5, 2.0]; // Major chord sweep
        } else if (combo >= 30) {
            rootFreq = 523.25; // C5
            notes = [1, 1.25, 1.5]; // Major triad
        } else if (combo >= 20) {
            rootFreq = 440; // A4
            notes = [1, 1.2]; // Minor third (A4 -> C5)
        } else if (combo >= 10) {
            rootFreq = 329.63; // E4
            notes = [1]; // Single smooth chime
        } else {
            return;
        }

        notes.forEach((ratio, index) => {
            const noteTime = t + index * 0.1; // Slightly slower, more deliberate chime
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine'; // Pure, clean bell sound
            osc.frequency.setValueAtTime(rootFreq * ratio, noteTime);

            // Envelope: fast attack, long smooth decay (bell-like)
            gain.gain.setValueAtTime(0, noteTime);
            gain.gain.linearRampToValueAtTime(0.4, noteTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.6);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(noteTime);
            osc.stop(noteTime + 1.0); // Let the chime ring out
        });
    }

    playExplosion() {
        this._resumeContext();
        const t = this.ctx.currentTime;

        // Low frequency thud
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.5);

        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

        // Filter it to make it sound muffled/bassy
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, t);
        filter.frequency.exponentialRampToValueAtTime(100, t + 0.5);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.6);
    }

    playShatter() {
        this._resumeContext();
        const t = this.ctx.currentTime;
        const duration = 0.3;

        // White noise burst for glass shattering
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 2000; // Let only high frequencies through (glassy)

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start(t);
    }

    startBackgroundMusic() {
        this._resumeContext();
        if (this.isPlayingBg) return;
        this.isPlayingBg = true;

        const t = this.ctx.currentTime;

        // Create a deep, mysterious drone using two detuned triangles
        this.bgOscillator1 = this.ctx.createOscillator();
        this.bgOscillator2 = this.ctx.createOscillator();

        this.bgOscillator1.type = 'sine';
        this.bgOscillator2.type = 'triangle';

        // Deep bass note (A1 ~ 55Hz)
        this.bgOscillator1.frequency.value = 55;
        this.bgOscillator2.frequency.value = 55.5; // Slight detune for phasing/chorus effect

        // Lowpass filter to muffle it into the background
        this.bgFilter = this.ctx.createBiquadFilter();
        this.bgFilter.type = 'lowpass';
        this.bgFilter.frequency.value = 400;

        // Add slow LFO to the filter frequency to make it "breathe"
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1; // Very slow, 10 seconds per cycle
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 150; // Sweeps filter by 150hz
        lfo.connect(lfoGain);
        lfoGain.connect(this.bgFilter.frequency);
        lfo.start();

        this.bgGain = this.ctx.createGain();
        this.bgGain.gain.setValueAtTime(0.001, t); // Start silent
        this.bgGain.gain.linearRampToValueAtTime(0.2, t + 4); // Fade in over 4 seconds

        this.bgOscillator1.connect(this.bgFilter);
        this.bgOscillator2.connect(this.bgFilter);
        this.bgFilter.connect(this.bgGain);
        this.bgGain.connect(this.masterGain);

        // --- Tension Layer (Smooth Choir/Ethereal instead of Sawtooth/Square) ---
        // A high, smooth sine wave that fades in at high combo to create tension without buzzing
        this.tensionOsc = this.ctx.createOscillator();
        this.tensionOsc.type = 'sine';
        this.tensionOsc.frequency.value = 880; // High A5 note

        this.tensionGain = this.ctx.createGain();
        this.tensionGain.gain.setValueAtTime(0, t); // Starts completely silent

        // Slow tremolo effect to make it shimmer instead of gating rapidly
        this.tensionLfo = this.ctx.createOscillator();
        this.tensionLfo.type = 'sine';
        this.tensionLfo.frequency.value = 4; // 4Hz gentle wobble

        const tremoloGain = this.ctx.createGain();
        tremoloGain.gain.value = 0.5; // Base level
        this.tensionLfo.connect(tremoloGain.gain);

        this.tensionOsc.connect(tremoloGain);
        tremoloGain.connect(this.tensionGain);
        this.tensionGain.connect(this.masterGain);

        this.tensionOsc.start(t);
        this.tensionLfo.start(t);

        this.bgOscillator1.start(t);
        this.bgOscillator2.start(t);
    }

    stopBackgroundMusic() {
        if (!this.isPlayingBg) return;
        this.isPlayingBg = false;

        const t = this.ctx.currentTime;
        if (this.bgGain) {
            // Fade out
            this.bgGain.gain.cancelScheduledValues(t);
            this.bgGain.gain.setValueAtTime(this.bgGain.gain.value, t);
            this.bgGain.gain.linearRampToValueAtTime(0.01, t + 2);

            this.tensionGain.gain.cancelScheduledValues(t);
            this.tensionGain.gain.setValueAtTime(this.tensionGain.gain.value, t);
            this.tensionGain.gain.linearRampToValueAtTime(0, t + 1);

            setTimeout(() => {
                if (this.bgOscillator1) this.bgOscillator1.stop();
                if (this.bgOscillator2) this.bgOscillator2.stop();
                if (this.tensionOsc) this.tensionOsc.stop();
                if (this.tensionLfo) this.tensionLfo.stop();
            }, 2100);
        }
    }

    setMusicIntensity(intensity) {
        if (!this.isPlayingBg) return;

        // Clamp intensity 0.0 to 1.0 (e.g. maxes out at 50 combo)
        this.currentIntensity = Math.min(1.0, Math.max(0, intensity));

        const t = this.ctx.currentTime;
        const targetFreq = 55 + (this.currentIntensity * 10); // Slight pitch up (55Hz -> 65Hz)
        const targetFilterFreq = 400 + (this.currentIntensity * 600); // 400 up to 1000Hz (softer than before to avoid buzz)

        if (this.bgOscillator1) {
            this.bgOscillator1.frequency.linearRampToValueAtTime(targetFreq, t + 0.5);
        }
        if (this.bgOscillator2) {
            this.bgOscillator2.frequency.linearRampToValueAtTime(targetFreq + 0.5, t + 0.5);
        }

        if (this.bgFilter) {
            this.bgFilter.frequency.setTargetAtTime(targetFilterFreq, t, 0.5);
        }

        // Fade in the shimmering tension layer gracefully
        if (this.tensionGain) {
            let tensionVolume = 0;
            if (this.currentIntensity > 0.4) {
                // Map the upper 60% of intensity to volume
                tensionVolume = (this.currentIntensity - 0.4) * 1.5 * 0.1;
            }
            this.tensionGain.gain.setTargetAtTime(tensionVolume, t, 0.5);
        }
    }
}
