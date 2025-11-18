import path from 'path';

export async function runDemo(demo: string): Promise<void> {
    const demoFile = path.resolve(__dirname, `src/${demo}`);

    console.log('Running demo:', demoFile);
    try {
        await import(demoFile);
    } catch (e) {
        console.log(e);
        throw e;
    }
}

