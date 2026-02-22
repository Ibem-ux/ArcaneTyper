export const wordList = {
  easy: [
    "hex", "orb", "rune", "mana", "aura", "void", "wand", "zap",
    "jinx", "fire", "ice", "dark", "dust", "soul", "flame", "cast",
    "gale", "bolt", "mage", "charm", "burn", "star", "moon", "sun",
    "ash", "fog", "mist", "wind", "sand", "clay", "iron", "gold"
  ],
  medium: [
    "phantom", "grimoire", "alchemy", "potion", "crystal", "scorch",
    "thunder", "illusive", "mirage", "cyclone", "blizzard", "summon",
    "spirit", "enchant", "warden", "mystic", "oracle", "inferno",
    "incant", "banish", "hexing", "shadow", "glimmer", "eclipse",
    "templar", "sorcery", "vampire", "warlock", "element", "scepter"
  ],
  hard: [
    "necromancy", "pyromancer", "chronomancy", "invocation", "obliterate",
    "resurrection", "transmute", "clairvoyance", "thaumaturge",
    "cataclysm", "maelstrom", "apprehend", "malevolent", "benevolent",
    "enchantment", "evocation", "divination", "conjuration", "illusionist",
    "apocalypse", "omnipotence", "incantation", "polymorph", "invincible"
  ],
  epic: [
    "phantasmagoria", "prestidigitation", "unfathomable", "luminescence",
    "transmogrification", "indestructible", "quintessence", "doppelganger",
    "necronomicon", "omniscient", "apocalyptic", "extraterrestrial"
  ],
  paragraphs: [
    "In the ancient days before the sundering of the realms, mages did not cast spells so much as they spoke to the fundamental forces of the world. Fire was a tempestuous companion that required coaxing, and water was a stubborn friend that only yielded to the most patient of voices. To be a sorcerer was to be a diplomat to the elements themselves.",

    "The grand archives of the Citadel contain knowledge that spans millennia. Some scrolls are so saturated with magical theory that they hum with an inner light, casting long shadows in the cavernous halls. It is said that reading them without the proper protective wards can cause a scholar's mind to detach from their physical form entirely.",

    "A true master of the arcane arts understands that power is not merely the violent expulsion of energy, but the subtle manipulation of probability. A fireball is impressive, certainly, but untying the threads of fate to ensure an enemy's blade misses your heart by a fraction of an inch requires a precision that takes decades to cultivate.",

    "When the sky turned crimson and the stars began to fall like burning tears, the High Council realized their hubris. They had attempted to bind a creature from beyond the veil, a being of pure thought and malevolence. Now, the very fabric of reality was tearing at the seams, and only a unified incantation could seal the breach before the world was consumed.",

    "To forge a staves of true power, one must gather the heartwood of an ironbark tree struck by lightning, the core of a fallen star, and the willing tear of a dragon. Once assembled, the artifact must be submerged in the waters of the abyssal depth for a full lunar cycle, absorbing the quiet crushing pressure of the deep dark."
  ]
};

export class WordDictionary {
  constructor() {
    this.words = wordList;
  }

  getRandomWord(difficulty = 'easy') {
    const list = this.words[difficulty] || this.words.easy;
    return list[Math.floor(Math.random() * list.length)];
  }

  getWordForDifficulty(difficulty) {
    let listName = 'easy';
    if (difficulty === 'normal') listName = 'medium';
    if (difficulty === 'hard') listName = 'hard';
    if (difficulty === 'hell') listName = 'epic';

    const list = this.words[listName] || this.words.easy;
    return list[Math.floor(Math.random() * list.length)];
  }

  getBossWord() {
    // Combine two random epic/hard words with a hyphen for a long 20+ letter word
    const list1 = this.words.epic;
    const list2 = this.words.hard;
    const word1 = list1[Math.floor(Math.random() * list1.length)];
    const word2 = list2[Math.floor(Math.random() * list2.length)];
    return `${word1}-${word2}`;
  }

  getRandomParagraph() {
    const list = this.words.paragraphs;
    return list[Math.floor(Math.random() * list.length)];
  }
}
