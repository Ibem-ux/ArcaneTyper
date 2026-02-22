export const wordList = {
  easy: [
    // Original
    "hex", "orb", "rune", "mana", "aura", "void", "wand", "zap",
    "jinx", "fire", "ice", "dark", "dust", "soul", "flame", "cast",
    "gale", "bolt", "mage", "charm", "burn", "star", "moon", "sun",
    "ash", "fog", "mist", "wind", "sand", "clay", "iron", "gold",
    // New
    "doom", "fang", "sear", "sage", "rift", "ward", "glow", "wisp",
    "bane", "flux", "rime", "pyre", "veil", "lore", "echo", "tomb",
    "claw", "dark", "fate", "myth", "dusk", "dawn", "zeal", "oath",
    "vale", "raze", "sway", "boon", "dread", "seep", "bind", "wraith"
  ],
  medium: [
    // Original
    "phantom", "grimoire", "alchemy", "potion", "crystal", "scorch",
    "thunder", "illusive", "mirage", "cyclone", "blizzard", "summon",
    "spirit", "enchant", "warden", "mystic", "oracle", "inferno",
    "incant", "banish", "hexing", "shadow", "glimmer", "eclipse",
    "templar", "sorcery", "vampire", "warlock", "element", "scepter",
    // New
    "specter", "arcanum", "vortex", "shrouded", "basilisk", "conduit",
    "revenant", "sanctum", "eldritch", "ominous", "unravel", "celestial",
    "chimera", "fracture", "phantom", "gravity", "serpent", "torment",
    "wyvern", "specter", "fissure", "undying", "cursed", "brimstone",
    "abyssal", "maelstrom", "ancient", "twilight", "herald", "relic"
  ],
  hard: [
    // Original
    "necromancy", "pyromancer", "chronomancy", "invocation", "obliterate",
    "resurrection", "transmute", "clairvoyance", "thaumaturge",
    "cataclysm", "maelstrom", "apprehend", "malevolent", "benevolent",
    "enchantment", "evocation", "divination", "conjuration", "illusionist",
    "apocalypse", "omnipotence", "incantation", "polymorph", "invincible",
    // New
    "petrification", "annihilation", "translucent", "catastrophic",
    "reincarnate", "subjugate", "obliteration", "thunderstruck",
    "immolation", "spellbinder", "bewilderment", "incandescent",
    "impenetrable", "vaporization", "hallucination", "disintegrate",
    "reverberate", "combustion", "phantomstrike", "thunderclap",
    "spellweaver", "ossification", "amalgamate", "suffocation"
  ],
  epic: [
    // Original
    "phantasmagoria", "prestidigitation", "unfathomable", "luminescence",
    "transmogrification", "indestructible", "quintessence", "doppelganger",
    "necronomicon", "omniscient", "apocalyptic", "extraterrestrial",
    // New
    "transcendental", "insurmountable", "incomprehensible", "irrefutable",
    "otherworldly", "uncontrollable", "unimaginable", "counterintuitive",
    "overpowering", "multidimensional", "unquenchable", "invulnerability",
    "spellcataclysm", "electrification", "shadowmanipulation", "selfimmolation"
  ],
  paragraphs: [
    "in the ancient days before the sundering of the realms, mages did not cast spells so much as they spoke to the fundamental forces of the world. fire was a tempestuous companion that required coaxing, and water was a stubborn friend that only yielded to the most patient of voices. to be a sorcerer was to be a diplomat to the elements themselves.",

    "the grand archives of the citadel contain knowledge that spans millennia. some scrolls are so saturated with magical theory that they hum with an inner light, casting long shadows in the cavernous halls. it is said that reading them without the proper protective wards can cause a scholar's mind to detach from their physical form entirely.",

    "a true master of the arcane arts understands that power is not merely the violent expulsion of energy, but the subtle manipulation of probability. a fireball is impressive, certainly, but untying the threads of fate to ensure an enemy's blade misses your heart by a fraction of an inch requires a precision that takes decades to cultivate.",

    "when the sky turned crimson and the stars began to fall like burning tears, the high council realized their hubris. they had attempted to bind a creature from beyond the veil, a being of pure thought and malevolence. now, the very fabric of reality was tearing at the seams, and only a unified incantation could seal the breach before the world was consumed.",

    "to forge a staves of true power, one must gather the heartwood of an ironbark tree struck by lightning, the core of a fallen star, and the willing tear of a dragon. once assembled, the artifact must be submerged in the waters of the abyssal depth for a full lunar cycle, absorbing the quiet crushing pressure of the deep dark."
  ]
};

export class WordDictionary {
  constructor() {
    this.words = wordList;

    // Shuffle-queue: a separate shuffled deck per difficulty tier
    // Once a deck is exhausted, it reshuffles automatically
    this._queues = {};
  }

  // Fisher-Yates shuffle
  _shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Draw the next word from a shuffled queue for a given tier.
  // Automatically refills and reshuffles when empty.
  _drawFromQueue(tier) {
    if (!this._queues[tier] || this._queues[tier].length === 0) {
      this._queues[tier] = this._shuffle(this.words[tier] || this.words.easy);
    }
    return this._queues[tier].pop();
  }

  getRandomWord(difficulty = 'easy') {
    return this._drawFromQueue(difficulty);
  }

  getWordForDifficulty(difficulty) {
    let tier = 'easy';
    if (difficulty === 'normal') tier = 'medium';
    if (difficulty === 'hard') tier = 'hard';
    if (difficulty === 'hell') tier = 'epic';
    return this._drawFromQueue(tier);
  }

  getBossWord() {
    const word1 = this._drawFromQueue('epic');
    const word2 = this._drawFromQueue('hard');
    return `${word1}-${word2}`;
  }

  getRandomParagraph() {
    const list = this.words.paragraphs;
    return list[Math.floor(Math.random() * list.length)];
  }
}
