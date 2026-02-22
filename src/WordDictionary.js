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
}
