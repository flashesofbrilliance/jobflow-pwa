#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const dist = new URL('../dist/', import.meta.url);
const indexFile = new URL('./index.html', dist);
const fallbackFile = new URL('./404.html', dist);

try {
  const html = await fs.readFile(indexFile, 'utf8');
  await fs.writeFile(fallbackFile, html, 'utf8');
  console.log('Created SPA fallback 404.html');
} catch (e) {
  console.error('postbuild: failed to create 404.html', e?.message||e);
  process.exit(1);
}

