// Local preview: node serve.js  -> http://localhost:8091
// The live site is these same static files on Vercel; this server only adds the dev screenshot route.
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = __dirname;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  // dev only: the page can post a rendered frame here, saved to _shots/<name>.png
  if (req.method === 'POST' && url === '/__shot') {
    const name = (new URL(req.url, 'http://x').searchParams.get('name') || 'shot').replace(/[^\w-]/g, '');
    const chunks = []; req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString(), b64 = body.slice(body.indexOf(',') + 1);
      fs.mkdirSync(path.join(ROOT, '_shots'), { recursive: true });
      fs.writeFileSync(path.join(ROOT, '_shots', name + '.png'), Buffer.from(b64, 'base64'));
      res.writeHead(200); res.end('ok');
    });
    return;
  }
  let p = path.join(ROOT, url);
  if (p.endsWith(path.sep)) p = path.join(p, 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(p).pipe(res);
}).listen(8091, () => console.log('http://localhost:8091'));
