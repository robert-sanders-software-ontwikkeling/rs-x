import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readdirSync, statSync } from "node:fs";
import { execSync } from "node:child_process";

// -----------------------------------------------------------------------------
// 1. Repo root
// -----------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, "..");
process.chdir(root);

// -----------------------------------------------------------------------------
// 2. Read demo name from CLI
// -----------------------------------------------------------------------------
const demoName = process.argv[2]; // optional
const demoRoot = resolve(root, "demo", "src");

// -----------------------------------------------------------------------------
// 3. Build all internal packages first
// -----------------------------------------------------------------------------
console.log("Building internal packages...");
execSync("pnpm -r run build", { stdio: "inherit" });

// -----------------------------------------------------------------------------
// 4. Find demo files recursively
// -----------------------------------------------------------------------------
function findDemos(dir: string): string[] {
  let demos: string[] = [];
  for (const name of readdirSync(dir)) {
    const fullPath = resolve(dir, name);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      demos.push(...findDemos(fullPath));
    } else if (stats.isFile() && name.endsWith(".ts")) {
      demos.push(fullPath);
    }
  }
  return demos;
}

const allDemos = demoName
  ? [resolve(demoRoot, `${demoName}.ts`)]
  : findDemos(demoRoot);

if (allDemos.length === 0) {
  console.error("No demo files found!");
  process.exit(1);
}

// -----------------------------------------------------------------------------
// 5. Build and run demo
// -----------------------------------------------------------------------------
async function buildAndRunDemo(entryFile: string) {
  const relativePath = entryFile.replace(demoRoot + "/", "");
  const outFile = resolve(root, "demo", "dist", relativePath.replace(/\.ts$/, ".js"));

  console.log(`\n--- Building demo: ${relativePath} ---`);

  await build({
    entryPoints: [entryFile],
    bundle: true,
    platform: "node",
    format: "cjs",
    sourcemap: true,
    minify: false,
    outfile: outFile,
    alias: {
      "@rs-x/core": resolve(root, "rs-x-core", "dist", "index.js"),
      "@rs-x/state-manager": resolve(root, "rs-x-state-manager", "dist", "index.js"),
      "@rs-x/expression-parser": resolve(root, "rs-x-expression-parser", "dist", "index.js"),
    },
  });

  console.log(`Demo built: ${outFile}`);
  console.log("********************************");
  console.log(`Running demo: ${relativePath}`);
  console.log("********************************");

  execSync(`node "${outFile}"`, { stdio: "inherit" });
}

// -----------------------------------------------------------------------------
// 6. Execute all demos sequentially
// -----------------------------------------------------------------------------
(async () => {
  for (const demoFile of allDemos) {
    await buildAndRunDemo(demoFile);
  }
})();