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

  getWordByDifficultyScore(score) {
    if (score < 500) return this.getRandomWord('easy');
    if (score < 1500) return this.getRandomWord(Math.random() > 0.4 ? 'medium' : 'easy');
    if (score < 3000) return this.getRandomWord(Math.random() > 0.3 ? 'hard' : 'medium');
    if (score < 5000) return this.getRandomWord(Math.random() > 0.5 ? 'epic' : 'hard');
    return this.getRandomWord(Math.random() > 0.2 ? 'epic' : 'hard');
  }
}
