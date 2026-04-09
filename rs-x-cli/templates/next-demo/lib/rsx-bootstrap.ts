let initialized = false;

type RsxCompiledModule = {
  registerRsxAotCompiledExpressions?: () => void;
};

type RsxPreparsedModule = {
  registerRsxAotParsedExpressionCache?: () => void;
};

async function loadCompiledModule(): Promise<RsxCompiledModule> {
  try {
    return (await import(
      '../app/rsx-generated/' + 'rsx-aot-compiled.generated'
    )) as RsxCompiledModule;
  } catch {
    return {};
  }
}

async function loadPreparsedModule(): Promise<RsxPreparsedModule> {
  try {
    return (await import(
      '../app/rsx-generated/' + 'rsx-aot-preparsed.generated'
    )) as RsxPreparsedModule;
  } catch {
    return {};
  }
}

export async function initRsx(): Promise<void> {
  if (initialized) {
    return;
  }

  const preparsedModule = await loadPreparsedModule();
  const compiledModule = await loadCompiledModule();

  preparsedModule.registerRsxAotParsedExpressionCache?.();
  compiledModule.registerRsxAotCompiledExpressions?.();
  initialized = true;
}
