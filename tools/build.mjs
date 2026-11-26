#!/usr/bin/env node
/**
 * Builds dist/liquid-glass-cards.js from src/ without any third-party tool.
 *
 * The sources are plain ES modules that only import from each other. The build
 * resolves the import graph from src/index.js, emits every module once in
 * dependency order, and removes the import/export syntax. The result is one
 * file with a single module scope, which is what a dashboard resource needs.
 *
 * Usage: node tools/build.mjs [--check]
 *   --check  fail if dist/ is missing or differs from a fresh build
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'src');
const outFile = join(root, 'dist', 'liquid-glass-cards.js');

const IMPORT = /^import\s+(?:\{[^}]*\}\s+from\s+)?'(\.\/[\w.-]+\.js)';\s*$/;
const ANY_IMPORT = /^\s*import\s/;
const EXPORT = /^export\s+(const|function|class|async function)\s/;

const emitted = [];
const seen = new Set();

function visit(file, chain) {
  if (chain.includes(file)) throw new Error(`Import cycle: ${[...chain, file].join(' -> ')}`);
  if (seen.has(file)) return;
  const lines = readFileSync(join(srcDir, file), 'utf8').replace(/\r\n/g, '\n').split('\n');
  const body = [];
  for (const line of lines) {
    const match = IMPORT.exec(line);
    if (match) {
      visit(match[1].slice(2), [...chain, file]);
    } else if (ANY_IMPORT.test(line)) {
      throw new Error(`${file}: only relative named imports are supported: ${line.trim()}`);
    } else if (/^export\s/.test(line) && !EXPORT.test(line)) {
      throw new Error(`${file}: unsupported export form: ${line.trim()}`);
    } else {
      body.push(line.replace(EXPORT, '$1 '));
    }
  }
  seen.add(file);
  emitted.push({ file, code: body.join('\n').trim() });
}

visit('index.js', []);

const version = /const VERSION = '([^']+)'/.exec(readFileSync(join(srcDir, 'core.js'), 'utf8'));
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (!version || version[1] !== manifest.version) {
  throw new Error(`Version mismatch: src/core.js has ${version && version[1]}, package.json has ${manifest.version}`);
}

const output = `${emitted.map(({ file, code }) => `// ---- src/${file} ----\n${code}`).join('\n\n')}\n`;

if (process.argv.includes('--check')) {
  if (!existsSync(outFile) || readFileSync(outFile, 'utf8') !== output) {
    console.error('dist/liquid-glass-cards.js is missing or out of date. Run: node tools/build.mjs');
    process.exit(1);
  }
  console.log('dist is up to date');
} else {
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, output);
  // All modules share one scope in the output; a name declared twice only fails here.
  const check = spawnSync(process.execPath, ['--check', outFile], { encoding: 'utf8' });
  if (check.status !== 0) {
    console.error(check.stderr);
    process.exit(1);
  }
  console.log(`built dist/liquid-glass-cards.js ${manifest.version}: ${emitted.map((entry) => entry.file).join(', ')} (${output.length} bytes)`);
}
