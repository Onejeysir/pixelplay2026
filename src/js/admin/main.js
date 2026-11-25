// Administration PIXEL PLAY — MODE SIMULATION. Routage par hash (#/produits…), connexion de démonstration, mise en page.
import { getSession, signIn, signOut, DEMO_ADMIN } from '../lib/sim/auth.js';
import { listRequests } from '../lib/sim/db.js';
import { isPersistent, subscribe } from '../lib/sim/store.js';
import { $, $$, html, mount, toast } from './ui.js';
import { dashboard } from './dashboard.js';
import { productForm, productList } from './products.js';
import { inventory } from './inventory.js';
import { categories } from './categories.js';
import { requestDetail, requestList } from './requests.js';
import { settings } from './settings.js';

const NAV = [['', 'Tableau de bord', 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z'], ['produits', 'Produits', 'M4 7l8-4 8 4v10l-8 4-8-4zM4 7l8 4 8-4M12 11v10'], ['stocks', 'Stocks', 'M4 20V10m6 10V4m6 16v-7m4 7H2'],
  ['categories', 'Catégories', 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'], ['demandes', 'Demandes de rachat', 'M4 5h16v11H8l-4 4zM8 9h8M8 12h5'], ['parametres', 'Paramètres', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-1-3-2 .5-1.5-1.5.5-2-3-1-1 2h-2l-1-2-3 1 .5 2L6 8.5 4 8l-1 3 2 1v2l-2 1 1 3 2-.5L7.5 19l-.5 2 3 1 1-2h2l1 2 3-1-.5-2 1.5-1.5 2 .5 1-3-2-1z']];
const TITLES = { '': 'Tableau de bord', produits: 'Produits', stocks: 'Stocks', categories: 'Catégories', demandes: 'Demandes de rachat', parametres: 'Paramètres' };
const root = $('#root');
let unsub = null, shellOn = false;

const route = () => { const [a = '', b = ''] = location.hash.replace(/^#\/?/, '').split('/'); return { a, b: decodeURIComponent(b) }; };
const go = (h) => { location.hash = h; };

function loginView() {
  shellOn = false;
  document.title = 'Connexion | Administration PIXEL PLAY';
  mount(root, html`
  <div class="grid min-h-screen place-items-center bg-mist px-4 py-10">
    <div class="w-full max-w-[440px]">
      <p class="mb-6"><a class="link" href="index.html">← Retour au site</a></p>
      <form id="login" class="panel p-6 sm:p-8" novalidate>
        <img src="assets/img/logo.png" alt="" width="48" height="48" class="h-12 w-12">
        <h1 class="mt-4 !text-4xl">Administration</h1>
        <p class="mt-1 text-mute">Espace de gestion PIXEL PLAY (démonstration).</p>
        <p class="notice warn mt-5">Mode simulation : les données restent dans ce navigateur et cette connexion n'est pas sécurisée. Ne l'utilisez pas en production.</p>
        <div class="mt-5 grid gap-4">
          <div><label class="label" for="email">Adresse e-mail</label><input class="field" id="email" name="email" type="email" autocomplete="username" required></div>
          <div><label class="label" for="password">Mot de passe</label><div class="flex gap-2"><input class="field" id="password" name="password" type="password" autocomplete="current-password" required><button type="button" class="btn btn-ghost btn-sm flex-none" data-toggle aria-pressed="false">Afficher</button></div></div>
        </div>
        <p id="login-err" class="err mt-3" role="alert"></p>
        <button class="btn mt-4 w-full" type="submit">Se connecter</button>
        <div class="mt-6 border-t border-line pt-4 text-sm text-mute">
          <p>Compte de démonstration : <strong class="text-ink">${DEMO_ADMIN.email}</strong> / <strong class="text-ink">${DEMO_ADMIN.password}</strong></p>
          <button type="button" class="linkbtn mt-1" data-fill>Remplir les identifiants de démonstration</button>
        </div>
      </form>
    </div>
  </div>`);
  const f = $('#login');
  f.addEventListener('click', (e) => {
    if (e.target.closest('[data-fill]')) { $('#email').value = DEMO_ADMIN.email; $('#password').value = DEMO_ADMIN.password; $('#password').focus(); }
    const t = e.target.closest('[data-toggle]');
    if (t) { const p = $('#password'), show = p.type === 'password'; p.type = show ? 'text' : 'password'; t.textContent = show ? 'Masquer' : 'Afficher'; t.setAttribute('aria-pressed', String(show)); }
  });
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const r = signIn($('#email').value, $('#password').value);
    if (!r.ok) { $('#login-err').textContent = r.error; $('#password').value = ''; $('#password').focus(); return; }
    render();
  });
  $('#email').focus();
}

function shell(session) {
  shellOn = true;
  mount(root, html`
  <div class="min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
    <a class="skip" href="#view">Aller au contenu</a>
    <aside id="side" class="flex flex-col bg-ink text-white" aria-label="Menu d'administration">
      <div class="flex h-16 items-center justify-between gap-2 border-b border-white/10 px-4"><a class="flex items-center gap-2.5 no-underline" href="#/"><img src="assets/img/logo-white.png" alt="" width="36" height="36" class="h-9 w-9"><span class="font-display text-2xl font-extrabold italic uppercase leading-none">Pixel Play</span></a><button type="button" class="iconbtn !text-white hover:!bg-white/10 lg:hidden" data-close aria-label="Fermer le menu"><svg viewBox="0 0 24 24" class="h-5 w-5"><path d="m5 5 14 14M19 5 5 19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>
      <nav class="flex-1 overflow-y-auto py-3" aria-label="Sections">
        ${NAV.map(([k, l, d]) => html`<a class="side-link" href="#/${k}" data-nav="${k}"><svg viewBox="0 0 24 24" class="h-5 w-5 flex-none" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg><span class="flex-1">${l}</span>${k === 'demandes' ? html`<span id="req-badge" hidden class="bg-white px-1.5 text-xs font-bold text-violet-dark"></span>` : ''}</a>`)}
      </nav>
      <div class="border-t border-white/10 py-3"><a class="side-link" href="index.html">Voir le site</a><button type="button" class="side-link w-full cursor-pointer bg-transparent text-left" data-logout>Déconnexion</button></div>
    </aside>
    <div class="flex min-w-0 flex-col">
      <header class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white px-4 sm:px-6">
        <button type="button" class="iconbtn lg:hidden" data-open aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="side"><svg viewBox="0 0 24 24" class="h-5 w-5"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
        <p id="crumb" class="min-w-0 flex-1 truncate font-semibold"></p>
        <span class="pill pill-low hidden sm:inline-flex" title="Les données restent dans ce navigateur">Mode simulation</span>
        <span class="hidden text-sm text-mute md:inline">${session.full_name}</span>
        <button type="button" class="btn btn-ghost btn-sm" data-logout>Déconnexion</button>
      </header>
      <p class="border-b border-line bg-warn-note px-4 py-2 text-[0.8125rem] text-warn sm:px-6" role="note">Simulation : données enregistrées uniquement dans ce navigateur, non partagées entre appareils. Cette administration n'est pas un système sécurisé de production.</p>
      <main id="view" tabindex="-1" class="min-w-0 flex-1 p-4 outline-none sm:p-6 lg:p-8"></main>
    </div>
  </div>
  <div id="drawer-overlay" hidden></div>`);
  const side = $('#side'), ov = $('#drawer-overlay'), open = $('[data-open]');
  const setDrawer = (o) => { side.classList.toggle('open', o); ov.hidden = !o; open.setAttribute('aria-expanded', String(o)); if (o) $('a', side).focus(); };
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-open]')) setDrawer(true);
    else if (e.target.closest('[data-close]') || e.target === ov || e.target.closest('#side a')) setDrawer(false);
    if (e.target.closest('[data-logout]')) { signOut(); location.hash = ''; render(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setDrawer(false); });
}

