const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

async function serve(dir, file, port = 8788) {
  const root = path.resolve(dir);
  const server = http.createServer((req, res) => {
    let p = path.join(root, decodeURIComponent(req.url.split('?')[0].replace(/^\//, '')));
    if (!req.url || req.url === '/' || (fs.existsSync(p) && fs.statSync(p).isDirectory())) p = path.join(root, file);
    fs.readFile(p, (err, data) => {
      if (err) { res.statusCode = 404; res.end('404'); return; }
      const ext = path.extname(p).toLowerCase();
      const type = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg' }[ext] || 'text/plain';
      res.setHeader('Content-Type', type);
      res.end(data);
    });
  });
  await new Promise(r => server.listen(port, r));
  return { server, url: `http://127.0.0.1:${port}/${encodeURIComponent(file)}` };
}

(async () => {
  const dir = process.argv[2] || 'dist';
  const file = process.argv[3] || 'index.html';
  const out = process.argv[4] || 'runtime-report.json';
  const { server, url } = await serve(dir, file);

  const report = { url, console: [], pageerrors: [], failed: [], ok: true };
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  } catch {
    browser = await chromium.launch({ headless: true });
  }
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (['error', 'warning'].includes(type)) report.console.push({ type, text });
  });
  page.on('pageerror', err => report.pageerrors.push(String(err)));
  page.on('requestfailed', req => report.failed.push({ url: req.url(), errorText: req.failure()?.errorText }));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await browser.close();
  server.close();
  report.ok = (report.console.length === 0 && report.pageerrors.length === 0);
  fs.writeFileSync(path.join(process.cwd(), out), JSON.stringify(report, null, 2));
  console.log('Wrote', out);
  if (!report.ok) process.exit(1);
})();

