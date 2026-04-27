const { spawn } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');

const extensionRoot = path.resolve(__dirname, '..');
const tempRoot = process.env.RUNNER_TEMP || os.tmpdir();
const ciMode = process.argv.includes('--ci') || process.env.CI === 'true';
const useXvfb = ciMode && process.platform === 'linux';

if (process.argv.includes('--help')) {
  console.log(
    'Usage: node ./scripts/run-host-smoke.cjs [--ci]\n\nRuns the RS-X VS Code extension host smoke test. In CI on Linux, wraps VS Code with xvfb-run.',
  );
  process.exit(0);
}

const vscodeArgs = [
  '--disable-extensions',
  '--disable-gpu',
  '--disable-workspace-trust',
  `--user-data-dir=${path.join(tempRoot, 'rsx-vscode-user-data')}`,
  `--extensions-dir=${path.join(tempRoot, 'rsx-vscode-extensions')}`,
  '--extensionDevelopmentPath=.',
  '--extensionTestsPath=./test-host/smoke.cjs',
  '.',
];

const command = useXvfb ? 'xvfb-run' : 'code';
const args = useXvfb ? ['-a', 'code', ...vscodeArgs] : vscodeArgs;

console.log(`[rs-x-vscode-extension] Running ${command} ${args.join(' ')}`);

const child = spawn(command, args, {
  cwd: extensionRoot,
  env: process.env,
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

child.on('error', (error) => {
  const missingTool =
    error.code === 'ENOENT'
      ? `Could not find '${command}' on PATH. Install VS Code and, on Linux CI, xvfb.`
      : error.message;

  console.error(`[rs-x-vscode-extension] ${missingTool}`);
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(
      `[rs-x-vscode-extension] VS Code host smoke exited via signal ${signal}`,
    );
    process.exitCode = 1;
    return;
  }

  process.exitCode = code ?? 1;
});
