// Tests de bout en bout (navigateur réel). Prérequis : `npm run build`, `npm run serve` dans un autre terminal,
// puis `npm i -D playwright` (une seule fois). Lancer : node tests/e2e.cjs
const { chromium } = require('playwright');
const path = require('node:path');
const BASE = process.env.BASE || 'http://localhost:8080';
const FIX = (f) => path.join(__dirname, 'fixtures', f);
let pass = 0, fail = 0; const fails = [];
const ok = (c, m) => { if (c) pass++; else { fail++; fails.push(m); console.log('  ÉCHEC :', m); } };
const eq = (a, b, m) => ok(a === b, `${m} (attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`);
const waText = (href) => decodeURIComponent(href.split('?text=')[1] || '');

(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = async (w = 1280, h = 900) => { const c = await b.newContext({ viewport: { width: w, height: h } }); const p = await c.newPage(); p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); return p; };

  // 1. Pas de défilement horizontal, à toutes les largeurs, sur toutes les pages
  console.log('1. Débordement horizontal');
  const pages = ['index', 'index.html?cat=telephone', 'index.html?cat=console&page=1', 'jeux', 'jeux-numeriques', 'jeux-physiques', 'vendre-mon-appareil', 'produit?id=c-ps5-std', 'panier', '404', 'admin'];
  const url = (pg) => `${BASE}/${pg}${pg.includes('?') || pg.includes('.html') ? '' : '.html'}`;
  for (const w of [320, 360, 375, 390, 430, 768, 1024, 1280, 1440]) {
    const p = await ctx(w, 800);
    for (const pg of pages) { await p.goto(url(pg)); await p.waitForTimeout(120); const o = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); ok(o <= 0, `débordement ${o}px sur ${pg} à ${w}px`); }
    await p.context().close();
  }

  // 2. Menu, accueil épuré, Contact supprimé, footer court, bouton WhatsApp flottant
  console.log('2. Menu, accueil, footer');
  let p = await ctx();
  await p.goto(`${BASE}/index.html`);
  eq((await p.locator('#menu a').allInnerTexts()).join('|'), 'Accueil|Jeux vidéo|Vente', 'menu : Accueil, Jeux vidéo, Vente uniquement');
  eq(await p.locator('a[href*="contact"], a[href*="consoles.html"], a[href*="appareils.html"]').count(), 0, 'aucun lien vers Contact / anciennes pages');
  eq(await p.locator('text=Explorer les consoles').count() + await p.locator('text=Découvrir les jeux').count(), 0, 'boutons « Explorer / Découvrir » retirés');
  eq(await p.locator('section.on-violet img, section.on-violet svg:not(a svg)').count(), 0, 'aucun logo / visuel dans le bandeau d\'accueil');
  for (const gone of ['contact', 'consoles', 'appareils']) { const r = await p.request.get(`${BASE}/${gone}.html`); eq(r.status(), 404, `${gone}.html n'existe plus (404)`); }
  await p.goto(`${BASE}/index.html`);
  for (const pg of pages.filter((x) => x !== 'admin')) { await p.goto(url(pg)); const h = await p.getAttribute('.fab', 'href'); ok(h && h.startsWith('https://wa.me/237697692598'), `bouton WhatsApp flottant sur ${pg}`); eq(await p.locator('a[href*="contact.html"]').count(), 0, `aucun lien Contact sur ${pg}`); }
  await p.goto(`${BASE}/index.html`);
  const fh = await p.evaluate(() => document.querySelector('footer').getBoundingClientRect().height);
  ok(fh < 110, `footer court (${Math.round(fh)} px)`); eq(await p.locator('footer a:not(.fab)').count(), 1, 'footer : un seul lien (admin démo)');
  ok((await p.innerText('footer')).includes('PIXEL PLAY') && /©\s*20\d\d/.test(await p.innerText('footer')), 'footer : nom + copyright');
  await p.click('#menu a[data-nav=sell]'); await p.waitForURL(/vendre-mon-appareil/); eq(await p.getAttribute('#menu a[aria-current=page]', 'data-nav'), 'sell', 'menu : Vente actif');

  // 3. Carrousel
  console.log('3. Carrousel');
  await p.goto(`${BASE}/index.html`); await p.waitForSelector('.car-slide');
  eq(await p.locator('.car-slide').count(), 6, 'carrousel : 6 appareils');
  const idx = () => p.evaluate(() => [...document.querySelectorAll('[data-dot]')].findIndex((d) => d.getAttribute('aria-current') === 'true'));
  eq(await idx(), 0, 'carrousel : démarre à la première image');
  await p.click('[data-go="1"]'); await p.waitForTimeout(1100); eq(await idx(), 1, 'bouton suivant');
  await p.click('[data-go="-1"]'); await p.waitForTimeout(1100); eq(await idx(), 0, 'bouton précédent');
  await p.click('[data-go="-1"]'); await p.waitForTimeout(1500); eq(await idx(), 5, 'précédent depuis la première : revient à la dernière');
  await p.click('[data-dot="2"]'); await p.waitForTimeout(1500); eq(await idx(), 2, 'points de navigation');
  ok(await p.evaluate(() => { const t = document.querySelector('.car-track'); return Math.abs(t.scrollLeft - 2 * t.clientWidth) < 3; }), 'carrousel : image alignée (pas de décalage)');
  await p.reload(); await p.waitForSelector('.car-slide'); await p.mouse.move(5, 5); await p.waitForTimeout(6200); eq(await idx(), 1, 'défilement automatique (toutes les 5 s)');
  await p.evaluate(() => document.querySelector('#car-play').click()); ok((await p.getAttribute('#car-play', 'aria-pressed')) === 'true', 'bouton pause');
  await p.waitForTimeout(6200); eq(await idx(), 1, 'en pause : ne défile plus');
  const rm = await b.newContext({ viewport: { width: 390, height: 800 }, reducedMotion: 'reduce' }); const rp = await rm.newPage(); await rp.goto(`${BASE}/index.html`); await rp.waitForSelector('.car-slide'); await rp.waitForTimeout(5800);
  ok((await rp.evaluate(() => [...document.querySelectorAll('[data-dot]')].findIndex((d) => d.getAttribute('aria-current') === 'true'))) === 0, 'prefers-reduced-motion : pas de défilement automatique'); await rm.close();
  const slideImg = await p.evaluate(() => { const r = document.querySelector('.car-slide svg').getBoundingClientRect(); return r.width > 100 && r.height > 60; }); ok(slideImg, 'carrousel : visuel affiché');
  ok((await p.getAttribute('.car-slide >> nth=0 >> a.btn', 'href')).includes('produit.html?id='), 'carrousel : « Voir le produit » mène à la fiche');

  // 4. Catalogue de l'accueil : catégories, filtres, pagination
  console.log('4. Catalogue appareils');
  await p.goto(`${BASE}/index.html`); await p.waitForSelector('#results article');
  const n = () => p.locator('#results article').count();
  eq(await n(), 8, 'Tous : 8 produits sur la page 1'); ok((await p.innerText('#cats')).includes('17 produits'), 'compteur « Tous » : 17');
  ok(await p.locator('#pager').isVisible(), 'pagination visible'); eq(await p.locator('#pager [data-goto]').count(), 5, 'pagination : Précédent, 1, 2, 3, Suivant');
  eq(await p.getAttribute('#pager [aria-current=page]', 'data-goto'), '1', 'page active : 1'); ok(await p.locator('#pager [data-goto="0"]').isDisabled(), '« Précédent » désactivé sur la page 1');
  const first1 = await p.locator('#results article h3').first().innerText();
  await p.click('#pager [data-goto="2"]'); eq(await n(), 8, 'page 2 : 8 produits'); ok((await p.locator('#results article h3').first().innerText()) !== first1, 'page 2 : autres produits');
  ok(p.url().includes('page=2'), 'page dans l\'URL'); eq(await p.getAttribute('#pager [aria-current=page]', 'data-goto'), '2', 'page active : 2');
  await p.click('#pager .pg >> text=Suivant'); eq(await n(), 1, 'page 3 : le dernier produit'); ok(await p.locator('#pager .pg >> text=Suivant').isDisabled(), '« Suivant » désactivé sur la dernière page');
  ok((await p.innerText('#count')).includes('page 3 sur 3'), 'compteur : page 3 sur 3');
  await p.click('#pager .pg >> text=Précédent'); eq(await p.getAttribute('#pager [aria-current=page]', 'data-goto'), '2', 'bouton Précédent');
  await p.fill('#f-q', 'portable'); eq(await n(), 5, 'filtre (recherche) → 5 résultats'); ok(!(await p.locator('#pager').isVisible()), 'une seule page : pagination masquée'); ok(!p.url().includes('page='), 'retour à la page 1 après un filtre');
  await p.fill('#f-q', ''); eq(await p.getAttribute('#pager [aria-current=page]', 'data-goto'), '1', 'filtre vidé : page 1');
  await p.click('#pager [data-goto="3"]'); await p.click('[data-cat="telephone"]'); eq(await n(), 6, 'catégorie Téléphones : 6'); ok(!p.url().includes('page=') && p.url().includes('cat=telephone'), 'changer de catégorie : page 1 + cat dans l\'URL');
  eq(await p.getAttribute('[data-cat=telephone]', 'aria-pressed'), 'true', 'catégorie active signalée');
  ok(await p.locator('[data-chip=brand][data-value=Samsung]').count() === 1 && await p.locator('[data-chip=storage]').count() >= 2 && await p.locator('[data-chip=platform]').count() === 0, 'filtres téléphones : marque, stockage, état');
  await p.click('[data-chip=brand][data-value=Samsung]'); eq(await n(), 2, 'téléphones Samsung : 2');
  await p.click('[data-chip=storage][data-value="256 Go"]'); eq(await n(), 1, 'Samsung + 256 Go : 1');
  await p.click('button[data-reset] >> nth=0'); eq(await n(), 6, 'réinitialisation des filtres');
  await p.fill('#f-max', '80000'); ok((await n()) < 6 && (await n()) > 0, 'prix max'); await p.fill('#f-max', '');
  await p.fill('#f-q', 'zzzz'); ok(await p.locator('#results >> text=Aucun produit ne correspond').count() === 1, 'état vide avec message clair'); await p.click('#results [data-reset]'); eq(await n(), 6, 'état vide : bouton de réinitialisation');
  await p.click('[data-cat="ordinateur"]'); eq(await n(), 5, 'catégorie Ordinateurs : 5'); ok(await p.locator('[data-chip=ram]').count() >= 2 && await p.locator('[data-chip=brand]').count() >= 2, 'filtres ordinateurs : marque, RAM');
  await p.click('[data-chip=ram][data-value="16 Go"]'); eq(await n(), 2, 'ordinateurs 16 Go : 2');
  await p.click('[data-cat="console"]'); eq(await n(), 6, 'catégorie Consoles : 6'); ok(await p.locator('[data-chip=platform][data-value=PS4]').count() === 1 && await p.locator('[data-chip=brand]').count() === 0, 'filtres consoles : génération, état (marque unique masquée)');
  await p.click('[data-chip=platform][data-value=PS5]'); eq(await n(), 3, 'PS5 : 3'); await p.click('[data-chip=condition][data-value=Neuf]'); eq(await n(), 2, 'PS5 + Neuf : 2');
  await p.click('button[data-reset] >> nth=0'); await p.selectOption('#f-sort', 'asc'); ok((await p.locator('#results article').first().innerText()).includes('90 000'), 'tri prix croissant');
  await p.check('input[name=inStock]'); ok((await n()) < 6, 'filtre disponibles'); await p.uncheck('input[name=inStock]');
  const card = p.locator('#results article:has-text("PlayStation 5 Standard")');
  ok((await card.locator('a.btn >> nth=0').innerText()).includes('Voir le produit') && (await card.locator('a.btn >> nth=0').getAttribute('href')).includes('produit.html?id=c-ps5-std'), 'carte : bouton « Voir le produit »');
  const wa = await card.locator('a.btn-wa').getAttribute('href'), t = waText(wa);
  ok(wa.startsWith('https://wa.me/237697692598?text='), 'URL wa.me correcte'); ok(t.includes('PlayStation 5 Standard') && t.includes('450 000 FCFA') && t.includes('C-PS5-STD'), 'message WhatsApp : produit, prix, référence'); ok(!wa.includes(' ') && !wa.includes('\n'), 'texte encodé');
  await p.goto(`${BASE}/index.html?cat=ordinateur&page=9`); await p.waitForSelector('#results article'); eq(await n(), 5, 'URL directe : catégorie + page hors limites ramenée à la dernière'); eq(await p.getAttribute('[data-cat=ordinateur]', 'aria-pressed'), 'true', 'URL directe : catégorie active');
  await p.goto(`${BASE}/jeux-physiques.html`); await p.waitForSelector('#results article'); eq(await p.locator('#results article').count(), 4, '4 jeux physiques'); ok(!(await p.locator('#pager').isVisible()), 'jeux : pas de pagination inutile');
  ok((await p.innerText('#results article >> nth=0')).includes('Ajouter'), 'jeux : bouton panier conservé');
  await p.click('[data-chip=platform][data-value=PS5]'); ok((await p.locator('#results article').count()) === 2, 'jeux : filtre PS5');
  await p.goto(`${BASE}/jeux-numeriques.html`); await p.waitForSelector('#results article'); eq(await p.locator('#results article').count(), 2, '2 jeux numériques');
  ok(await p.locator('main >> text=Ne communiquez jamais de mot de passe').count() >= 1, 'avertissement numérique');
  await p.goto(`${BASE}/jeux.html`); await p.waitForSelector('#results article'); eq(await p.locator('#results article').count(), 6, 'jeux : 6 produits');
  await p.click('#search-toggle'); await p.fill('#q', 'spider'); await p.press('#q', 'Enter'); await p.waitForURL(/jeux-physiques\.html\?q=spider/);
  await p.waitForSelector('#results article'); eq(await p.locator('#results article').count(), 1, 'recherche d\'en-tête (jeu) → bonne page filtrée');
  await p.click('#search-toggle'); await p.fill('#q', 'samsung'); await p.press('#q', 'Enter'); await p.waitForURL(/index\.html\?cat=telephone&q=samsung/);
  await p.waitForSelector('#results article'); eq(await p.locator('#results article').count(), 2, 'recherche d\'en-tête (appareil) → accueil, catégorie filtrée');

  // 5. Fiche produit, retour arrière, panier
  console.log('5. Produit, historique, panier');
  await p.goto(`${BASE}/index.html?cat=console`); await p.waitForSelector('#results article');
  await p.click('#results article h3 a >> nth=0'); await p.waitForSelector('h1'); ok(p.url().includes('produit.html?id='), 'fiche produit');
  eq(await p.getAttribute('#menu a[aria-current=page]', 'data-nav'), 'home', 'menu : Accueil actif sur la fiche d\'une console');
  ok((await p.getAttribute('#back', 'href')).includes('cat=console'), 'lien Retour → catégorie Consoles');
  await p.goBack(); await p.waitForSelector('#results article'); ok(p.url().includes('index.html'), 'retour arrière → accueil');
  await p.goto(`${BASE}/produit.html?id=a-lap`); await p.waitForSelector('h1'); ok((await p.innerText('main')).includes('HP'), 'fiche appareil : marque affichée');
  await p.goto(`${BASE}/produit.html?id=c-ps5-std`); await p.waitForSelector('[data-qty]');
  await p.click('[data-qty="1"]'); eq((await p.locator('.qty output').innerText()).trim(), '2', 'quantité 2');
  await p.click('[data-action=add]'); await p.waitForTimeout(200); eq((await p.innerText('#cart-badge')).trim(), '2', 'badge panier = 2');
  await p.goto(`${BASE}/produit.html?id=g-gt7`); await p.waitForSelector('[data-action=add]'); await p.click('[data-action=add]');
  await p.goto(`${BASE}/panier.html`); await p.waitForSelector('ul li');
  eq(await p.locator('main ul > li').count(), 2, 'panier : 2 lignes');
  ok((await p.innerText('aside')).includes('Total\n912 000 FCFA'), 'total calculé (912 000 FCFA)');
  const ord = waText(await p.getAttribute('aside a.btn-wa', 'href'));
  ok(ord.includes('RÉCAPITULATIF DE MA COMMANDE') && ord.includes('PlayStation 5 Standard') && ord.includes('Quantité : 2') && ord.includes('Gran Turismo 7') && ord.includes('TOTAL : 912 000 FCFA'), 'message de commande complet');
  await p.click('[data-action=inc][data-id="c-ps5-std"]'); eq((await p.locator('.qty output').first().innerText()).trim(), '3', 'quantité +1');
  ok(await p.locator('[data-action=inc][data-id="c-ps5-std"]').isDisabled(), 'quantité plafonnée au stock (3)');
  p.once('dialog', (d) => d.accept()); await p.click('[data-action=clear]'); await p.waitForSelector('text=Votre panier est vide');
  await p.reload(); ok(await p.locator('text=Votre panier est vide').count() === 1, 'panier vide après actualisation');

  // 6. Vendre mon appareil : formulaire, WhatsApp et e-mail indépendants
  console.log('6. Vendre mon appareil');
  await p.context().route(/https:\/\/wa\.me\//, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: 'ok' }));
  await p.goto(`${BASE}/vendre-mon-appareil.html`); await p.waitForSelector('#sell');
  ok((await p.innerText('main')).includes('Vous souhaitez vendre votre appareil ? Proposez votre ordinateur, téléphone ou console à PIXEL PLAY en quelques instants. Contactez-nous par WhatsApp ou par e-mail, selon votre préférence.'), 'texte court de présentation');
  eq(await p.locator('ol').count(), 0, 'plus de longues explications (liste d\'étapes retirée)');
  eq(await p.locator('#sell input:not([type=file]):not([tabindex="-1"]), #sell select, #sell textarea').count(), 7, 'formulaire court : 7 champs (nom produit, état, description, prix, nom, téléphone, e-mail)');
  ok(await p.locator('[data-send=whatsapp]').isVisible() && await p.locator('[data-send=email]').isVisible(), 'deux boutons : WhatsApp et e-mail');
  ok((await p.innerText('[data-send=whatsapp]')).includes('Envoyer ma proposition par WhatsApp') && (await p.innerText('[data-send=email]')).includes('Envoyer ma proposition par e-mail'), 'libellés des boutons');
  await p.click('[data-send=whatsapp]'); ok((await p.innerText('#e_product')).length > 0 && (await p.innerText('#e_condition')).length > 0 && (await p.innerText('#e_name')).length > 0 && (await p.innerText('#e_phone')).length > 0, 'envoi vide refusé, erreurs près des champs');
  eq(await p.locator('#done:not([hidden])').count(), 0, 'rien n\'est préparé quand le formulaire est invalide');
  await p.click('[data-send=email]'); ok((await p.innerText('#e_product')).length > 0, 'e-mail : même validation');
  await p.fill('#product', 'HP 15 pouces'); await p.selectOption('#condition', 'Bon état'); await p.fill('#description', 'Écran parfait, chargeur inclus'); await p.fill('#price', '150 000');
  await p.fill('#name', 'Awa Test'); await p.fill('#phone', '12'); await p.fill('#email', 'pas-un-email');
  await p.click('[data-send=whatsapp]'); ok((await p.innerText('#e_phone')).includes('invalide') && (await p.innerText('#e_email')).includes('invalide'), 'téléphone et e-mail invalides refusés');
  eq(await p.inputValue('#product'), 'HP 15 pouces', 'saisie conservée après erreur');
  await p.fill('#phone', '691 23 45 67'); await p.fill('#email', '');
  await p.setInputFiles('#photos', [FIX('photo1.png'), FIX('photo2.jpg'), FIX('notes.txt')]);
  eq(await p.locator('#prev li').count(), 2, 'aperçus : 2 photos valides'); ok((await p.innerText('#e_photos')).includes('format non autorisé'), 'format refusé avec message');
  await p.click('#prev [data-rm] >> nth=0'); eq(await p.locator('#prev li').count(), 1, 'suppression d\'une photo');
  const [pop] = await Promise.all([p.context().waitForEvent('page'), p.click('[data-send=whatsapp]')]);
  ok(pop.url().startsWith('https://wa.me/237697692598?text='), 'WhatsApp : ouvre wa.me avec le bon numéro'); await pop.close();
  const sm = waText(await p.getAttribute('#done a.btn-wa', 'href'));
  ok(sm.includes('- Appareil : HP 15 pouces') && sm.includes('- Nom : Awa Test') && sm.includes('- Téléphone : 691 23 45 67') && sm.includes('150 000 FCFA') && sm.includes('Écran parfait') && sm.includes("Nombre d'images sélectionnées : 1") && !sm.includes('E-mail :'), 'message WhatsApp rempli avec les vraies données');
  ok((await p.innerText('#done')).includes('Pensez à joindre vos 1 photo') && (await p.innerText('#done')).includes("Rien n'est enregistré"), 'consigne photos + aucune fausse promesse');
  ok(!/envoyée avec succès|bien reçue|automatiquement/i.test(await p.innerText('#done')), 'ne prétend pas que la demande est envoyée');
  eq(await p.locator('#sell').count(), 1, 'formulaire toujours présent (pas de redirection)');
  await p.click('[data-send=email]'); await p.waitForSelector('#done:not([hidden]) h2:has-text("e-mail")'); ok(p.url().includes('vendre-mon-appareil'), 'e-mail : la page ne quitte pas le site');
  const mh = await p.getAttribute('#done a[href^="mailto:"]', 'href'), mq = new URLSearchParams(mh.split('?')[1]);
  ok(mh.startsWith('mailto:jeysonudalric150@gmail.com?'), 'e-mail : destinataire officiel'); ok(mq.get('subject') === 'Proposition de vente : HP 15 pouces' && mq.get('body').includes('Awa Test') && mq.get('body').includes('cet e-mail'), 'e-mail : sujet et corps préremplis');
  await p.fill('#email', 'awa@exemple.com'); await p.click('[data-send=whatsapp]'); await p.waitForTimeout(300);
  ok(waText(await p.getAttribute('#done a.btn-wa', 'href')).includes('- E-mail : awa@exemple.com'), 'e-mail du vendeur ajouté au message quand il est renseigné');
  ok((await p.getAttribute('aside a[data-link=mail]', 'href')) === 'mailto:jeysonudalric150@gmail.com' && (await p.getAttribute('aside a[data-link=wa]', 'href')).startsWith('https://wa.me/237697692598'), 'contact direct : WhatsApp et e-mail');
  ok((await p.getAttribute('aside a[data-link=tel]', 'href')).startsWith('tel:+237697692598'), 'lien tel: correct');

  // 6. Administration (même contexte : même localStorage que le site)
  console.log('6. Administration');
  await p.goto(`${BASE}/admin.html#/produits`); await p.waitForSelector('#login');
  await p.fill('#email', 'admin@pixelplay.cm'); await p.fill('#password', 'faux'); await p.click('#login button[type=submit]'); ok((await p.innerText('#login-err')).includes('incorrect'), 'mauvais mot de passe refusé');
  await p.click('[data-fill]'); await p.click('#login button[type=submit]'); await p.waitForSelector('#view h1'); ok(p.url().includes('#/produits'), 'connexion → page demandée');
  await p.waitForSelector('[data-price="c-ps5-std"]');
  await p.fill('[data-price="c-ps5-std"]', '460000'); await p.press('[data-price="c-ps5-std"]', 'Tab'); await p.waitForTimeout(300);
  await p.fill('[data-stock="c-ps4-std"]', '0'); await p.press('[data-stock="c-ps4-std"]', 'Tab'); await p.waitForTimeout(300);
  await p.goto(`${BASE}/index.html?cat=console`); await p.waitForSelector('#results article');
  ok((await p.innerText('#results article:has-text("PlayStation 5 Standard")')).includes('460 000'), 'prix modifié dans l\'admin visible sur le site');
  const ps4 = p.locator('#results article:has-text("PlayStation 4 Standard")'); ok((await ps4.innerText()).includes('Rupture') && await ps4.locator('a.btn-wa').count() === 0, 'rupture : affichée, sans bouton de commande WhatsApp');
  await p.goto(`${BASE}/admin.html#/produits/nouveau`); await p.waitForSelector('#pf');
  await p.click('#save'); ok((await p.innerText('#e_name')).length > 0 && (await p.innerText('#e_price')).length > 0, 'produit : validation');
  await p.fill('#name', 'PlayStation 5 Pro (test)'); await p.selectOption('#category_id', { label: 'Consoles' }); await p.fill('#price', '600000'); await p.fill('#stock_quantity', '2');
  await p.setInputFiles('#files', [FIX('photo1.png')]); await p.click('#save'); await p.waitForURL(/#\/produits$/); await p.waitForSelector('[data-price]');
  await p.goto(`${BASE}/index.html?cat=console`); await p.waitForSelector('#results article');
  const np = p.locator('#results article:has-text("PlayStation 5 Pro (test)")'); eq(await np.count(), 1, 'nouveau produit visible sur le site');
  await p.waitForTimeout(300); ok(await np.locator('img.photo').count() === 1 && await np.locator('img.photo').evaluate((i) => i.naturalWidth > 0), 'photo importée (IndexedDB) affichée');
  await p.goto(`${BASE}/admin.html#/stocks`); await p.waitForSelector('[data-adjust]');
  await p.fill('[data-adjust="c-ps5-dig"] input[name=qty]', '1'); await p.click('[data-adjust="c-ps5-dig"] button'); await p.waitForTimeout(400);
  ok((await p.innerText('main')).includes('Correction') || (await p.innerText('main')).includes('Réception'), 'historique des mouvements');
  await p.goto(`${BASE}/admin.html#/categories`); await p.waitForSelector('#cf');
  await p.fill('#name', 'Accessoires'); await p.click('#cs'); await p.waitForSelector('td:has-text("Accessoires")');
  p.once('dialog', (d) => d.accept()); await p.click('tr:has-text("Accessoires") [data-del]'); await p.waitForTimeout(400); eq(await p.locator('td:has-text("Accessoires")').count(), 0, 'catégorie créée puis supprimée');
  eq(await p.locator('tr:has-text("Consoles") [data-del]').count(), 0, 'catégorie de base protégée');
  await p.goto(`${BASE}/admin.html#/demandes`); await p.waitForSelector('text=Galaxy A54'); await p.click('tr:has-text("Galaxy A54") a');
  await p.waitForSelector('#rf');
  await p.selectOption('#status', 'accepted'); await p.fill('#notes', 'Rappeler demain'); await p.click('#rf button[type=submit]'); await p.waitForTimeout(300);
  await p.reload(); await p.waitForSelector('#rf'); eq(await p.inputValue('#status'), 'accepted', 'statut conservé après actualisation');
  ok((await p.getAttribute('#rf a.btn-wa', 'href')).includes('wa.me/237690000001'), 'contact WhatsApp du client (demande de démonstration)');
  await p.goto(`${BASE}/admin.html#/parametres`); await p.waitForSelector('#sf');
  await p.fill('#whatsapp', '237600000000'); await p.fill('#address', 'Adresse test'); await p.fill('#email', 'test@exemple.com'); await p.click('#sf button[type=submit]'); await p.waitForTimeout(300);
  await p.fill('#whatsapp', 'abc'); await p.click('#sf button[type=submit]'); ok((await p.innerText('#e_whatsapp')).length > 0, 'numéro WhatsApp invalide refusé');
  await p.goto(`${BASE}/index.html?cat=console`); await p.waitForSelector('#results article');
  ok((await p.getAttribute('.fab', 'href')).includes('wa.me/237600000000'), 'réglages : nouveau numéro sur le bouton flottant');
  ok((await p.getAttribute('#results article a.btn-wa >> nth=0', 'href')).includes('wa.me/237600000000'), 'réglages : nouveau numéro dans les commandes');
  await p.goto(`${BASE}/vendre-mon-appareil.html`); await p.waitForSelector('#sell');
  ok((await p.innerText('aside')).includes('Adresse test') && (await p.getAttribute('aside a[data-link=mail]', 'href')) === 'mailto:test@exemple.com', 'réglages : adresse et e-mail mis à jour sur la page Vente');
  await p.goto(`${BASE}/admin.html#/parametres`); await p.waitForSelector('#reset'); p.once('dialog', (d) => d.accept()); await p.click('#reset'); await p.waitForFunction(() => document.querySelector('#toast')?.textContent.includes('rétablies'));
  await p.goto(`${BASE}/index.html?cat=console`); await p.waitForSelector('#results article'); eq(await p.locator('#results article').count(), 6, 'réinitialisation : 6 consoles'); ok((await p.getAttribute('.fab', 'href')).includes('wa.me/237697692598'), 'réinitialisation : numéro d\'origine');
  await p.goto(`${BASE}/admin.html`); await p.click('[data-logout] >> nth=-1'); await p.waitForSelector('#login'); ok(true, 'déconnexion');
  await p.goto(`${BASE}/admin.html#/produits`); await p.waitForSelector('#login'); ok(true, 'page protégée sans session');

  // 7. Mobile : menu, drawer admin
  console.log('7. Mobile');
  const m = await ctx(390, 844);
  await m.goto(`${BASE}/index.html`); await m.click('#burger'); ok(await m.locator('#menu').isVisible(), 'menu mobile ouvert'); eq(await m.locator('#menu a').count(), 3, 'menu mobile : 3 liens');
  await m.click('#menu a[data-nav=sell]'); await m.waitForSelector('#sell'); await m.waitForTimeout(100); ok(!(await m.locator('#menu').isVisible()), 'menu fermé après navigation');
  await m.click('#burger'); await m.keyboard.press('Escape'); ok(!(await m.locator('#menu').isVisible()), 'Échap ferme le menu');
  await m.goto(`${BASE}/admin.html`); await m.click('[data-fill]'); await m.click('#login button[type=submit]'); await m.waitForSelector('[data-open]');
  await m.click('[data-open]'); await m.waitForTimeout(300); ok(await m.locator('#side a[data-nav=produits]').isVisible(), 'tiroir admin ouvert');  await m.click('#side a[data-nav=produits]'); await m.waitForTimeout(400);
  ok(!(await m.locator('#side a[data-nav=produits]').isVisible()), 'tiroir admin fermé après navigation');

  await m.goto(`${BASE}/index.html`); await m.waitForSelector('#results article');
  const small = await m.evaluate(() => [...document.querySelectorAll('.btn, .pg, .chip, .catbtn, .car-btn')].filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44 - 0.5).map((e) => `${e.className}:${Math.round(e.getBoundingClientRect().height)}`));
  eq(small.length, 0, `mobile : boutons d'au moins 44 px de haut (${small.slice(0, 3)})`);
  const cardW = await m.evaluate(() => document.querySelector('#results article').getBoundingClientRect().width); ok(cardW > 300, `mobile : carte produit pleine largeur (${Math.round(cardW)} px)`);
  await m.goto(`${BASE}/vendre-mon-appareil.html`); await m.waitForSelector('#sell');
  const bw = await m.evaluate(() => [...document.querySelectorAll('[data-send]')].map((b) => Math.round(b.getBoundingClientRect().width))); ok(bw.every((w) => w > 300), `mobile : boutons WhatsApp et e-mail pleine largeur (${bw})`);

  // 8. Ouverture directe du fichier (file://)
  console.log('8. file://');
  const f = await ctx(); const root = path.resolve(__dirname, '..');
  for (const pg of ['index', 'jeux', 'vendre-mon-appareil']) { await f.goto(`file://${root}/${pg}.html`); await f.waitForTimeout(500); }
  await f.goto(`file://${root}/index.html`); await f.waitForSelector('#results article', { timeout: 4000 }).then(() => ok(true, 'file:// : catalogue rendu'), () => ok(false, 'file:// : catalogue non rendu'));
  ok(await f.locator('.car-slide').count() === 6, 'file:// : carrousel rendu');

  ok(errs.length === 0, `erreurs console : ${JSON.stringify(errs.slice(0, 5))}`);
  await b.close();
  console.log(`\n${pass} vérifications réussies, ${fail} échec(s).`); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
