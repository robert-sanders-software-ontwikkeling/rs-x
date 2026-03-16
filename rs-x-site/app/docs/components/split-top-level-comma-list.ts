export function splitTopLevelCommaList(value: string): string[] {
  const items: string[] = [];
  let current = '';
  let angleDepth = 0;
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;

  for (const char of value) {
    if (char === '<') {
      angleDepth += 1;
      current += char;
      continue;
    }
    if (char === '>' && angleDepth > 0) {
      angleDepth -= 1;
      current += char;
      continue;
    }
    if (char === '(') {
      parenDepth += 1;
      current += char;
      continue;
    }
    if (char === ')' && parenDepth > 0) {
      parenDepth -= 1;
      current += char;
      continue;
    }
    if (char === '{') {
      braceDepth += 1;
      current += char;
      continue;
    }
    if (char === '}' && braceDepth > 0) {
      braceDepth -= 1;
      current += char;
      continue;
    }
    if (char === '[') {
      bracketDepth += 1;
      current += char;
      continue;
    }
    if (char === ']' && bracketDepth > 0) {
      bracketDepth -= 1;
      current += char;
      continue;
    }

    if (
      char === ',' &&
      angleDepth === 0 &&
      parenDepth === 0 &&
      braceDepth === 0 &&
      bracketDepth === 0
    ) {
      const normalized = current.replace(/\s+/g, ' ').trim();
      if (normalized.length > 0) {
        items.push(normalized);
      }
      current = '';
      continue;
    }

    current += char;
  }

  const tail = current.replace(/\s+/g, ' ').trim();
  if (tail.length > 0) {
    items.push(tail);
  }

  return items;
}