async function badge() {
  const n = (await listRequests()).filter((r) => r.status === 'new').length, b = $('#req-badge');
  if (b) { b.textContent = n; b.hidden = n === 0; }
}

async function render() {
  const session = getSession();
  if (!session) { if (unsub) { unsub(); unsub = null; } loginView(); return; }
  if (!shellOn || !$('#view')) shell(session);
  const { a, b } = route(), view = $('#view');
  view.onclick = view.onchange = view.oninput = view.onsubmit = null;
  $$('#side [data-nav]').forEach((l) => (l.dataset.nav === a ? l.setAttribute('aria-current', 'page') : l.removeAttribute('aria-current')));
  const title = TITLES[a] ?? 'Page introuvable';
  $('#crumb').textContent = title; document.title = `${title} | Administration PIXEL PLAY`;
  view.dataset.form = '';
  try {
    if (a === '') await dashboard(view);
    else if (a === 'produits') await (b ? productForm(view, b, go) : productList(view, go));
    else if (a === 'stocks') await inventory(view);
    else if (a === 'categories') await categories(view);
    else if (a === 'demandes') await (b ? requestDetail(view, b, go) : requestList(view));
    else if (a === 'parametres') await settings(view, go);
    else mount(view, html`<h1>Page introuvable</h1><p class="mt-3"><a class="btn" href="#/">Tableau de bord</a></p>`);
  } catch (e) { console.error(e); mount(view, html`<div class="notice error" role="alert">Impossible d'afficher cette page : ${e.message}</div>`); }
  badge();
  if (!unsub) unsub = subscribe(({ external }) => { if (external && !$('#view')?.dataset.form) render(); else badge(); });
}

if (!isPersistent()) setTimeout(() => toast("Stockage du navigateur indisponible : les modifications seront perdues à la fermeture de l'onglet.", 'error'), 500);
window.addEventListener('hashchange', () => { render(); $('#view')?.focus({ preventScroll: true }); window.scrollTo(0, 0); });
render();
