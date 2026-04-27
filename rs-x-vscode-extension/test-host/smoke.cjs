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
  const freshAutoSuggestPath = path.join(freshSmokeDir, 'fresh-auto.rsx');
  const invalidHeaderPath = path.join(freshSmokeDir, 'invalid-header.rsx');
  const rsxImportTargetPath = path.join(freshSmokeDir, 'test.rsx');
  const rsxImportConsumerPath = path.join(freshSmokeDir, 'consumer.rsx');

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

  fs.writeFileSync(freshAutoSuggestPath, '', 'utf8');
  const freshAutoSuggestDocument =
    await vscode.workspace.openTextDocument(freshAutoSuggestPath);
  await assertTypingDefAutoAcceptsDefaults(
    vscode,
    freshAutoSuggestDocument,
    'saved fresh .rsx file',
  );
  await assertDefaultsThenModAutoAcceptsModel(
    vscode,
    freshAutoSuggestDocument,
    'saved fresh .rsx file after accepting defaults and pressing Enter',
  );
  await assertSameLineTextAfterDefaultsDoesNotLoad(
    vscode,
    freshAutoSuggestDocument,
    'saved fresh .rsx file',
  );
  await assertFullNewExpressionAuthoringCycle(
    vscode,
    freshAutoSuggestDocument,
    'saved fresh .rsx file',
  );
  await assertTypingHeaderAutoAccepts(
    vscode,
    freshAutoSuggestDocument,
    'defaults:\n',
    'mod',
    'defaults:\n  model: ',
    'saved fresh .rsx file after defaults',
  );
  await assertTypingHeaderAutoAccepts(
    vscode,
    freshAutoSuggestDocument,
    'expression: valueRsx\n',
    'mod',
    'expression: valueRsx\n  model: ',
    'saved fresh .rsx file after expression',
  );
  await assertRsxHeaderExpressionImportFlow(
    vscode,
    rsxImportTargetPath,
    rsxImportConsumerPath,
  );

  if (process.env.RSX_SMOKE_EXACT_FRESH_RSX_FILE) {
    const exactFreshDocument = await vscode.workspace.openTextDocument(
      path.resolve(process.env.RSX_SMOKE_EXACT_FRESH_RSX_FILE),
    );
    await assertDefaultsThenModAutoAcceptsModel(
      vscode,
      exactFreshDocument,
      `exact fresh .rsx file ${process.env.RSX_SMOKE_EXACT_FRESH_RSX_FILE}`,
    );
    await assertCompleteFreshExpressionUserFlow(
      vscode,
      exactFreshDocument,
      `exact fresh .rsx file ${process.env.RSX_SMOKE_EXACT_FRESH_RSX_FILE}`,
    );
  }

  const unsavedCompletionDocument = await vscode.workspace.openTextDocument({
    language: 'rsx',
    content: 'def',
  });
  await vscode.window.showTextDocument(unsavedCompletionDocument);
  const unsavedHeaderCompletions = await vscode.commands.executeCommand(
    'vscode.executeCompletionItemProvider',
    unsavedCompletionDocument.uri,
    new vscode.Position(0, 3),
  );
  assert.ok(
    unsavedHeaderCompletions?.items?.some(
      (item) => String(item.label) === 'defaults',
    ),
    'Expected unsaved .rsx document completion for defaults',
  );

  const untitledRsxUri = vscode.Uri.parse(
    `untitled:${path.join(freshSmokeDir, 'new-unsaved.rsx')}`,
  );
  const untitledRsxDocument =
    await vscode.workspace.openTextDocument(untitledRsxUri);
  await assertTypingDefAutoAcceptsDefaults(
    vscode,
    untitledRsxDocument,
    'untitled .rsx URI document',
  );
  await replaceDocumentText(vscode, untitledRsxDocument, 'def');
  await vscode.window.showTextDocument(untitledRsxDocument);
  const untitledHeaderCompletions = await vscode.commands.executeCommand(
    'vscode.executeCompletionItemProvider',
    untitledRsxDocument.uri,
    new vscode.Position(0, 3),
  );
  assert.ok(
    untitledHeaderCompletions?.items?.some(
      (item) => String(item.label) === 'defaults',
    ),
    `Expected untitled .rsx URI completion for defaults, languageId=${untitledRsxDocument.languageId}`,
  );

  const typedCompletionDocument = await vscode.workspace.openTextDocument({
    language: 'rsx',
    content: '',
  });
  await assertTypingDefAutoAcceptsDefaults(
    vscode,
    typedCompletionDocument,
    'unsaved language=rsx document',
  );
  const editorConfiguration = vscode.workspace.getConfiguration(
    'editor',
    typedCompletionDocument.uri,
  );
  const quickSuggestions = editorConfiguration.get('quickSuggestions');
  assert.ok(
    quickSuggestions === true ||
      quickSuggestions?.other === true ||
      quickSuggestions?.other === 'on',
    `Expected RS-X quickSuggestions.other to be enabled for typed header authoring, got ${JSON.stringify(
      quickSuggestions,
    )}`,
  );
  assert.equal(
    editorConfiguration.get('suggestOnTriggerCharacters'),
    true,
    'Expected RS-X suggestOnTriggerCharacters to be enabled',
  );
  await replaceDocumentText(vscode, typedCompletionDocument, 'def');
  const typedHeaderCompletions = await vscode.commands.executeCommand(
    'vscode.executeCompletionItemProvider',
    typedCompletionDocument.uri,
    new vscode.Position(0, 3),
  );
  const typedDefaultsCompletion = typedHeaderCompletions?.items?.find(
    (item) => String(item.label) === 'defaults',
  );
  assert.ok(
    typedDefaultsCompletion,
    'Expected defaults completion after simulating typing def into a fresh .rsx document',
  );
  assert.equal(
    String(typedDefaultsCompletion.insertText),
    'defaults: ',
    'Expected defaults completion to insert the full header',
  );
  assert.equal(
    typedDefaultsCompletion.range?.start?.line,
    0,
    'Expected defaults completion replacement range to start on the typed line',
  );
  assert.equal(
    typedDefaultsCompletion.range?.start?.character,
    0,
    'Expected defaults completion replacement range to start before def',
  );
  assert.equal(
    typedDefaultsCompletion.range?.end?.character,
    3,
    'Expected defaults completion replacement range to cover def',
  );

  const mistypedHeaderDocument = await vscode.workspace.openTextDocument({
    language: 'rsx',
    content: 'defs',
  });
  await vscode.window.showTextDocument(mistypedHeaderDocument);
  const mistypedCompletionStart = performance.now();
  const mistypedCompletions = await withTimeout(
    vscode.commands.executeCommand(
      'vscode.executeCompletionItemProvider',
      mistypedHeaderDocument.uri,
      new vscode.Position(0, 4),
    ),
    1000,
    'mistyped fresh header completion',
  );
  const mistypedCompletionElapsedMs =
    performance.now() - mistypedCompletionStart;
  assert.ok(
    mistypedCompletionElapsedMs <= 1000,
    `Expected mistyped fresh header completion response <= 1000ms, got ${mistypedCompletionElapsedMs.toFixed(
      2,
    )}ms`,
  );
  assert.equal(
    mistypedCompletions?.items?.some(
      (item) => String(item.label) === 'defaults',
    ),
    false,
    'Expected mistyped defs header to avoid stale defaults completions',
  );

  const mistypedHoverStart = performance.now();
  const mistypedHovers = await withTimeout(
    vscode.commands.executeCommand(
      'vscode.executeHoverProvider',
      mistypedHeaderDocument.uri,
      new vscode.Position(0, 2),
    ),
    1000,
    'mistyped fresh header hover',
  );
  const mistypedHoverElapsedMs = performance.now() - mistypedHoverStart;
  assert.ok(
    mistypedHoverElapsedMs <= 1000,
    `Expected mistyped fresh header hover response <= 1000ms, got ${mistypedHoverElapsedMs.toFixed(
      2,
    )}ms`,
  );
  assert.equal(
    mistypedHovers?.length ?? 0,
    0,
    'Expected mistyped defs header hover to return no loading result',
  );

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

  const incompleteModelHeaderDocument = await vscode.workspace.openTextDocument(
    {
      language: 'rsx',
      content: 'defaults:\n  model: { x: number, y: number',
    },
  );
  await vscode.window.showTextDocument(incompleteModelHeaderDocument);
  const incompleteModelHeaderPosition =
    incompleteModelHeaderDocument.positionAt(
      'defaults:\n  model: { x: number, y'.length,
    );
  const incompleteModelHoverStart = performance.now();
  const incompleteModelHovers = await withTimeout(
    vscode.commands.executeCommand(
      'vscode.executeHoverProvider',
      incompleteModelHeaderDocument.uri,
      incompleteModelHeaderPosition,
    ),
    1000,
    'incomplete defaults model header hover',
  );
  assert.ok(
    performance.now() - incompleteModelHoverStart <= 1000,
    'Expected incomplete defaults model header hover to return without loading',
  );
  assert.equal(
    incompleteModelHovers?.length ?? 0,
    0,
    'Expected incomplete defaults model header hover to return no loading result',
  );

  const incompleteModelCompletionStart = performance.now();
  const incompleteModelCompletions = await withTimeout(
    vscode.commands.executeCommand(
      'vscode.executeCompletionItemProvider',
      incompleteModelHeaderDocument.uri,
      incompleteModelHeaderPosition,
    ),
    1000,
    'incomplete defaults model header completion',
  );
  assert.ok(
    performance.now() - incompleteModelCompletionStart <= 1000,
    'Expected incomplete defaults model header completion to return without loading',
  );
  assert.equal(
    incompleteModelCompletions?.items?.length ?? 0,
    0,
    'Expected incomplete defaults model header completion to return no stale suggestions',
  );

  await replaceDocumentText(
    vscode,
    incompleteModelHeaderDocument,
    'defaults:\nmod',
  );
  const recoveredCompletions = await withTimeout(
    vscode.commands.executeCommand(
      'vscode.executeCompletionItemProvider',
      incompleteModelHeaderDocument.uri,
      new vscode.Position(1, 3),
    ),
    1000,
    'header completion after incomplete model header hover',
  );
  assert.ok(
    recoveredCompletions?.items?.some((item) => String(item.label) === 'model'),
    'Expected model completion to keep working after incomplete header hover',
  );

  await replaceDocumentText(
    vscode,
    incompleteModelHeaderDocument,
    [
      'defaults:',
      '  model: { x: number, y: number',
      '',
      'expression: sumRsx',
      '  x + y',
    ].join('\n'),
  );
  const brokenModelDiagnostics = await waitForDiagnostics(
    vscode,
    incompleteModelHeaderDocument.uri,
    () => true,
  );
  assert.ok(
    brokenModelDiagnostics.length > 0,
    'Expected incomplete defaults model header to produce an editor diagnostic',
  );
  await replaceDocumentText(
    vscode,
    incompleteModelHeaderDocument,
    [
      'defaults:',
      '  model: { x: number, y: number }',
      '',
      'expression: sumRsx',
      '  x + y',
    ].join('\n'),
  );
  await waitForNoDiagnostics(
    vscode,
    incompleteModelHeaderDocument,
    'fixed incomplete defaults model header',
  );

  await assertOptionHeaderReturnMismatchFlow(
    vscode,
    incompleteModelHeaderDocument,
    'module option headers with declared return mismatch',
  );
  await assertMultilineModelExpressionReferenceFlow(
    vscode,
    incompleteModelHeaderDocument,
    'multi-line model expression reference shorthand',
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

async function delay(timeoutMs) {
  await new Promise((resolve) => setTimeout(resolve, timeoutMs));
}

async function assertTypingDefAutoAcceptsDefaults(vscode, document, label) {
  await assertTypingHeaderAutoAccepts(
    vscode,
    document,
    '',
    'def',
    'defaults: ',
    label,
  );
}

async function assertDefaultsThenModAutoAcceptsModel(vscode, document, label) {
  await vscode.window.showTextDocument(document);
  const originalText = document.getText();
  await replaceDocumentText(vscode, document, '');
  try {
    await vscode.commands.executeCommand('type', { text: 'def' });
    await delay(1000);
    await vscode.commands.executeCommand('acceptSelectedSuggestion');
    assert.equal(
      document.getText(),
      'defaults: ',
      `Expected ${label} to accept defaults before typing model`,
    );

    await vscode.commands.executeCommand('type', { text: '\n' });
    await vscode.commands.executeCommand('type', { text: 'mod' });
    assert.equal(
      document.getText(),
      'defaults: \nmod',
      `Expected ${label} to contain mod on the line after defaults`,
    );

    const position = document.positionAt(document.getText().length);
    const hovers = await withTimeout(
      vscode.commands.executeCommand(
        'vscode.executeHoverProvider',
        document.uri,
        position,
      ),
      1000,
      `${label} mod header-authoring hover`,
    );
    assert.ok(
      Array.isArray(hovers),
      `Expected ${label} mod hover to return immediately`,
    );
    assert.ok(
      hovers.some((hover) =>
        hover.contents?.some?.((content) =>
          String(content.value ?? content).includes('model:'),
        ),
      ),
      `Expected ${label} mod hover to resolve to model header help`,
    );

    await delay(1000);
    await vscode.commands.executeCommand('acceptSelectedSuggestion');
    assert.equal(
      document.getText(),
      'defaults: \n  model: ',
      `Expected ${label} to accept model after defaults newline`,
    );
  } finally {
    await replaceDocumentText(vscode, document, originalText);
    if (document.uri.scheme === 'file') {
      await document.save();
    }
  }
}

async function assertCompleteFreshExpressionUserFlow(vscode, document, label) {
  await vscode.window.showTextDocument(document);
  const originalText = document.getText();
  try {
    await assertHeaderCompletionLabels(
      vscode,
      document,
      '',
      ['defaults', 'expression', 'model', 'return'],
      label,
    );
    await assertHeaderCompletionLabels(
      vscode,
      document,
      'defaults:\n  ',
      [
        'model',
        'preparse',
        'lazy',
        'lazyGroup',
        'compiled',
        'compile',
        'return',
      ],
      label,
    );
    await assertHeaderCompletionLabels(
      vscode,
      document,
      'expression: valueRsx\n  ',
      [
        'model',
        'preparse',
        'lazy',
        'lazyGroup',
        'compiled',
        'compile',
        'return',
      ],
      label,
    );
    await assertHeaderCompletionLabels(
      vscode,
      document,
      'expression: valueRsx\ncomp',
      ['compiled', 'compile'],
      label,
    );
    await assertHeaderCompletionLabels(
      vscode,
      document,
      'expression: valueRsx\nret',
      ['return'],
      label,
    );

    await replaceDocumentText(vscode, document, '');
    await vscode.commands.executeCommand('type', { text: 'def' });
    await delay(1000);
    await vscode.commands.executeCommand('acceptSelectedSuggestion');
    assert.equal(
      document.getText(),
      'defaults: ',
      `Expected ${label} to accept defaults`,
    );
    await vscode.commands.executeCommand('type', { text: '\nmod' });
    await delay(1000);
    await vscode.commands.executeCommand('acceptSelectedSuggestion');
    assert.equal(
      document.getText(),
      'defaults: \n  model: ',
      `Expected ${label} to accept model inside defaults`,
    );
    await vscode.commands.executeCommand('type', {
      text: '{ value: number; label: string }\nexp',
    });
    await delay(1000);
    await vscode.commands.executeCommand('acceptSelectedSuggestion');
    assert.equal(
      document.getText(),
      'defaults: \n  model: { value: number; label: string }\nexpression: ',
      `Expected ${label} to accept expression after defaults model`,
    );
    await vscode.commands.executeCommand('type', {
      text: 'valueRsx\nret',
    });
    await delay(1000);
    await vscode.commands.executeCommand('acceptSelectedSuggestion');
    assert.equal(
      document.getText(),
      [
        'defaults: ',
        '  model: { value: number; label: string }',
        'expression: valueRsx',
        '  return: ',
      ].join('\n'),
      `Expected ${label} to accept return after expression header`,
    );
    await vscode.commands.executeCommand('type', {
      text: 'number\nmissingField',
    });
    await assertDocumentDiagnostic(
      vscode,
      document,
      'missingField',
      `${label} invalid body field`,
    );

    await assertDocumentDiagnosticForText(vscode, document, {
      label,
      scenario: 'unknown header',
      text: 'modelx:\n',
      message: 'Unknown RS-X header key "modelx".',
    });
    await assertDocumentDiagnosticForText(vscode, document, {
      label,
      scenario: 'unknown defaults-block header',
      text: ['defaults:', '  modelx: { value: number }', ''].join('\n'),
      message: 'Unknown RS-X header key "modelx".',
    });
    await assertDocumentDiagnosticForText(vscode, document, {
      label,
      scenario: 'unknown expression-block header',
      text: [
        'defaults:',
        '  model: { value: number }',
        'expression: valueRsx',
        '  modelx: { value: number }',
        'value',
        '',
      ].join('\n'),
      message: 'Unknown RS-X header key "modelx".',
    });
    await assertDocumentDiagnosticForText(vscode, document, {
      label,
      scenario: 'defaults with a value',
      text: ['defaults: model', '  model: { value: number }', ''].join('\n'),
      message: 'Header "defaults" must not have a value.',
    });
    await assertDocumentDiagnosticForText(vscode, document, {
      label,
      scenario: 'duplicate defaults',
      text: ['defaults:', '  model: { value: number }', 'defaults:', ''].join(
        '\n',
      ),
      message: 'Duplicate "defaults" header.',
    });
    await assertDocumentDiagnosticForText(vscode, document, {
      label,
      scenario: 'defaults after expression',
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
    await assertDocumentDiagnosticForText(vscode, document, {
      label,
      scenario: 'expression without name',
      text: ['defaults:', '  model: { value: number }', 'expression:', ''].join(
        '\n',
      ),
      message: 'Header "expression" requires an expression name.',
    });
    await assertDocumentDiagnosticForText(vscode, document, {
      label,
      scenario: 'invalid expression name',
      text: [
        'defaults:',
        '  model: { value: number }',
        'expression: 123bad',
        'value',
        '',
      ].join('\n'),
      message: 'Invalid expression name "123bad".',
    });
    await assertDocumentDiagnosticForText(vscode, document, {
      label,
      scenario: 'duplicate expression name',
      text: [
        'defaults:',
        '  model: { value: number }',
        'expression: valueRsx',
        'value',
        '',
        'expression: valueRsx',
        'value + 1',
        '',
      ].join('\n'),
      message:
        'Duplicate expression name "valueRsx". Expression names must be unique in this file.',
    });
    await assertDocumentDiagnosticForText(vscode, document, {
      label,
      scenario: 'top-level model in module file',
      text: [
        'model: { value: number }',
        'expression: valueRsx',
        'value',
        '',
      ].join('\n'),
      message:
        'Header "model" must be indented under defaults: or an expression block in module-style .rsx files.',
    });
    await assertDocumentDiagnosticForText(vscode, document, {
      label,
      scenario: 'top-level return in module file',
      text: [
        'return: number',
        'expression: valueRsx',
        '  model: { value: number }',
        'value',
        '',
      ].join('\n'),
      message:
        'Header "return" must be indented under defaults: or an expression block in module-style .rsx files.',
    });
    await assertDocumentDiagnosticForText(vscode, document, {
      label,
      scenario: 'missing expression model',
      text: ['expression: valueRsx', 'value', ''].join('\n'),
      message:
        'Expression "valueRsx" must declare a model header because defaults: does not define one.',
    });
    await assertDocumentDiagnosticForText(vscode, document, {
      label,
      scenario: 'model after option',
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
    await assertDocumentDiagnosticForText(vscode, document, {
      label,
      scenario: 'option after return',
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
    await assertDocumentDiagnosticForText(vscode, document, {
      label,
      scenario: 'duplicate option',
      text: [
        'defaults:',
        '  model: { value: number }',
        'expression: valueRsx',
        '  lazy: true',
        '  lazy: false',
        'value',
        '',
      ].join('\n'),
      message: 'Duplicate "lazy" header in expression "valueRsx".',
    });
    await assertDocumentDiagnosticForText(vscode, document, {
      label,
      scenario: 'invalid boolean option',
      text: [
        'defaults:',
        '  model: { value: number }',
        'expression: valueRsx',
        '  lazy: maybe',
        'value',
        '',
      ].join('\n'),
      message: 'Header "lazy" must be "true" or "false".',
    });
    for (const key of ['preparse', 'compiled', 'compile']) {
      await assertDocumentDiagnosticForText(vscode, document, {
        label,
        scenario: `invalid boolean option ${key}`,
        text: [
          'defaults:',
          '  model: { value: number }',
          'expression: valueRsx',
          `  ${key}: maybe`,
          'value',
          '',
        ].join('\n'),
        message: `Header "${key}" must be "true" or "false".`,
      });
    }
    await assertDocumentHasAnyDiagnosticForText(vscode, document, {
      label,
      scenario: 'malformed model type',
      text: [
        'defaults:',
        '  model: { value; number',
        'expression: valueRsx',
        'value',
        '',
      ].join('\n'),
    });
    await assertDocumentHasAnyDiagnosticForText(vscode, document, {
      label,
      scenario: 'malformed return type',
      text: [
        'defaults:',
        '  model: { value: number }',
        'expression: valueRsx',
        '  return: Array<',
        'value',
        '',
      ].join('\n'),
    });

    await replaceDocumentText(
      vscode,
      document,
      [
        'defaults:',
        '  model: { value: number; label: string }',
        'expression: valueRsx',
        '  return: number',
        'value + 1',
        '',
      ].join('\n'),
    );
    await waitForNoDiagnostics(vscode, document, label);
  } finally {
    await replaceDocumentText(vscode, document, originalText);
    if (document.uri.scheme === 'file') {
      await document.save();
    }
  }
}

async function assertOptionHeaderReturnMismatchFlow(vscode, document, label) {
  await vscode.window.showTextDocument(document);
  await replaceDocumentText(
    vscode,
    document,
    [
      'defaults:',
      '  model: { x: 10, y: 20 }',
      '',
      'expression: xPlusY',
      '    compile: false',
      '    preparse: true',
      '    lazy: true',
      '    lazyGroup: "math"',
      '    return: string',
      '    x + y',
      '',
    ].join('\n'),
  );

  const text = document.getText();
  const xPosition = document.positionAt(text.indexOf('x + y') + 1);
  const completions = await withTimeout(
    vscode.commands.executeCommand(
      'vscode.executeCompletionItemProvider',
      document.uri,
      xPosition,
    ),
    1000,
    `${label} body completion`,
  );
  const completionLabels = new Set(
    completions?.items?.map((item) => String(item.label)) ?? [],
  );
  assert.ok(
    completionLabels.has('x') && completionLabels.has('y'),
    `Expected ${label} completions to include x and y; got ${[
      ...completionLabels,
    ]
      .slice(0, 30)
      .join(', ')}`,
  );

  const hoverPosition = document.positionAt(text.indexOf('lazyGroup') + 3);
  const hoverStart = performance.now();
  const hovers = await withTimeout(
    vscode.commands.executeCommand(
      'vscode.executeHoverProvider',
      document.uri,
      hoverPosition,
    ),
    1000,
    `${label} lazyGroup hover`,
  );
  assert.ok(
    performance.now() - hoverStart <= 1000,
    `Expected ${label} lazyGroup hover <= 1000ms`,
  );
  assert.ok(
    hovers?.some((hover) =>
      hover.contents?.some?.((content) =>
        String(content.value ?? content).includes('group lazy expression'),
      ),
    ),
    `Expected ${label} lazyGroup hover to explain lazy groups`,
  );

  await assertDocumentDiagnostic(
    vscode,
    document,
    "Expression result is not assignable to declared return type 'string'.",
    label,
  );

  await replaceDocumentText(
    vscode,
    document,
    document.getText().replace('return: string', 'return: number'),
  );
  await waitForNoDiagnostics(vscode, document, `${label} fixed return type`);

  await replaceDocumentText(
    vscode,
    document,
    [
      'defaults:',
      '  model: { label: string; count: number }',
      '',
      'expression: labelAsNumber',
      '    return: number',
      '    label',
      '',
      'expression: countAsDate',
      '    return: Date',
      '    count',
      '',
    ].join('\n'),
  );
  await assertDocumentDiagnostic(
    vscode,
    document,
    "Expression result is not assignable to declared return type 'number'.",
    `${label} string-derived expression mismatch`,
  );
  await assertDocumentDiagnostic(
    vscode,
    document,
    "Expression result is not assignable to declared return type 'Date'.",
    `${label} non-primitive declared return mismatch`,
  );

  await replaceDocumentText(
    vscode,
    document,
    [
      'defaults:',
      '  model: { label: string; count: number }',
      '',
      'expression: labelAsNumber',
      '    return: string',
      '    label',
      '',
      'expression: countAsDate',
      '    return: number',
      '    count',
      '',
    ].join('\n'),
  );
  await waitForNoDiagnostics(
    vscode,
    document,
    `${label} generic return mismatches fixed`,
  );
}

async function assertMultilineModelExpressionReferenceFlow(
  vscode,
  document,
  label,
) {
  await vscode.window.showTextDocument(document);
  await replaceDocumentText(
    vscode,
    document,
    [
      'defaults:',
      '  model: { x: 10, y: 20 }',
      '',
      'expression: xPlusY',
      '    compile: false',
      '    preparse: true',
      '    lazy: true',
      '    lazyGroup: "math"',
      '    return: number',
      '    x + y',
      '',
      'expression: xTimesY',
      '    compile: false',
      '    preparse: true',
      '    lazy: true',
      '    lazyGroup: "math"',
      '    return: number',
      '    x * y',
      '',
      'expression: xSquared',
      '    compile: false',
      '    preparse: true',
      '    lazy: true',
      '    lazyGroup: "math"',
      '    return: number',
      '    x * x',
      '',
      'expression: composed',
      '    model: {',
      '        xPlusY: typeof xPlusY,',
      '        xTimesY: typeof xTimesY,',
      '        xSquared: typeof xSquared',
      '    }',
      '    xPlusY + xTimesY + xSquared',
      '',
    ].join('\n'),
  );

  const text = document.getText();
  const bodyPosition = document.positionAt(
    text.lastIndexOf('xPlusY + xTimesY + xSquared') + 2,
  );
  const completions = await withTimeout(
    vscode.commands.executeCommand(
      'vscode.executeCompletionItemProvider',
      document.uri,
      bodyPosition,
    ),
    1000,
    `${label} body completion`,
  );
  const completionLabels = new Set(
    completions?.items?.map((item) => String(item.label)) ?? [],
  );
  for (const expectedLabel of ['xPlusY', 'xTimesY', 'xSquared']) {
    assert.ok(
      completionLabels.has(expectedLabel),
      `Expected ${label} body completions to include ${expectedLabel}`,
    );
  }

  const headerReferencePosition = document.positionAt(
    text.indexOf('typeof xPlusY') + 'typeof x'.length,
  );
  const hovers = await withTimeout(
    vscode.commands.executeCommand(
      'vscode.executeHoverProvider',
      document.uri,
      headerReferencePosition,
    ),
    1000,
    `${label} same-file header reference hover`,
  );
  const hoverText =
    hovers
      ?.flatMap((hover) => hover.contents ?? [])
      .map((content) => String(content.value ?? content))
      .join('\n') ?? '';
  assert.ok(
    !hoverText.includes("Cannot find name 'xPlusY'"),
    `Expected ${label} same-file header reference hover not to report missing xPlusY`,
  );

  await waitForNoDiagnostics(vscode, document, label);
}

async function assertHeaderCompletionLabels(
  vscode,
  document,
  text,
  expectedLabels,
  label,
) {
  await vscode.window.showTextDocument(document);
  await replaceDocumentText(vscode, document, text);
  const completions = await withTimeout(
    vscode.commands.executeCommand(
      'vscode.executeCompletionItemProvider',
      document.uri,
      document.positionAt(document.getText().length),
    ),
    1000,
    `${label} header completion labels for ${JSON.stringify(text)}`,
  );
  const labels = completions?.items?.map((item) => String(item.label)) ?? [];
  for (const expectedLabel of expectedLabels) {
    assert.ok(
      labels.includes(expectedLabel),
      `Expected ${label} completions for ${JSON.stringify(
        text,
      )} to include ${expectedLabel}; got ${labels.slice(0, 20).join(', ')}`,
    );
  }
}

async function assertDocumentDiagnosticForText(vscode, document, args) {
  await replaceDocumentText(vscode, document, args.text);
  await assertDocumentDiagnostic(
    vscode,
    document,
    args.message,
    `${args.label} ${args.scenario}`,
  );
}

async function assertDocumentDiagnostic(vscode, document, message, label) {
  const diagnostics = await waitForDiagnostics(
    vscode,
    document.uri,
    (diagnostic) => String(diagnostic.message).includes(message),
  );
  assert.ok(
    diagnostics.some((diagnostic) =>
      String(diagnostic.message).includes(message),
    ),
    `Expected ${label} diagnostic containing ${message}; got ${diagnostics
      .map((diagnostic) => String(diagnostic.message))
      .join(' | ')}`,
  );
}

async function assertRsxHeaderExpressionImportFlow(
  vscode,
  targetPath,
  consumerPath,
) {
  fs.writeFileSync(
    targetPath,
    [
      'defaults:',
      '  model: { x: 10, y: 20 }',
      '',
      'expression: composed',
      '  x + y',
      '',
    ].join('\n'),
    'utf8',
  );
  fs.writeFileSync(
    consumerPath,
    [
      'expression: TEST',
      '  model: {',
      "    c: typeof import('./test').composed,",
      '    d: 10',
      '  }',
      '  c + d',
      '',
    ].join('\n'),
    'utf8',
  );

  const document = await vscode.workspace.openTextDocument(consumerPath);
  await vscode.window.showTextDocument(document);
  await waitForNoDiagnostics(
    vscode,
    document,
    'extensionless .rsx expression import header',
  );

  const typeDefinitions = await vscode.commands.executeCommand(
    'vscode.executeTypeDefinitionProvider',
    document.uri,
    positionInside(document, 'composed'),
  );
  assert.ok(
    Array.isArray(typeDefinitions) &&
      typeDefinitions.some((location) => location.uri.fsPath === targetPath),
    'Expected header type-definition for typeof import("./test").composed to resolve to test.rsx',
  );

  const hovers = await withTimeout(
    vscode.commands.executeCommand(
      'vscode.executeHoverProvider',
      document.uri,
      positionInside(document, 'c + d'),
    ),
    2000,
    'extensionless .rsx expression import hover',
  );
  const hoverText =
    hovers
      ?.flatMap((hover) => hover.contents ?? [])
      .map((content) => String(content.value ?? content))
      .join('\n') ?? '';
  assert.ok(
    hoverText.includes('model.c: number'),
    `Expected hover for imported .rsx expression model field to include model.c: number; got ${hoverText}`,
  );
  assert.ok(
    !hoverText.includes('model.c: any'),
    `Expected hover for imported .rsx expression model field not to fall back to any; got ${hoverText}`,
  );
}

async function assertDocumentHasAnyDiagnosticForText(vscode, document, args) {
  await replaceDocumentText(vscode, document, args.text);
  const diagnostics = await waitForDiagnostics(
    vscode,
    document.uri,
    () => true,
  );
  assert.ok(
    diagnostics.length > 0,
    `Expected ${args.label} ${args.scenario} to produce at least one diagnostic`,
  );
}

async function waitForNoDiagnostics(vscode, document, label) {
  const deadline = performance.now() + 3000;
  while (performance.now() < deadline) {
    const diagnostics = vscode.languages.getDiagnostics(document.uri);
    if (diagnostics.length === 0) {
      return;
    }
    await delay(100);
  }
  assert.deepEqual(
    vscode.languages
      .getDiagnostics(document.uri)
      .map((diagnostic) => String(diagnostic.message)),
    [],
    `Expected ${label} diagnostics to clear`,
  );
}

async function assertSameLineTextAfterDefaultsDoesNotLoad(
  vscode,
  document,
  label,
) {
  await vscode.window.showTextDocument(document);
  await replaceDocumentText(vscode, document, '');
  await vscode.commands.executeCommand('type', { text: 'def' });
  await delay(1000);
  await vscode.commands.executeCommand('acceptSelectedSuggestion');
  assert.equal(
    document.getText(),
    'defaults: ',
    `Expected ${label} to accept defaults before same-line typo check`,
  );

  await vscode.commands.executeCommand('type', { text: 'mod' });
  assert.equal(
    document.getText(),
    'defaults: mod',
    `Expected ${label} same-line typing after defaults to remain in the document`,
  );

  const position = document.positionAt(document.getText().length);
  const completionStart = performance.now();
  const completions = await withTimeout(
    vscode.commands.executeCommand(
      'vscode.executeCompletionItemProvider',
      document.uri,
      position,
    ),
    1000,
    `${label} same-line defaults value completion`,
  );
  assert.ok(
    performance.now() - completionStart <= 1000,
    `Expected ${label} same-line defaults value completion to return without loading`,
  );
  assert.equal(
    completions?.items?.some((item) => String(item.label) === 'model') ?? false,
    false,
    `Expected ${label} same-line defaults value to avoid stale model completion`,
  );

  const hovers = await withTimeout(
    vscode.commands.executeCommand(
      'vscode.executeHoverProvider',
      document.uri,
      position,
    ),
    1000,
    `${label} same-line defaults value hover`,
  );
  assert.equal(
    hovers?.length ?? 0,
    0,
    `Expected ${label} same-line defaults value hover to return no loading result`,
  );

  const diagnostics = await waitForDiagnostics(
    vscode,
    document.uri,
    (diagnostic) =>
      String(diagnostic.message).includes(
        'Header "defaults" must not have a value.',
      ),
  );
  assert.ok(
    diagnostics.some((diagnostic) =>
      String(diagnostic.message).includes(
        'Header "defaults" must not have a value.',
      ),
    ),
    `Expected ${label} same-line defaults value to report a header diagnostic`,
  );
}

async function assertFullNewExpressionAuthoringCycle(vscode, document, label) {
  await vscode.window.showTextDocument(document);
  await replaceDocumentText(vscode, document, '');

  await vscode.commands.executeCommand('type', { text: 'def' });
  await delay(1000);
  await vscode.commands.executeCommand('acceptSelectedSuggestion');
  assert.equal(
    document.getText(),
    'defaults: ',
    `Expected ${label} to accept defaults in full authoring cycle`,
  );

  await vscode.commands.executeCommand('type', { text: '\nmod' });
  await delay(1000);
  await vscode.commands.executeCommand('acceptSelectedSuggestion');
  assert.equal(
    document.getText(),
    'defaults: \n  model: ',
    `Expected ${label} to accept model after defaults in full authoring cycle`,
  );

  await vscode.commands.executeCommand('type', {
    text: '{ value: number }\nexp',
  });
  await delay(1000);
  await vscode.commands.executeCommand('acceptSelectedSuggestion');
  assert.equal(
    document.getText(),
    'defaults: \n  model: { value: number }\nexpression: ',
    `Expected ${label} to accept expression after defaults model in full authoring cycle`,
  );

  await vscode.commands.executeCommand('type', {
    text: 'valueRsx\nvalue.toUpperCase()',
  });
  const invalidDiagnostics = await waitForDiagnostics(
    vscode,
    document.uri,
    (diagnostic) => String(diagnostic.message).includes('toUpperCase'),
  );
  assert.ok(
    invalidDiagnostics.some((diagnostic) =>
      String(diagnostic.message).includes('toUpperCase'),
    ),
    `Expected ${label} invalid expression body diagnostic in full authoring cycle`,
  );

  await replaceDocumentText(
    vscode,
    document,
    [
      'defaults:',
      '  model: { value: number }',
      'expression: valueRsx',
      'value + 1',
    ].join('\n'),
  );
  const deadline = performance.now() + 3000;
  while (performance.now() < deadline) {
    const diagnostics = vscode.languages.getDiagnostics(document.uri);
    if (diagnostics.length === 0) {
      return;
    }
    await delay(100);
  }
  assert.deepEqual(
    vscode.languages
      .getDiagnostics(document.uri)
      .map((diagnostic) => String(diagnostic.message)),
    [],
    `Expected ${label} diagnostics to clear after fixing expression body`,
  );
}

async function assertTypingHeaderAutoAccepts(
  vscode,
  document,
  initialText,
  typedText,
  expectedText,
  label,
) {
  await vscode.window.showTextDocument(document);
  await replaceDocumentText(vscode, document, initialText);
  await vscode.commands.executeCommand('type', { text: typedText });
  assert.equal(
    document.getText(),
    `${initialText}${typedText}`,
    `Expected simulated typing ${typedText} into ${label} to update the active document`,
  );
  await delay(1000);
  await vscode.commands.executeCommand('acceptSelectedSuggestion');
  assert.equal(
    document.getText(),
    expectedText,
    `Expected automatic suggest widget acceptance after typing ${typedText} into ${label} to insert ${expectedText}`,
  );
}

async function replaceDocumentText(vscode, document, text) {
  const editor = await vscode.window.showTextDocument(document);
  const end = document.positionAt(document.getText().length);
  const didEdit = await editor.edit((edit) => {
    edit.replace(new vscode.Range(new vscode.Position(0, 0), end), text);
  });
  assert.equal(didEdit, true, 'Expected test document edit to apply');
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
