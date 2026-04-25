const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
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
  const tsImporterFixturePath = process.env.RSX_SMOKE_TS_IMPORTER_FIXTURE
    ? path.resolve(process.env.RSX_SMOKE_TS_IMPORTER_FIXTURE)
    : null;
  const rsxAfterImporterFixturePath = process.env
    .RSX_SMOKE_RSX_AFTER_IMPORTER_FIXTURE
    ? path.resolve(process.env.RSX_SMOKE_RSX_AFTER_IMPORTER_FIXTURE)
    : null;
  const freshSmokeDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'rsx-fresh-smoke-'),
  );
  const freshCompletionPath = path.join(freshSmokeDir, 'fresh-completion.rsx');
  const invalidHeaderPath = path.join(freshSmokeDir, 'invalid-header.rsx');

  fs.writeFileSync(freshCompletionPath, 'def', 'utf8');
  const freshCompletionDocument =
    await vscode.workspace.openTextDocument(freshCompletionPath);
  await vscode.window.showTextDocument(freshCompletionDocument);
  const freshHeaderCompletions = await vscode.commands.executeCommand(
    'vscode.executeCompletionItemProvider',
    freshCompletionDocument.uri,
    new vscode.Position(0, 3),
  );
  const freshHeaderLabels = new Set(
    freshHeaderCompletions?.items?.map((item) => String(item.label)) ?? [],
  );
  const freshHeaderLabelList =
    freshHeaderCompletions?.items?.map((item) => String(item.label)) ?? [];
  assert.equal(
    freshHeaderLabelList[0],
    'defaults',
    'Expected defaults to be the first fresh .rsx header completion',
  );
  for (const label of ['defaults', 'expression', 'model', 'return']) {
    assert.ok(
      freshHeaderLabels.has(label),
      `Expected fresh .rsx header completion for ${label}`,
    );
  }

  const unsavedDefaultsDocument = await vscode.workspace.openTextDocument({
    language: 'rsx',
    content: 'defaults:\n',
  });
  await vscode.window.showTextDocument(unsavedDefaultsDocument);
  const defaultsHoverStart = performance.now();
  const defaultsHovers = await withTimeout(
    vscode.commands.executeCommand(
      'vscode.executeHoverProvider',
      unsavedDefaultsDocument.uri,
      new vscode.Position(0, 2),
    ),
    1000,
    'defaults hover',
  );
  const defaultsHoverElapsedMs = performance.now() - defaultsHoverStart;
  assert.ok(
    defaultsHoverElapsedMs <= 1000,
    `Expected defaults hover response <= 1000ms, got ${defaultsHoverElapsedMs.toFixed(
      2,
    )}ms`,
  );
  assert.ok(
    Array.isArray(defaultsHovers) &&
      defaultsHovers.some((hover) =>
        String(
          hover.contents?.[0]?.value ?? hover.contents?.[0] ?? '',
        ).includes('shared headers'),
      ),
    'Expected defaults hover to explain shared headers',
  );

  fs.writeFileSync(invalidHeaderPath, 'defualts:\n', 'utf8');
  const invalidHeaderDocument =
    await vscode.workspace.openTextDocument(invalidHeaderPath);
  await vscode.window.showTextDocument(invalidHeaderDocument);
  const invalidHeaderDiagnostics = await waitForDiagnostics(
    vscode,
    invalidHeaderDocument.uri,
    (diagnostic) =>
      String(diagnostic.message).includes('Unknown RS-X header key "defualts"'),
  );
  assert.ok(
    invalidHeaderDiagnostics.some((diagnostic) =>
      String(diagnostic.message).includes('Unknown RS-X header key "defualts"'),
    ),
    'Expected invalid fresh .rsx header diagnostic for defualts',
  );

  await assertRsxDiagnostic(vscode, freshSmokeDir, {
    fileName: 'duplicate-defaults.rsx',
    text: ['defaults:', '  model: { value: number }', 'defaults:', ''].join(
      '\n',
    ),
    message: 'Duplicate "defaults" header.',
  });
  await assertRsxDiagnostic(vscode, freshSmokeDir, {
    fileName: 'defaults-after-expression.rsx',
    text: [
      'expression: valueRsx',
      '  model: { value: number }',
      'value',
      '',
      'defaults:',
      '  model: { value: number }',
      '',
    ].join('\n'),
    message: 'Header "defaults" must appear before all expression blocks.',
  });
  await assertRsxDiagnostic(vscode, freshSmokeDir, {
    fileName: 'top-level-model-with-expression.rsx',
    text: [
      'model: { value: number }',
      'expression: valueRsx',
      'value',
      '',
    ].join('\n'),
    message:
      'Header "model" must be indented under defaults: or an expression block in module-style .rsx files.',
  });
  await assertRsxDiagnostic(vscode, freshSmokeDir, {
    fileName: 'missing-expression-model.rsx',
    text: ['expression: valueRsx', 'value', ''].join('\n'),
    message:
      'Expression "valueRsx" must declare a model header because defaults: does not define one.',
  });
  await assertRsxDiagnostic(vscode, freshSmokeDir, {
    fileName: 'expression-model-after-option.rsx',
    text: [
      'defaults:',
      '  model: { value: number }',
      'expression: valueRsx',
      '  lazy: true',
      '  model: { value: number }',
      'value',
      '',
    ].join('\n'),
    message:
      'Header "model" must appear before option and return headers in expression "valueRsx".',
  });
  await assertRsxDiagnostic(vscode, freshSmokeDir, {
    fileName: 'expression-option-after-return.rsx',
    text: [
      'defaults:',
      '  model: { value: number }',
      'expression: valueRsx',
      '  return: number',
      '  lazy: true',
      'value',
      '',
    ].join('\n'),
    message:
      'Header "lazy" must appear before return: in expression "valueRsx".',
  });
  await assertRsxDiagnostic(vscode, freshSmokeDir, {
    fileName: 'defaults-model-after-option.rsx',
    text: [
      'defaults:',
      '  lazy: true',
      '  model: { value: number }',
      'expression: valueRsx',
      'value',
      '',
    ].join('\n'),
    message:
      'Header "model" must appear before option and return headers in defaults block.',
  });
  const liveDiagnosticPath = path.join(freshSmokeDir, 'live-diagnostics.rsx');
  fs.writeFileSync(
    liveDiagnosticPath,
    [
      'defaults:',
      '  model: { value: number }',
      'expression: firstRsx',
      'value',
      '',
    ].join('\n'),
    'utf8',
  );
  const liveDiagnosticDocument =
    await vscode.workspace.openTextDocument(liveDiagnosticPath);
  const liveDiagnosticEditor = await vscode.window.showTextDocument(
    liveDiagnosticDocument,
  );
  const liveDiagnosticAppendPosition = liveDiagnosticDocument.positionAt(
    liveDiagnosticDocument.getText().length,
  );
  await liveDiagnosticEditor.edit((editBuilder) => {
    editBuilder.insert(
      liveDiagnosticAppendPosition,
      ['', 'expression: secondRsx', 'missingValue', ''].join('\n'),
    );
  });
  const liveDiagnostics = await waitForDiagnostics(
    vscode,
    liveDiagnosticDocument.uri,
    (diagnostic) => String(diagnostic.message).includes('missingValue'),
  );
  assert.ok(
    liveDiagnostics.some((diagnostic) =>
      String(diagnostic.message).includes('missingValue'),
    ),
    'Expected diagnostics for a newly added .rsx expression without reloading the window',
  );

  const liveDependencyDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'rsx-live-dependency-smoke-'),
  );
  const liveModelPath = path.join(liveDependencyDir, 'model.ts');
  const liveRsxPath = path.join(liveDependencyDir, 'rule.rsx');
  const liveRsxText = ["model: import('./model').IModel", ''].join('\n');
  fs.writeFileSync(
    liveModelPath,
    'export interface IModel { oldField: number; }\n',
    'utf8',
  );
  fs.writeFileSync(liveRsxPath, liveRsxText, 'utf8');
  const liveRsxDocument = await vscode.workspace.openTextDocument(liveRsxPath);
  await vscode.window.showTextDocument(liveRsxDocument);
  const liveCompletionPosition = liveRsxDocument.positionAt(
    liveRsxDocument.getText().length,
  );
  const initialLiveCompletions = await vscode.commands.executeCommand(
    'vscode.executeCompletionItemProvider',
    liveRsxDocument.uri,
    liveCompletionPosition,
  );
  assert.ok(
    initialLiveCompletions?.items?.some((item) => item.label === 'oldField'),
    'Expected initial .rsx completion from imported model oldField',
  );
  assert.ok(
    !initialLiveCompletions?.items?.some((item) => item.label === 'newField'),
    'Did not expect newField before the imported model file changes',
  );
  fs.writeFileSync(
    liveModelPath,
    'export interface IModel { oldField: number; newField: string; }\n',
    'utf8',
  );
  const updatedLiveCompletions = await vscode.commands.executeCommand(
    'vscode.executeCompletionItemProvider',
    liveRsxDocument.uri,
    liveCompletionPosition,
  );
  assert.ok(
    updatedLiveCompletions?.items?.some((item) => item.label === 'newField'),
    'Expected .rsx completion to pick up imported model newField without reloading the window',
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

  const moduleHoverNeedle = moduleDocument
    .getText()
    .includes('effectiveShippingMethod')
    ? 'effectiveShippingMethod'
    : 'country';
  const moduleHoverStart = performance.now();
  const moduleHovers = await vscode.commands.executeCommand(
    'vscode.executeHoverProvider',
    moduleDocument.uri,
    positionInside(moduleDocument, moduleHoverNeedle),
  );
  const moduleHoverElapsedMs = performance.now() - moduleHoverStart;
  assert.ok(
    moduleHoverElapsedMs <= 2000,
    `Expected module hover response <= 2000ms, got ${moduleHoverElapsedMs.toFixed(
      2,
    )}ms`,
  );
  assert.ok(
    Array.isArray(moduleHovers) && moduleHovers.length > 0,
    `Expected module hover result for ${moduleHoverNeedle}`,
  );

  if (tsImporterFixturePath && rsxAfterImporterFixturePath) {
    const importerDocument = await vscode.workspace.openTextDocument(
      tsImporterFixturePath,
    );
    await vscode.window.showTextDocument(importerDocument);

    const importerTypeDefinitionPosition = positionInside(
      importerDocument,
      'linesRsx',
    );
    const importerTypeDefinitions = await vscode.commands.executeCommand(
      'vscode.executeTypeDefinitionProvider',
      importerDocument.uri,
      importerTypeDefinitionPosition,
    );
    assert.ok(
      Array.isArray(importerTypeDefinitions) &&
        importerTypeDefinitions.some((location) =>
          location.uri.fsPath.endsWith('shipping-quote-model.expressions.rsx'),
        ),
      'Expected TS importer type-definition lookup for linesRsx to resolve to the .rsx source',
    );

    const rsxAfterImporterDocument = await vscode.workspace.openTextDocument(
      rsxAfterImporterFixturePath,
    );
    await vscode.window.showTextDocument(rsxAfterImporterDocument);

    const lineCompletionPosition = positionAfter(
      rsxAfterImporterDocument,
      'line.',
    );
    const lineCompletions = await vscode.commands.executeCommand(
      'vscode.executeCompletionItemProvider',
      rsxAfterImporterDocument.uri,
      lineCompletionPosition,
    );
    assert.ok(
      lineCompletions?.items?.some((item) => item.label === 'qty') &&
        lineCompletions.items.some((item) => item.label === 'unitPrice'),
      'Expected .rsx IntelliSense after opening the TS importer to include line.qty and line.unitPrice',
    );

    const headerTypePosition = positionInside(
      rsxAfterImporterDocument,
      'ShippingQuoteModelContract',
    );
    const headerTypeDefinitions = await vscode.commands.executeCommand(
      'vscode.executeTypeDefinitionProvider',
      rsxAfterImporterDocument.uri,
      headerTypePosition,
    );
    assert.ok(
      Array.isArray(headerTypeDefinitions) &&
        headerTypeDefinitions.some((location) =>
          location.uri.fsPath.endsWith('shipping-quote-model.contract.ts'),
        ),
      'Expected .rsx header type-definition lookup to keep working after opening the TS importer',
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

async function withTimeout(promise, timeoutMs, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Timed out waiting for ${label}`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function waitForDiagnostics(vscode, uri, predicate) {
  const deadline = performance.now() + 3000;
  let diagnostics = [];
  while (performance.now() < deadline) {
    diagnostics = vscode.languages.getDiagnostics(uri);
    if (diagnostics.some(predicate)) {
      return diagnostics;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return diagnostics;
}

async function assertRsxDiagnostic(vscode, directory, args) {
  const filePath = path.join(directory, args.fileName);
  fs.writeFileSync(filePath, args.text, 'utf8');
  const document = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(document);
  const diagnostics = await waitForDiagnostics(
    vscode,
    document.uri,
    (diagnostic) => String(diagnostic.message).includes(args.message),
  );
  assert.ok(
    diagnostics.some((diagnostic) =>
      String(diagnostic.message).includes(args.message),
    ),
    `Expected ${args.fileName} diagnostic containing: ${args.message}`,
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
