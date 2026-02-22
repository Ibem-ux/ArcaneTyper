import { WordDictionary } from './src/WordDictionary.js';

const dict = new WordDictionary();
try {
    const word = dict.getRandomWord('normal');
    console.log("SUCCESS:", word);

    // Just mock 25 pushes
    const words = [];
    for (let i = 0; i < 25; i++) {
        words.push(dict.getRandomWord('normal'));
    }
    console.log("Pushed 25 words.");
} catch (e) {
    console.error("ERROR:", e);
}
