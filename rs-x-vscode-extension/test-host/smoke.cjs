const path = require('node:path');
const assert = require('node:assert/strict');

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

  console.log(`RS-X VS Code smoke test passed in ${workspaceRoot}`);
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
