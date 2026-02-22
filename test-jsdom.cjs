const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('./index.html', 'utf8');
const dom = new JSDOM(html);
const { window } = dom;
global.window = window;
global.document = window.document;

class WordDictionary {
    getRandomWord() { return "test"; }
}
const dict = new WordDictionary();

const ScribeMod = require('fs').readFileSync('./src/Scribe.js', 'utf8');
const script = ScribeMod.replace('export class Scribe', 'global.Scribe = class Scribe');
eval(script);

const scribe = new global.Scribe(dict, {});
console.log("Starting Scribe...");
try {
    scribe.start();
    console.log("Words generated:", scribe.words.length);
    console.log("Is running?", scribe.isRunning);

    const practiceUi = document.getElementById('practice-ui');
    console.log("practiceUi classList:", practiceUi.className);

    const results = document.getElementById('practice-results');
    console.log("results classList:", results.className);

    // Simulate what happens 1s later
    setTimeout(() => {
        console.log("1s later running?", scribe.isRunning);
        console.log("results classList 1s later:", results.className);
    }, 1000);

} catch (e) {
    console.error("ERROR running scribe:", e);
}
