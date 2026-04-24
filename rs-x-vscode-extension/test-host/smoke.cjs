const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');

async function run() {
  const vscode = require('vscode');
  const extensionRoot = path.resolve(__dirname, '..');
  const workspaceRoot = path.resolve(extensionRoot, '..');
  const fixturePath = path.resolve(
    extensionRoot,
    'tests/fixtures/rsx-implementation.fixture.rsx',
  );
  const quickFixFixturePath = path.resolve(
    extensionRoot,
    'tests/fixtures/rsx-quickfix.fixture.rsx',
  );
  const moduleFixturePath = process.env.RSX_SMOKE_MODULE_FIXTURE
    ? path.resolve(process.env.RSX_SMOKE_MODULE_FIXTURE)
    : path.resolve(
        extensionRoot,
        'tests/fixtures/rsx-module-performance.fixture.rsx',
      );

  const document = await vscode.workspace.openTextDocument(fixturePath);
  await vscode.window.showTextDocument(document);

  const completionPosition = positionAfter(document, 'calculator.to');
  const completions = await vscode.commands.executeCommand(
    'vscode.executeCompletionItemProvider',
    document.uri,
    completionPosition,
  );
  assert.ok(
    completions?.items?.some((item) => item.label === 'total'),
    'Expected .rsx completion for total()',
  );

  const hoverPosition = positionInside(document, 'total');
  const hovers = await vscode.commands.executeCommand(
    'vscode.executeHoverProvider',
    document.uri,
    hoverPosition,
  );
  assert.ok(
    Array.isArray(hovers) && hovers.length > 0,
    'Expected hover result',
  );

  const symbols = await vscode.commands.executeCommand(
    'vscode.executeDocumentSymbolProvider',
    document.uri,
  );
  assert.ok(
    Array.isArray(symbols) && symbols.length > 0,
    'Expected document symbols',
  );

  const typoDocument =
    await vscode.workspace.openTextDocument(quickFixFixturePath);
  await vscode.window.showTextDocument(typoDocument);
  const typoPosition = positionInside(typoDocument, 'lineTotl');
  const typoRange = new vscode.Range(
    typoPosition,
    typoPosition.translate(0, 'lineTotl'.length),
  );
  const codeActions = await vscode.commands.executeCommand(
    'vscode.executeCodeActionProvider',
    typoDocument.uri,
    typoRange,
  );
  assert.ok(
    Array.isArray(codeActions) &&
      codeActions.some((action) => String(action.title).includes('lineTotal')),
    'Expected quick fix suggestion for lineTotal',
  );

  const moduleDocument =
    await vscode.workspace.openTextDocument(moduleFixturePath);
  const moduleEditor = await vscode.window.showTextDocument(moduleDocument);
  const moduleFocusPosition = positionInside(
    moduleDocument,
    'line.qty * line.unitPrice',
  );
  moduleEditor.selection = new vscode.Selection(
    moduleFocusPosition,
    moduleFocusPosition,
  );

  const firstStart = performance.now();
  const firstSemanticTokens = await executeDocumentSemanticTokens(
    vscode,
    moduleDocument.uri,
  );
  const firstElapsedMs = performance.now() - firstStart;
  assert.ok(
    firstElapsedMs <= 2000,
    `Expected first module semantic-token response <= 2000ms, got ${firstElapsedMs.toFixed(2)}ms`,
  );

  const secondStart = performance.now();
  const secondSemanticTokens = await executeDocumentSemanticTokens(
    vscode,
    moduleDocument.uri,
  );
  const secondElapsedMs = performance.now() - secondStart;
  assert.ok(
    secondElapsedMs <= 2000,
    `Expected second module semantic-token response <= 2000ms, got ${secondElapsedMs.toFixed(2)}ms`,
  );

  const decodedSpans = decodeSemanticTokenSpans(
    vscode,
    moduleDocument,
    secondSemanticTokens,
  );
  const requiredSemanticTexts = [
    'lineTotal',
    'line',
    'qty',
    'unitPrice',
    'country',
  ];
  for (const requiredText of requiredSemanticTexts) {
    assert.ok(
      decodedSpans.some((span) => span.text === requiredText),
      `Expected semantic token span for ${requiredText}`,
    );
  }

  if (process.env.RSX_SMOKE_RESULT_FILE) {
    fs.writeFileSync(
      process.env.RSX_SMOKE_RESULT_FILE,
      JSON.stringify(
        {
          moduleFixturePath,
          firstElapsedMs,
          secondElapsedMs,
          decodedSpanCount: decodedSpans.length,
        },
        null,
        2,
      ),
      'utf8',
    );
  }

  console.log(
    `RS-X VS Code smoke test passed in ${workspaceRoot} (module semantic first=${firstElapsedMs.toFixed(
      2,
    )}ms second=${secondElapsedMs.toFixed(2)}ms)`,
  );
}

exports.run = run;

function positionInside(document, needle) {
  const offset = document.getText().indexOf(needle);
  if (offset === -1) {
    throw new Error(`Needle not found: ${needle}`);
  }
  return document.positionAt(offset);
}

function positionAfter(document, needle) {
  const offset = document.getText().indexOf(needle);
  if (offset === -1) {
    throw new Error(`Needle not found: ${needle}`);
  }
  return document.positionAt(offset + needle.length);
}

async function executeDocumentSemanticTokens(vscode, uri) {
  let lastError;
  const commandCandidates = [
    'vscode.executeDocumentSemanticTokensProvider',
    'vscode.provideDocumentSemanticTokens',
  ];

  for (const command of commandCandidates) {
    try {
      const result = await vscode.commands.executeCommand(command, uri);
      if (result && result.data) {
        return result;
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw (
    lastError ??
    new Error(`No semantic token command returned data for ${uri.toString()}`)
  );
}

function decodeSemanticTokenSpans(vscode, document, semanticTokens) {
  const rawData = Array.from(semanticTokens.data ?? []);
  const spans = [];
  let line = 0;
  let character = 0;
  for (let index = 0; index + 4 < rawData.length; index += 5) {
    const deltaLine = rawData[index];
    const deltaStart = rawData[index + 1];
    const length = rawData[index + 2];
    if (deltaLine === 0) {
      character += deltaStart;
    } else {
      line += deltaLine;
      character = deltaStart;
    }

    const start = new vscode.Position(line, character);
    const end = new vscode.Position(line, character + length);
    spans.push({
      text: document.getText(new vscode.Range(start, end)).trim(),
    });
  }
  return spans;
}
