import { isPersistent } from '../lib/sim/store.js';
import { counts, getSettings, resetDemoData, saveSettings } from '../lib/sim/db.js';
import { fld, head, html, mount, run, showErrors, toast, $ } from './ui.js';

export async function settings(view, go) {
  const s = await getSettings(), c = await counts();
  view.dataset.form = '1';
  mount(view, html`
    ${head('Paramètres', 'Coordonnées affichées sur le site et utilisées pour les commandes WhatsApp.')}
    <div class="grid gap-6 xl:grid-cols-[1fr_380px]">
      <form id="sf" class="panel grid gap-4 p-5 sm:grid-cols-2 sm:p-6" novalidate>
        ${fld('business_name', 'Nom commercial', s.business_name, { req: true, cls: 'sm:col-span-2' })}
        ${fld('whatsapp', 'Numéro WhatsApp', s.whatsapp, { req: true, attrs: 'inputmode="numeric"', hint: 'Format international sans « + » ni espaces (ex. 237697692598).' })}
        ${fld('phone', 'Téléphone affiché', s.phone, { req: true, type: 'tel' })}
        ${fld('email', 'E-mail officiel', s.email || '', { type: 'email', hint: 'Destinataire des propositions de vente envoyées par e-mail.' })}
        ${fld('address', 'Adresse', s.address, { req: true, cls: 'sm:col-span-2' })}
        ${fld('city', 'Ville et pays', s.city, { req: true })}
        ${fld('map_query', 'Recherche cartographique', s.map_query, { req: true, hint: 'Texte envoyé à Google Maps pour « Voir sur la carte ».' })}
        ${fld('stock_alert_default', "Seuil d'alerte par défaut", s.stock_alert_default, { req: true, type: 'number', attrs: 'min="0" inputmode="numeric"' })}
        <div class="sm:col-span-2"><button class="btn" type="submit">Enregistrer les paramètres</button></div>
      </form>
      <div class="grid h-fit gap-6">
        <section class="panel p-5 sm:p-6"><h2 class="!text-2xl">Données de démonstration</h2>
          <p class="mt-3 text-[0.9375rem] text-mute">${c.products} produits · ${c.categories} catégories · ${c.requests} demandes, enregistrés ${isPersistent() ? 'dans ce navigateur (LocalStorage et IndexedDB)' : 'en mémoire seulement (stockage du navigateur indisponible)'}.</p>
          <p class="mt-3 text-[0.9375rem] text-mute">Ils persistent après actualisation mais ne sont <strong class="text-ink">pas partagés</strong> entre visiteurs ni entre appareils.</p>
          <button type="button" class="btn btn-ghost mt-4" id="reset">Réinitialiser les données de démonstration</button></section>
        <section class="panel p-5 sm:p-6"><h2 class="!text-2xl">Sécurité</h2><p class="mt-3 text-[0.9375rem] text-mute">L'identifiant et le mot de passe de démonstration sont écrits dans le code du site : <strong class="text-ink">ils ne protègent rien</strong>. Avant une mise en ligne réelle, remplacez cette simulation par un vrai serveur avec authentification.</p></section>
      </div>
    </div>`);
  $('#sf').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target, v = Object.fromEntries(new FormData(f)), er = {};
    for (const k of ['business_name', 'phone', 'address', 'city', 'map_query']) if (!v[k].trim()) er[k] = 'Ce champ est obligatoire.';
    if (v.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) er.email = 'Adresse e-mail invalide.';
    if (!/^\d{8,15}$/.test(v.whatsapp.trim())) er.whatsapp = '8 à 15 chiffres, sans espace ni « + ».';
    if (!/^\d+$/.test(v.stock_alert_default.trim())) er.stock_alert_default = 'Nombre entier (0 ou plus).';
    showErrors(f, er); if (Object.keys(er).length) return;
    await run(() => saveSettings(Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x.trim()]))), 'Paramètres enregistrés');
  };
  $('#reset').onclick = async () => {
    if (!window.confirm('Réinitialiser toutes les données de démonstration ? Vos produits, images, demandes et réglages seront remplacés par les exemples.')) return;
    if ((await run(() => resetDemoData(), 'Données de démonstration rétablies')).ok) go('#/');
  };
}
