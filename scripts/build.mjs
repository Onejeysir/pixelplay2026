// Construit le site statique à la racine du projet : pages HTML, CSS Tailwind, JavaScript.
//   npm run build   : construction unique      npm run dev : reconstruction à chaque sauvegarde
import { build as esbuild, context } from 'esbuild';
import { execFile, execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, watch as fsWatch } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const watch = process.argv.includes('--watch');
const at = (...p) => join(root, ...p);
mkdirSync(at('assets/css'), { recursive: true }); mkdirSync(at('assets/js'), { recursive: true });

// Polices : copiées depuis node_modules si elles manquent (elles sont déjà fournies dans assets/fonts).
function fonts() {
  const map = { '@fontsource/barlow-condensed/files': ['barlow-condensed-latin-600-italic.woff2', 'barlow-condensed-latin-700-italic.woff2', 'barlow-condensed-latin-800-italic.woff2'], '@fontsource-variable/inter/files': ['inter-latin-wght-normal.woff2'] };
  mkdirSync(at('assets/fonts'), { recursive: true });
  for (const [dir, list] of Object.entries(map)) for (const f of list) if (!existsSync(at('assets/fonts', f)) && existsSync(at('node_modules', dir, f))) copyFileSync(at('node_modules', dir, f), at('assets/fonts', f));
}
const run = (script, args = [], sync = true) => (sync ? execFileSync : execFile)(process.execPath, [at(script), ...args], { cwd: root, stdio: sync ? 'inherit' : 'ignore' });
const pages = () => run('scripts/pages.mjs');
const css = (min) => execFileSync(at('node_modules/.bin/tailwindcss'), ['-c', at('tailwind.config.js'), '-i', at('src/css/tailwind.css'), '-o', at('assets/css/styles.css'), ...(min ? ['--minify'] : [])], { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] });

const entries = { 'assets/js/app.js': 'src/js/app.js', 'assets/js/admin.js': 'src/js/admin/main.js' };
const opts = (out, inp) => ({ entryPoints: [at(inp)], outfile: at(out), bundle: true, format: 'iife', target: 'es2019', minify: !watch, logLevel: 'warning' });

fonts(); pages(); css(!watch);
if (!watch) {
  for (const [o, i] of Object.entries(entries)) await esbuild(opts(o, i));
  console.log('Construction terminée : ouvrez index.html');
} else {
  for (const [o, i] of Object.entries(entries)) await (await context(opts(o, i))).watch(); // JavaScript : surveillé par esbuild
  // Pages, CSS et configuration : reconstruits à chaque sauvegarde (surveillance par dossier, fiable même si l'éditeur remplace le fichier).
  let t, busy = false;
  const again = () => { clearTimeout(t); t = setTimeout(() => { if (busy) return again(); busy = true; try { pages(); css(false); console.log('Pages et CSS reconstruits'); } catch (e) { console.error(e.message); } busy = false; }, 200); };
  const dirs = (d) => [d, ...readdirSync(at(d)).map((x) => join(d, x)).filter((x) => statSync(at(x)).isDirectory()).flatMap(dirs)];
  for (const d of dirs('src')) fsWatch(at(d), (_, f) => { if (/\.(html|css|js)$/.test(f || '')) again(); });
  fsWatch(root, (_, f) => { if (f === 'tailwind.config.js') again(); });
  console.log('Surveillance des fichiers (Ctrl+C pour arrêter) : le JavaScript, le CSS et les pages se recompilent à la sauvegarde.');
}
