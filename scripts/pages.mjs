// Génère les pages HTML à la racine à partir de src/pages (exécuté par build.mjs, dans un processus neuf à chaque fois).
//   <!--@head-->, <!--@header-->, <!--@footer--> : fragments de src/pages/partials
//   {{address}}… : valeurs de src/js/lib/config.js      {{icon:nom:classes}} : icônes      {{art:nom}} : illustrations SVG
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const at = (...p) => join(root, ...p);
const load = (f) => import(pathToFileURL(at(f)).href);
const { CONFIG } = await load('src/js/lib/config.js'), { icon } = await load('src/js/ui/icons.js'), { artSvg } = await load('src/js/ui/art.js');
const tw = (await load('tailwind.config.js')).default;

const ARTS = {
  consoles: { type: 'console', platform: 'PS5', name: 'PlayStation 5', variant: 'PS5 Standard' },
  ps4: { type: 'console', platform: 'PS4', name: 'PlayStation 4', variant: 'PS4 Slim' },
  games: { type: 'jeu-physique', platform: 'PS5', name: 'Jeux PS4 PS5' },
  digital: { type: 'jeu-numerique', platform: 'PS5', name: 'Jeux numériques' },
  laptop: { type: 'appareil', platform: 'Ordinateur', name: 'Ordinateur' },
  phone: { type: 'appareil', platform: 'Téléphone', name: 'Téléphone' },
};
const vals = { ...CONFIG, themeColor: tw.theme.extend.colors.violet.DEFAULT, year: new Date().getFullYear(),
  waGeneric: `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent("Bonjour PIXEL PLAY, j'ai une question.")}`,
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(CONFIG.mapQuery) };
const part = (n) => readFileSync(at('src/pages/partials', `${n}.html`), 'utf8');
const parts = { head: part('head'), header: part('header'), footer: part('footer') };
const files = readdirSync(at('src/pages')).filter((f) => f.endsWith('.html'));
for (const f of files) {
  let out = readFileSync(at('src/pages', f), 'utf8');
  for (const [k, v] of Object.entries(parts)) out = out.replace(`<!--@${k}-->`, v);
  out = out.replace(/\{\{icon:(\w+)(?::([^}]+))?\}\}/g, (_, n, c) => String(icon(n, c || 'h-5 w-5')))
    .replace(/\{\{art:(\w+)\}\}/g, (_, n) => String(artSvg(ARTS[n])))
    .replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vals ? String(vals[k]).replace(/&/g, '&amp;') : m));
  writeFileSync(at(f), out);
}
console.log(`${files.length} pages HTML`);
