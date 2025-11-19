import path from 'path';

export async function runDemo(demo: string): Promise<void> {
    const demoFile = path.resolve(__dirname, `src/${demo}`);
    console.log('Running demo:', demoFile);

    delete require.cache[require.resolve(demoFile)];
    const mod = require(demoFile);

    // Wait for the demoPromise to finish
    if (mod.run && mod.run.then) {
        await mod.run;
    }
}