#!/usr/bin/env node
// Simple static preview server for Vite-built PWA output in ./dist
// - Serves files with sensible MIME types
// - Proper cache headers: no-cache for HTML/SW/manifest, long-cache for hashed assets
// - SPA fallback to index.html for unknown routes

const http = require('http');
const fs = require('fs');
const path = require('path');

const CWD = process.cwd();
const args = process.argv.slice(2);

function getArg(name, fallback) {
  const i = args.findIndex(a => a === name || a.startsWith(name + '='));
  if (i === -1) return fallback;
  const val = args[i].includes('=') ? args[i].split('=').slice(1).join('=') : args[i + 1];
  return val || fallback;
}

const root = path.resolve(CWD, getArg('--dir', getArg('-d', 'dist')));
const host = getArg('--host', '127.0.0.1');
const port = Number(process.env.PORT || getArg('--port', getArg('-p', 4173)));

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2'
};

function isHashedAsset(filePath) {
  const base = path.basename(filePath);
  // e.g. index-ChfTvwlT.js or style.3a7f0d2.css
  return /[-.][A-Za-z0-9]{8,}\./.test(base);
}

function shouldNoCache(filePath, ext) {
  const base = path.basename(filePath).toLowerCase();
  if (ext === '.html') return true;
  if (base === 'sw.js' || base === 'service-worker.js' || base.includes('service-worker')) return true;
  if (ext === '.webmanifest') return true;
  return false;
}

function setCachingHeaders(res, filePath, ext) {
  if (shouldNoCache(filePath, ext)) {
    res.setHeader('Cache-Control', 'no-cache');
    return;
  }
  if (isHashedAsset(filePath)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  }
}

function serveFile(req, res, absPath, statusCode = 200) {
  const ext = path.extname(absPath).toLowerCase();
  const type = mime[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', type);
  setCachingHeaders(res, absPath, ext);

  if (req.method === 'HEAD') {
    res.statusCode = statusCode;
    res.end();
    return;
  }

  const stream = fs.createReadStream(absPath);
  stream.on('open', () => {
    res.statusCode = statusCode;
    stream.pipe(res);
  });
  stream.on('error', (err) => {
    if (err.code === 'ENOENT') {
      send404(req, res);
    } else {
      send500(res, err);
    }
  });
}

function send404(req, res) {
  res.statusCode = 404;
  res.setHeader('Content-Type','text/plain; charset=utf-8');
  res.end('404 Not Found');
}

function send500(res, err) {
  res.statusCode = 500;
  res.setHeader('Content-Type','text/plain; charset=utf-8');
  res.end('500 Internal Server Error\n' + (err && err.stack || String(err)));
}

function isPathInside(parent, child) {
  const rel = path.relative(parent, child);
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

const server = http.createServer((req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost');
    let pathname = decodeURIComponent(u.pathname || '/');
    // Ensure path is relative so path.join doesn't escape root on leading '/'
    if (pathname.startsWith('/')) pathname = pathname.slice(1);

    // Prevent path traversal
    const unsafeFull = path.join(root, pathname);
    const safeFull = path.resolve(unsafeFull);
    if (!isPathInside(root, safeFull) && path.resolve(root) !== safeFull) {
      res.statusCode = 403;
      res.end('403 Forbidden');
      return;
    }

    let filePath = safeFull;
    // If root or directory, append index.html
    if ((pathname === '' || pathname === '/') || (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory())) {
      filePath = path.join(filePath, 'index.html');
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return serveFile(req, res, filePath, 200);
    }

    // SPA fallback if client expects HTML
    const accept = (req.headers['accept'] || '').toLowerCase();
    if (accept.includes('text/html')) {
      const indexPath = path.join(root, 'index.html');
      if (fs.existsSync(indexPath)) {
        return serveFile(req, res, indexPath, 200);
      }
    }

    return send404(req, res);
  } catch (err) {
    return send500(res, err);
  }
});

server.listen(port, host, () => {
  console.log(`Static preview serving ${root} on http://${host}:${port}`);
});
