import path from 'path';

export async function runDemo(demo: string): Promise<void> {
  const demoFile = path.resolve(__dirname, `src/${demo}`);

  // Make path relative to current working directory (project root)
  const relativeDemoFile = path.relative(process.cwd(), demoFile);
  console.log('Running demo:', relativeDemoFile);

  // Clear module cache so demo can run fresh each time
  delete require.cache[require.resolve(demoFile)];
  const mod = require(demoFile);

  // Wait for demoPromise (if exported) to finish
  if (mod.run && mod.run.then) {
    await mod.run;
  }
}
