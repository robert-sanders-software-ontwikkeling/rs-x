import ts from 'typescript';

/**
 * The effective TypeFlags used for type flag comparisons in the compiler.
 * Defaults to the TypeFlags from the bundled TypeScript dependency.
 * Override via setEffectiveTypeScript() when the host project uses a different
 * TypeScript version (e.g. TypeScript 6.x vs the compiler's bundled TypeScript).
 */
export let effectiveTypeFlags: typeof ts.TypeFlags = ts.TypeFlags;

/**
 * Override the TypeScript TypeFlags used by the compiler's validation logic.
 * Call this with the host project's TypeScript module when it may differ from the
 * TypeScript version bundled with @rs-x/compiler.
 */
export function setEffectiveTypeScript(typescript: typeof ts): void {
  effectiveTypeFlags = typescript.TypeFlags as typeof ts.TypeFlags;
}
