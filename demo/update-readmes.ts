import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(".");

function walkDir(dir: string): string[] {
  const files: string[] = [];
  for (const file of readdirSync(dir)) {
    const fullPath = join(dir, file);

    // Skip node_modules and hidden folders
    if (file === "node_modules" || file.startsWith(".")) continue;

    try {
      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        files.push(...walkDir(fullPath));
      } else {
        files.push(fullPath);
      }
    } catch {
      // skip files that can't be read
      continue;
    }
  }
  return files;
}

function updateReadme(filePath: string) {
  let content = readFileSync(filePath, "utf-8");

  const includeRegex = /^( *){% include_relative (.+?) %}/gm;

  content = content.replace(includeRegex, (match, indentation, relativePath) => {
    const demoFile = resolve(filePath, "..", relativePath.trim());
    try {
      const demoContent = readFileSync(demoFile, "utf-8");
      return demoContent
        .split("\n")
        .map(line => indentation + line)
        .join("\n");
    } catch {
      return indentation + `// FILE NOT FOUND: ${relativePath}`;
    }
  });

  const outFile = join(filePath.replace("_readme.md", "readme.md"));
  writeFileSync(outFile, content, "utf-8");
}

// Recursively find all _readme.md files
const readmeFiles = walkDir(root).filter(f => f.endsWith("_readme.md"));
readmeFiles.forEach(updateReadme);

console.log("Readmes updated!");