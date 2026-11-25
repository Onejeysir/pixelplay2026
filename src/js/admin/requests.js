import { REQUEST_STATUS, fmtDate, toWaNumber } from '../lib/admin.js';
import { CAT_LABEL } from '../lib/data.js';
import { deleteRequest, getRequest, listRequests, updateRequest } from '../lib/sim/db.js';
import { empty, formatPrice, head, html, mount, run, $ } from './ui.js';

const pill = (s) => html`<span class="pill ${s === 'new' ? 'pill-new' : s === 'accepted' ? 'pill-ok' : 'pill-ko'}">${REQUEST_STATUS[s]}</span>`;

export async function requestList(view) {
  const reqs = await listRequests(); let flt = '';
  mount(view, html`${head('Demandes de rachat', 'Demandes d\'estimation enregistrées dans ce navigateur (formulaire « Vendre mon appareil »).')}
    <div class="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut" id="chips"></div><div id="rows"></div>`);
  const chips = () => mount($('#chips'), html`${[['', `Toutes (${reqs.length})`], ...Object.entries(REQUEST_STATUS).map(([k, l]) => [k, `${l} (${reqs.filter((r) => r.status === k).length})`])].map(([k, l]) => html`<button type="button" class="chip" data-f="${k}" aria-pressed="${String(flt === k)}">${l}</button>`)}`);
  const rows = () => {
    const l = reqs.filter((r) => !flt || r.status === flt);
    mount($('#rows'), l.length ? html`<div class="panel overflow-hidden"><table class="tbl"><thead><tr><th>Date</th><th>Référence</th><th>Client</th><th>Appareil</th><th>Statut</th><th><span class="sr">Ouvrir</span></th></tr></thead><tbody>
      ${l.map((r) => html`<tr><td data-label="Date" class="whitespace-nowrap">${fmtDate(r.created_at)}</td><td data-label="Référence" class="font-mono text-sm">${r.reference}${r.demo ? ' (démo)' : ''}</td><td data-label="Client"><span class="block font-semibold">${r.customer_name}</span><span class="block text-sm text-mute">${r.phone}</span></td><td data-label="Appareil">${CAT_LABEL[r.device_type] || r.device_type} · ${r.brand} ${r.model}</td><td data-label="Statut">${pill(r.status)}</td><td data-label=""><a class="btn btn-sm btn-ghost" href="#/demandes/${r.id}">Ouvrir</a></td></tr>`)}</tbody></table></div>` : empty('Aucune demande.', 'Les demandes envoyées depuis le formulaire public apparaissent ici (sur ce navigateur).', html`<a class="btn btn-sm" href="vendre-mon-appareil.html">Tester le formulaire</a>`));
  };
  chips(); rows();
  view.onclick = (e) => { const c = e.target.closest('[data-f]'); if (c) { flt = c.dataset.f; chips(); rows(); } };
}

export async function requestDetail(view, id, go) {
  let r; try { r = await getRequest(id); } catch { mount(view, html`${head('Demande introuvable')}<p class="mt-4"><a class="btn" href="#/demandes">Retour</a></p>`); return; }
  view.dataset.form = '1';
  const wa = toWaNumber(r.phone), msg = `Bonjour ${r.customer_name}, ici PIXEL PLAY. Concernant votre demande ${r.reference} (${r.brand} ${r.model}) :`;
  const specs = Object.entries(r.specifications || {});
  mount(view, html`
    <p class="mb-3"><a class="link" href="#/demandes">← Demandes de rachat</a></p>
    ${head(`${r.brand} ${r.model}`, `Référence ${r.reference} · reçue le ${fmtDate(r.created_at)}`, pill(r.status))}
    <div class="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div class="grid gap-6">
        <section class="panel p-5 sm:p-6"><h2 class="!text-2xl">Client</h2>
          <dl class="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[0.9375rem]"><dt class="font-semibold">Nom</dt><dd>${r.customer_name}</dd><dt class="font-semibold">Téléphone</dt><dd>${r.phone}</dd><dt class="font-semibold">Localisation</dt><dd>${r.location || '—'}</dd></dl></section>
        <section class="panel p-5 sm:p-6"><h2 class="!text-2xl">Appareil</h2>
          <dl class="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[0.9375rem]"><dt class="font-semibold">Catégorie</dt><dd>${CAT_LABEL[r.device_type] || r.device_type}</dd><dt class="font-semibold">État général</dt><dd>${r.condition || '—'}</dd><dt class="font-semibold">Prix souhaité</dt><dd>${r.expected_price ? formatPrice(r.expected_price) : 'non renseigné'}</dd>
          ${specs.map(([k, v]) => html`<dt class="font-semibold">${k}</dt><dd class="break-words">${v}</dd>`)}</dl>
          ${r.description ? html`<p class="mt-4 border-t border-line pt-4 text-mute">${r.description}</p>` : ''}</section>
        <section class="panel p-5 sm:p-6"><h2 class="!text-2xl">Photos (${r.photos.length})</h2>
          ${r.photos.length ? html`<ul class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">${r.photos.map((p, i) => html`<li><button type="button" class="block w-full cursor-zoom-in" data-photo="${p.url}" aria-label="Agrandir la photo ${i + 1}"><img class="aspect-square w-full object-cover" src="${p.url}" alt="Photo ${i + 1} de l'appareil"></button></li>`)}</ul>` : html`<p class="mt-3 text-mute">Aucune photo enregistrée dans ce navigateur. Le client les joint dans la conversation WhatsApp.</p>`}</section>
      </div>
      <form id="rf" class="panel grid h-fit content-start gap-4 p-5 sm:p-6"><h2 class="!text-2xl">Traitement</h2>
        <div><label class="label" for="status">Statut</label><select class="field" id="status">${Object.entries(REQUEST_STATUS).map(([k, l]) => html`<option value="${k}" ${r.status === k ? 'selected' : ''}>${l}</option>`)}</select></div>
        <div><label class="label" for="notes">Note interne</label><textarea class="field" id="notes" rows="5" maxlength="2000">${r.internal_notes}</textarea><p class="hint mt-1">Visible uniquement ici.</p></div>
        <button class="btn" type="submit">Enregistrer</button>
        ${wa ? html`<a class="btn btn-wa" href="https://wa.me/${wa}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener noreferrer"><svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2z"/></svg>Contacter sur WhatsApp</a>` : ''}
        <button type="button" class="linkbtn danger justify-self-start" id="del">Supprimer cette demande</button>
      </form>
    </div>
    <dialog id="lb" aria-label="Photo agrandie"><form method="dialog" class="flex justify-end bg-ink"><button class="px-4 py-3 font-semibold text-white" aria-label="Fermer">Fermer ×</button></form><img id="lbimg" class="max-h-[80vh] w-full object-contain" alt="Photo agrandie"></dialog>`);
  view.onclick = (e) => { const b = e.target.closest('[data-photo]'); if (b) { $('#lbimg').src = b.dataset.photo; $('#lb').showModal(); } };
  $('#rf').onsubmit = async (e) => { e.preventDefault(); await run(() => updateRequest(id, { status: $('#status').value, internal_notes: $('#notes').value }), 'Demande mise à jour'); };
  $('#del').onclick = async () => { if (window.confirm('Supprimer cette demande et ses photos ?') && (await run(() => deleteRequest(id), 'Demande supprimée')).ok) go('#/demandes'); };
}
