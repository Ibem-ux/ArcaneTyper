const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', error => console.error('BROWSER ERROR:', error.message));

    console.log("Navigating to local dev server...");
    await page.goto('http://localhost:5173');

    console.log("Clicking Practice button...");
    await page.click('#practice-btn');

    console.log("Waiting a bit...");
    await page.waitForTimeout(2000); // 2 seconds

    console.log("Checking visibility of #practice-ui...");
    const isPracticeVisible = await page.isVisible('#practice-ui');
    console.log("Practice UI Visible:", isPracticeVisible);

    const isResultsVisible = await page.isVisible('#practice-results');
    console.log("Practice Results Visible:", isResultsVisible);

    console.log("HTML OF PRACTICE UI:");
    console.log(await page.innerHTML('#practice-ui'));

    await browser.close();
})();
