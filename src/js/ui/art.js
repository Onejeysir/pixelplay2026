// Visuels produits générés (SVG). Ce sont des illustrations génériques, pas des photos : une vraie photo
// ajoutée dans l'administration (ou via le champ "image" d'un produit) s'affiche à la place.
import tw from '../../../tailwind.config.js';
import { esc, raw } from './html.js';

// Couleurs des illustrations : mêmes valeurs que tailwind.config.js (une seule source).
const K = tw.theme.extend.colors;
const V = K.violet.DEFAULT, DEEP = K.violet.deep, DARK = K.violet.dark, LAV = K.violet.lav, SOFT = K.violet.soft, MID = K.violet.mid, INK = K.ink, LINE = K.line;

const CASE = [DEEP, DARK, INK, '#4B3F7A']; // fonds assez foncés pour le titre en blanc
const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const clean = (s) => String(s).replace(/\s*\((numérique|exemple)\)\s*/gi, ' ').trim();

function lines(text, max = 11, maxLines = 4) {
  const out = []; let cur = '';
  for (const w of clean(text).toUpperCase().split(/\s+/)) {
    if (cur && (cur + ' ' + w).length > max) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) out.push(cur);
  if (out.length > maxLines) { out.length = maxLines; out[maxLines - 1] = out[maxLines - 1].replace(/\s?\S{0,2}$/, '') + '…'; }
  return out;
}
const titleSvg = (text, x, y, w, color = '#fff') => {
  const ls = lines(text, 11, 4), longest = Math.max(...ls.map((l) => l.length), 1);
  const fs = Math.max(12, Math.min(24, w / (longest * 0.58))), lh = fs * 0.98;
  return ls.map((l, i) => `<text x="${x}" y="${y + i * lh}" font-size="${fs.toFixed(1)}" fill="${color}" class="afont">${esc(l)}</text>`).join('');
};

const consoleArt = (p) => {
  const ps5 = /PS5/i.test(p.platform), digital = /digital/i.test(p.variant || p.name);
  const label = `<text x="160" y="222" text-anchor="middle" font-size="22" fill="${DEEP}" class="afont">${esc(p.platform || 'PS')}</text>`;
  if (ps5) {
    return `<ellipse cx="160" cy="200" rx="86" ry="8" fill="${SOFT}"/>
      <path d="M104 62c0-18 12-32 30-32h-8c-16 0-24 10-24 26v132h14z" fill="${DEEP}"/><path d="M216 62c0-18-12-32-30-32h8c16 0 24 10 24 26v132h-14z" fill="${DEEP}"/>
      <rect x="120" y="28" width="80" height="164" rx="14" fill="#fff" stroke="${LINE}" stroke-width="2"/>
      ${digital ? '<rect x="132" y="44" width="56" height="3" rx="1.5" fill="${LINE}"/>' : '<rect x="132" y="56" width="56" height="4" rx="2" fill="${INK}"/><rect x="132" y="64" width="56" height="2" rx="1" fill="${MID}"/>'}
      <circle cx="146" cy="170" r="4" fill="${V}"/><circle cx="160" cy="170" r="4" fill="${MID}"/>
      <rect x="96" y="190" width="128" height="10" rx="5" fill="${INK}"/>${label}`;
  }
  return `<ellipse cx="160" cy="190" rx="100" ry="9" fill="${SOFT}"/>
    <path d="M62 140 224 108l36 20v22L98 182 62 160z" fill="${INK}"/><path d="M62 140 224 108l36 20-162 32z" fill="${DEEP}"/>
    <path d="M98 160l162-32v22L98 182z" fill="${DARK}"/><path d="M114 168l120-24" stroke="${V}" stroke-width="5" stroke-linecap="round"/>
    <rect x="130" y="130" width="46" height="4" rx="2" fill="${V}" transform="rotate(-11 130 130)"/>${label}`;
};

const caseArt = (p) => {
  const c = CASE[hash(p.name) % CASE.length], cond = p.condition ? p.condition.toUpperCase() : '';
  return `<ellipse cx="160" cy="222" rx="70" ry="6" fill="${SOFT}"/>
    <rect x="96" y="22" width="128" height="196" rx="5" fill="${INK}"/><rect x="96" y="22" width="14" height="196" rx="5" fill="${INK}"/>
    <rect x="112" y="28" width="106" height="184" fill="${c}"/>
    <rect x="112" y="28" width="106" height="22" fill="#fff"/><text x="120" y="44" font-size="15" fill="${INK}" class="afont">${esc(p.platform)}</text>
    ${titleSvg(p.name, 120, 88, 90)}
    ${cond ? `<rect x="112" y="190" width="106" height="22" fill="#00000033"/><text x="122" y="205" font-size="12" fill="#fff" class="afont">${esc(cond)}</text>` : ''}`;
};

const digitalArt = (p) => `<ellipse cx="160" cy="206" rx="90" ry="6" fill="${SOFT}"/>
  <rect x="62" y="46" width="196" height="150" rx="6" fill="${DEEP}"/><rect x="62" y="46" width="196" height="26" fill="#fff"/>
  <text x="72" y="64" font-size="16" fill="${INK}" class="afont">${esc(p.platform)}</text><text x="248" y="64" text-anchor="end" font-size="14" fill="${V}" class="afont">NUMÉRIQUE</text>
  ${titleSvg(p.name, 74, 108, 150)}
  <path d="M226 132v34m-12-12 12 12 12-12" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;

const deviceArt = (p) => {
  if (/téléphone/i.test(p.platform)) return `<ellipse cx="160" cy="214" rx="46" ry="5" fill="${SOFT}"/><rect x="124" y="20" width="72" height="190" rx="14" fill="${INK}"/><rect x="131" y="36" width="58" height="150" rx="3" fill="${LAV}"/><rect x="150" y="26" width="20" height="4" rx="2" fill="${DEEP}"/><circle cx="160" cy="198" r="4" fill="${DEEP}"/><rect x="140" y="62" width="40" height="40" rx="4" fill="${V}"/>`;
  if (/console/i.test(p.platform)) return consoleArt({ ...p, platform: 'PS' });
  return `<ellipse cx="160" cy="208" rx="116" ry="6" fill="${SOFT}"/><rect x="82" y="46" width="156" height="104" rx="7" fill="${INK}"/><rect x="90" y="54" width="140" height="88" rx="2" fill="${LAV}"/><rect x="104" y="68" width="68" height="8" fill="${V}"/><rect x="104" y="84" width="44" height="6" fill="${MID}"/><path d="M58 158h204l-14 20H72z" fill="${DEEP}"/><rect x="140" y="160" width="40" height="4" rx="2" fill="${V}"/>`;
};

export function artSvg(p) {
  const body = p.type === 'console' ? consoleArt(p) : p.type === 'jeu-physique' ? caseArt(p) : p.type === 'jeu-numerique' ? digitalArt(p) : deviceArt(p);
  return raw(`<svg class="h-full w-full" viewBox="0 0 320 240" role="img" aria-label="Illustration : ${esc(clean(p.name))}" preserveAspectRatio="xMidYMid meet">${body}</svg>`);
}
// Tuile : illustration + (si présente) la vraie photo par-dessus. Si la photo ne charge pas, elle est retirée (voir app.js).
export const tile = (p, extra = '') => raw(`<div class="tile ${extra}">${artSvg(p)}${p.image ? `<img class="photo absolute inset-0" src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" decoding="async" data-photo>` : ''}${p.demo ? '<span class="absolute left-0 top-0 bg-violet-lav px-2 py-1 text-[0.6875rem] font-semibold text-violet-dark">Démo</span>' : ''}</div>`);
