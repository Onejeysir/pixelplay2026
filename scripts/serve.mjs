// Petit serveur local (aucune dépendance) : npm run serve  puis http://localhost:8080
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT) || 8080;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.svg': 'image/svg+xml' };
createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  let f = normalize(join(root, p));
  if (!f.startsWith(root) || f.includes('node_modules') || /[\\/]src[\\/]/.test(f)) { res.writeHead(403).end('403'); return; }
  if (!existsSync(f) && existsSync(`${f}.html`)) f = `${f}.html`; // adresses propres : /jeux -> jeux.html
  if (!existsSync(f) || !statSync(f).isFile()) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Page introuvable'); return; }
  res.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream' }).end(readFileSync(f));
}).listen(port, () => console.log(`PIXEL PLAY : http://localhost:${port}`));
