const GITHUB_REPO_BASE =
  'https://github.com/robert-sanders-software-ontwikkeling/rs-x/blob/main';

const PACKAGE_SOURCE_ROOTS = {
  '@rs-x/core': 'rs-x-core/lib',
  '@rs-x/expression-parser': 'rs-x-expression-parser/lib',
  '@rs-x/state-manager': 'rs-x-state-manager/lib',
} as const;

export function githubSourceHref(
  packageName: keyof typeof PACKAGE_SOURCE_ROOTS,
  sourcePath: string,
): string {
  return `${GITHUB_REPO_BASE}/${PACKAGE_SOURCE_ROOTS[packageName]}/${sourcePath}`;
}
