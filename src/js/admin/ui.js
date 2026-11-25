// Helpers partagés par les pages d'administration.
import { friendly } from '../lib/admin.js';
import { formatPrice } from '../lib/whatsapp.js';
import { STATUS_LABEL } from '../lib/product.js';
import { artSvg } from '../ui/art.js';
import { $, $$, html, mount, raw } from '../ui/html.js';
export { $, $$, html, mount, raw, formatPrice };

let tt;
export function toast(text, type = 'ok') {
  const el = $('#toast'); if (!el) return;
  clearTimeout(tt); el.textContent = (type === 'error' ? 'Erreur : ' : '') + text; el.classList.toggle('!bg-bad', type === 'error');
  el.classList.add('show'); tt = setTimeout(() => el.classList.remove('show'), type === 'error' ? 5000 : 2600);
}
export async function run(fn, okMsg) {
  try { const r = await fn(); if (okMsg) toast(okMsg); return { ok: true, value: r }; } catch (e) { toast(friendly(e), 'error'); return { ok: false }; }
}
export const head = (title, sub, actions = '') => html`<div class="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3"><div class="min-w-0"><h1 class="!text-[clamp(2rem,4.5vw,2.8rem)]">${title}</h1>${sub ? html`<p class="mt-1 text-mute">${sub}</p>` : ''}</div><div class="flex flex-wrap gap-2">${actions}</div></div>`;
export const empty = (title, text = '', action = '') => html`<div class="border border-dashed border-edge bg-white px-6 py-12 text-center"><p class="font-semibold">${title}</p>${text ? html`<p class="mt-1 text-mute">${text}</p>` : ''}${action ? html`<div class="mt-4">${action}</div>` : ''}</div>`;
export const stockPill = (st) => html`<span class="pill ${st === 'available' ? 'pill-ok' : st === 'low' ? 'pill-low' : st === 'disabled' ? 'pill-off' : 'pill-ko'}">${STATUS_LABEL[st]}</span>`;

export const fld = (n, label, v = '', { type = 'text', req = false, attrs = '', hint = '', cls = '' } = {}) => html`<div class="${cls}"><label class="label" for="${n}">${label}${req ? ' *' : ''}</label><input class="field" id="${n}" name="${n}" type="${type}" value="${v ?? ''}" ${raw(attrs)} aria-describedby="e_${n}">${hint ? html`<p class="hint mt-1">${hint}</p>` : ''}<p class="err" id="e_${n}" role="alert"></p></div>`;
export const sel = (n, label, options, v = '', { req = false, cls = '', blank = '' } = {}) => html`<div class="${cls}"><label class="label" for="${n}">${label}${req ? ' *' : ''}</label><select class="field" id="${n}" name="${n}" aria-describedby="e_${n}">${blank ? html`<option value="">${blank}</option>` : ''}${options.map(([k, l]) => html`<option value="${k}" ${String(k) === String(v) ? 'selected' : ''}>${l}</option>`)}</select><p class="err" id="e_${n}" role="alert"></p></div>`;
export const area = (n, label, v = '', { rows = 3, cls = '', hint = '' } = {}) => html`<div class="${cls}"><label class="label" for="${n}">${label}</label><textarea class="field" id="${n}" name="${n}" rows="${rows}">${v ?? ''}</textarea>${hint ? html`<p class="hint mt-1">${hint}</p>` : ''}</div>`;
export const check = (n, label, on) => html`<label class="flex min-h-[44px] cursor-pointer items-center gap-3 font-medium"><input type="checkbox" name="${n}" class="h-5 w-5 accent-violet" ${on ? 'checked' : ''}>${label}</label>`;
export function showErrors(root, errs) {
  $$('.err', root).forEach((p) => { p.textContent = ''; }); $$('[aria-invalid]', root).forEach((i) => i.removeAttribute('aria-invalid'));
  for (const [k, m] of Object.entries(errs)) { const p = $(`#e_${k}`, root), i = $(`#${k}`, root); if (p) p.textContent = m; if (i) i.setAttribute('aria-invalid', 'true'); }
  const first = Object.keys(errs)[0]; if (first) $(`#${first}`, root)?.focus();
}
// Vignette d'un produit (photo importée sinon illustration).
export function thumb(p, types, cls = 'h-12 w-12') {
  const url = p.product_images?.[0]?.url, s = p.specifications || {};
  const art = artSvg({ type: types?.get(p.category_id) || 'appareil', name: p.name, platform: s.platform || s.generation || '', variant: s.model || '', condition: p.condition === 'new' ? 'Neuf' : 'Occasion' });
  return html`<span class="relative block flex-none overflow-hidden bg-violet-lav ${cls}">${art}${url ? html`<img src="${url}" alt="" class="absolute inset-0 h-full w-full object-cover" data-photo>` : ''}</span>`;
}
