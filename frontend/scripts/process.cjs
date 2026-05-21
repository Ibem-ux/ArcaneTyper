const Jimp = require('jimp');

async function processImage() {
    try {
        const image = await Jimp.read('c:/antigravity-proj/TyperMaster/public/duel-mage-bg.png');

        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
            const red = this.bitmap.data[idx + 0];
            const green = this.bitmap.data[idx + 1];
            const blue = this.bitmap.data[idx + 2];

            const avg = (red + green + blue) / 3;

            if (avg > 230) {
                this.bitmap.data[idx + 3] = 0; // alpha = 0
            } else {
                this.bitmap.data[idx + 0] = 58;
                this.bitmap.data[idx + 1] = 43;
                this.bitmap.data[idx + 2] = 88;

                const alphaFactor = 1 - (avg / 230);
                this.bitmap.data[idx + 3] = Math.max(0, Math.min(255, Math.floor(alphaFactor * 255 * 1.5)));
            }
        });

        await image.writeAsync('c:/antigravity-proj/TyperMaster/public/duel-mage-bg-clean.png');
        console.log('Image processed successfully!');
    } catch (e) {
        console.error(e);
    }
}
processImage();
