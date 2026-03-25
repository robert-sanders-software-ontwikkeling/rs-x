const path = require('node:path');
const ts = require('typescript');

module.exports = function rsxWebpackLoader(source) {
  const callback = this.async();
  try {
    if (
      !this.resourcePath.endsWith('.ts') &&
      !this.resourcePath.endsWith('.tsx')
    ) {
      callback(null, source);
      return;
    }

    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
      fileName: this.resourcePath,
    });

    callback(null, transpiled.outputText);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    callback(new Error(`RS-X build validation failed.\n${message}`));
  }
};
