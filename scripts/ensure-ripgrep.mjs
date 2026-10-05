#!/usr/bin/env node
/**
 * @vscode/ripgrep postinstall exits early when bin/ exists but rg is missing (empty dir in tarball).
 * Run after npm install in CI and locally when agent-audit grep tests fail with rg_spawn_failed.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { getRipgrepInstallTarget } from './ensure-ripgrep-lib.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkgRoot = path.join(REPO_ROOT, 'node_modules', '@vscode', 'ripgrep');
const rgExe = path.join(pkgRoot, 'bin', process.platform === 'win32' ? 'rg.exe' : 'rg');

if (fs.existsSync(rgExe)) {
  process.exit(0);
}

const postinstall = path.join(pkgRoot, 'lib', 'postinstall.js');
if (!fs.existsSync(postinstall)) {
  const pkgJson = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
  const installTarget = getRipgrepInstallTarget(pkgJson.devDependencies);
  console.log(
    `ensure-ripgrep: @vscode/ripgrep missing (dev deps omitted?); installing ${installTarget}`
  );
  const install = spawnSync(
    'npm',
    ['install', installTarget, '--legacy-peer-deps', '--include=dev', '--no-audit', '--no-fund'],
    { cwd: REPO_ROOT, stdio: 'inherit', shell: process.platform === 'win32' }
  );
  if (install.status !== 0 || !fs.existsSync(postinstall)) {
    console.error(
      'ensure-ripgrep: @vscode/ripgrep is not installed (try npm install --include=dev)'
    );
    process.exit(install.status ?? 1);
  }
}

console.log('ensure-ripgrep: downloading ripgrep binary (--force)');
const result = spawnSync(process.execPath, [postinstall, '--force'], {
  cwd: pkgRoot,
  stdio: 'inherit'
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

if (!fs.existsSync(rgExe)) {
  console.error(`ensure-ripgrep: expected binary missing after postinstall: ${rgExe}`);
  process.exit(1);
}
