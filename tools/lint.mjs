#!/usr/bin/env node
/**
 * Dependency-free checks: syntax of every source file, and a ban on the
 * DOM and network APIs this project deliberately does not use.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  ...readdirSync(join(root, 'src')).map((name) => join('src', name)),
  ...readdirSync(join(root, 'tools')).map((name) => join('tools', name)),
  ...readdirSync(join(root, 'tests')).map((name) => join('tests', name)),
].filter((name) => /\.m?js$/.test(name));

const BANNED = [
  [/\binnerHTML\b|\bouterHTML\b|insertAdjacentHTML|document\.write/, 'writes markup; build nodes and use textContent'],
  [/\beval\s*\(|new Function\b/, 'evaluates strings as code'],
  [/\bfetch\s*\(|XMLHttpRequest|WebSocket\s*\(|sendBeacon/, 'opens its own network connection; use hass.callWS / hass.callService'],
  [/localStorage|sessionStorage|document\.cookie|indexedDB/, 'stores data in the browser'],
  [/https?:\/\/(?!www\.w3\.org\/2000\/svg)/, 'references an external URL'],
];

let failed = false;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', join(root, file)], { encoding: 'utf8' });
  if (result.status !== 0) {
    failed = true;
    console.error(`syntax: ${file}\n${result.stderr}`);
  }
  if (!file.startsWith('src')) continue;
  readFileSync(join(root, file), 'utf8')
    .split('\n')
    .forEach((line, index) => {
      for (const [pattern, why] of BANNED) {
        if (pattern.test(line)) {
          failed = true;
          console.error(`${file}:${index + 1}: ${why}\n    ${line.trim()}`);
        }
      }
    });
}

if (failed) process.exit(1);
console.log(`lint ok: ${files.length} files`);
