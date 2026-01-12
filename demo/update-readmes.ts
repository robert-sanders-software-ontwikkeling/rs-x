import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';

const EXCLUDED_DIRS = ['node_modules', 'dist', '.git'];

function walkDir(dir: string, callback: (filePath: string) => void) {
  if (EXCLUDED_DIRS.some((ex) => dir.includes(ex))) {
    return;
  }

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walkDir(fullPath, callback);
    }
    else if (entry.toLowerCase() === '_readme.md') {
      callback(fullPath);
    }
  }
}

function updateReadme(readmePath: string) {
  let content = readFileSync(readmePath, 'utf-8');
  const lines = content.split('\n');

  const updatedLines = lines.map((line) => {
    const match = line.match(/\{\%\s*include_relative\s+(.+?)\s*\%\}/);
    if (!match) {
      return line;
    }

    const demoPath = match[1].trim();
    const absDemoPath = join(dirname(readmePath), demoPath);

    let demoCode: string;
    try {
      demoCode = readFileSync(absDemoPath, 'utf-8');
    } catch {
      return `// FILE NOT FOUND: ${demoPath}`;
    }

    // Detect indentation before "{% include_relative ..."
    const indentMatch = line.match(/^(\s*)\{\%/);
    const indentation = indentMatch ? indentMatch[1] : '';

    const indentedCode = demoCode
      .split('\n')
      .map((l) => (l.trim() === '' ? '' : indentation + l))
      .join('\n');

    return indentedCode;
  });

  const newContent = updatedLines.join('\n');
  const outputReadmePath = join(dirname(readmePath), 'readme.md');

  if (!existsSync(outputReadmePath) || readFileSync(outputReadmePath, 'utf-8') !== newContent) {
    writeFileSync(outputReadmePath, newContent, 'utf-8');
    console.log(`Generated: ${outputReadmePath}`);
  }
}

walkDir(process.cwd(), updateReadme);
console.log('All _readme.md files processed.');