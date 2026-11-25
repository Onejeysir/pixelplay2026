// Formulaire « Vendre mon appareil » : champs essentiels, aperçu des photos, puis envoi par WhatsApp OU par e-mail (au choix, indépendants).
// Aucun serveur : le site prépare le message, c'est le client qui l'envoie depuis WhatsApp ou sa messagerie. Rien n'est enregistré.
import { CONFIG } from '../lib/config.js';
import { SELL_CONDITIONS } from '../lib/data.js';
import { validatePhotos, validateSell } from '../lib/validation.js';
import { sellMailto, sellMessage, waUrl } from '../lib/whatsapp.js';
import { $, $$, html, mount, raw } from '../ui/html.js';
import { icon } from '../ui/icons.js';

export function initSell() {
  const root = $('#app'); if (!root) return;
  let files = [], keys = 0;

  const field = (n, label, { req, type = 'text', extra = '', hint = '' } = {}) => html`
    <div><label class="label" for="${n}">${label}${req ? html` <span class="text-bad" aria-hidden="true">*</span><span class="sr"> (obligatoire)</span>` : html` <span class="font-normal text-mute">(facultatif)</span>`}</label>
      <input class="field" id="${n}" name="${n}" type="${type}" aria-describedby="e_${n}" ${raw(extra)}>
      ${hint ? html`<p class="hint mt-1">${hint}</p>` : ''}<p class="err" id="e_${n}" role="alert"></p></div>`;

  mount(root, html`
    <form id="sell" novalidate class="grid gap-6" autocomplete="on">
      <input name="website" tabindex="-1" autocomplete="off" aria-hidden="true" class="sr" value="">
      <p class="hint">Les champs marqués <span class="text-bad" aria-hidden="true">*</span> sont obligatoires.</p>
      <fieldset class="grid gap-4 border border-line p-5 sm:p-6"><legend class="px-2 font-display text-2xl font-extrabold italic uppercase">Votre appareil</legend>
        ${field('product', 'Nom du produit ou de l\'appareil', { req: true, extra: 'maxlength="80" placeholder="Ex. HP 15, Samsung A54, PS4 Slim" autocomplete="off"' })}
        <div><label class="label" for="condition">État de l'appareil <span class="text-bad" aria-hidden="true">*</span><span class="sr"> (obligatoire)</span></label>
          <select class="field" id="condition" name="condition" aria-describedby="e_condition"><option value="">Choisir…</option>${SELL_CONDITIONS.map((o) => html`<option>${o}</option>`)}</select>
          <p class="err" id="e_condition" role="alert"></p></div>
        <div><label class="label" for="description">Description courte <span class="font-normal text-mute">(facultatif)</span></label>
          <textarea class="field" id="description" name="description" rows="3" maxlength="400" placeholder="Caractéristiques, accessoires fournis, défauts éventuels…"></textarea></div>
        ${field('price', 'Prix souhaité en FCFA', { extra: 'inputmode="numeric" placeholder="Si vous avez une idée de prix"' })}
      </fieldset>
      <fieldset class="border border-line p-5 sm:p-6"><legend class="px-2 font-display text-2xl font-extrabold italic uppercase">Photos <span class="text-base font-normal normal-case not-italic text-mute">(facultatif)</span></legend>
        <p class="hint mb-3">JPEG, PNG ou WebP · ${CONFIG.maxPhotos} photos maximum · ${CONFIG.maxPhotoMB} Mo chacune. <strong class="text-ink">Le site ne peut pas envoyer vos photos :</strong> vous les joindrez vous-même dans la conversation WhatsApp ou dans votre e-mail.</p>
        <input id="photos" class="field !p-2 file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-violet file:px-4 file:py-2 file:font-bold file:text-ink" type="file" accept="image/jpeg,image/png,image/webp" multiple aria-describedby="e_photos">
        <p class="err" id="e_photos" role="alert"></p>
        <ul id="prev" class="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5"></ul>
      </fieldset>
      <fieldset class="grid gap-4 border border-line p-5 sm:p-6"><legend class="px-2 font-display text-2xl font-extrabold italic uppercase">Vos coordonnées</legend>
        ${field('name', 'Votre nom', { req: true, extra: 'autocomplete="name"' })}
        <div class="grid gap-4 sm:grid-cols-2">
          ${field('phone', 'Téléphone', { req: true, type: 'tel', extra: 'autocomplete="tel" inputmode="tel" placeholder="6XX XX XX XX"' })}
          ${field('email', 'E-mail', { type: 'email', extra: 'autocomplete="email" inputmode="email"' })}
        </div>
        <p class="hint">Ne communiquez jamais de mot de passe ni de code de vérification. Ces informations servent uniquement à vous répondre.</p>
      </fieldset>
      <div>
        <p class="mb-3 font-semibold">Choisissez comment envoyer votre proposition :</p>
        <div class="grid gap-3 sm:grid-cols-2">
          <button type="button" class="btn btn-wa" data-send="whatsapp">${icon('wa')}Envoyer ma proposition par WhatsApp</button>
          <button type="button" class="btn" data-send="email">${icon('mail')}Envoyer ma proposition par e-mail</button>
        </div>
        <p class="hint mt-3">Rien n'est envoyé tant que vous n'avez pas appuyé sur « Envoyer » dans WhatsApp ou dans votre messagerie. Il s'agit d'une demande d'estimation : PIXEL PLAY étudie votre proposition, rien n'est acheté automatiquement.</p>
      </div>
      <div id="done" tabindex="-1" hidden class="border-2 border-violet p-5 outline-none sm:p-6"></div>
    </form>`);

  const form = $('#sell');
  const val = (k) => (form.elements[k]?.value || '').trim();
  const collect = () => ({ product: val('product'), condition: val('condition'), description: val('description'), price: val('price').replace(/[\s.]/g, ''),
    name: val('name'), phone: val('phone'), email: val('email'), photoCount: files.length });

  const showErrors = (er) => {
    $$('.err', form).forEach((p) => { if (p.id !== 'e_photos') p.textContent = ''; });
    $$('[aria-invalid]', form).forEach((i) => i.removeAttribute('aria-invalid'));
    for (const [k, m] of Object.entries(er)) { const p = $(`#e_${k}`), i = $(`#${k}`); if (p) p.textContent = m; if (i) i.setAttribute('aria-invalid', 'true'); }
  };
  const renderPhotos = () => mount($('#prev'), files.map((f) => html`<li class="relative aspect-square overflow-hidden bg-mist"><img class="h-full w-full object-cover" src="${f.preview}" alt="Aperçu de la photo ${f.n}"><button type="button" class="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink shadow-soft hover:bg-violet" data-rm="${f.key}" aria-label="Retirer la photo ${f.n}">${icon('close', 'h-4 w-4')}</button></li>`));

  function send(channel) {
    const d = collect(), er = validateSell(d);
    showErrors(er);
    const first = Object.keys(er)[0];
    if (first) { $(`#${first}`)?.focus(); $('#done').hidden = true; return; }
    if (val('website')) return; // champ piège anti-robot
    const msg = sellMessage(d, channel), url = channel === 'email' ? sellMailto(d) : waUrl(msg), n = d.photoCount;
    if (channel === 'email') location.href = url;
    else { const a = Object.assign(document.createElement('a'), { href: url, target: '_blank', rel: 'noopener noreferrer' }); document.body.append(a); a.click(); a.remove(); }
    const el = $('#done'); el.hidden = false;
    mount(el, html`
      <h2 class="!text-3xl">${channel === 'email' ? 'Votre e-mail est prêt' : 'Votre message WhatsApp est prêt'}</h2>
      <p class="prose-p mt-3">${channel === 'email'
        ? `Votre messagerie s'ouvre avec le message prérempli, adressé à ${CONFIG.email}. Relisez-le, puis envoyez-le.`
        : 'WhatsApp s\'ouvre avec le message prérempli, adressé à PIXEL PLAY. Relisez-le, puis appuyez sur « Envoyer ».'}
        ${n ? html` <strong>Pensez à joindre vos ${n} photo${n > 1 ? 's' : ''}</strong> ${channel === 'email' ? 'en pièces jointes' : 'dans la conversation'} : le site ne peut pas le faire pour vous.` : ''}</p>
      <p class="prose-p mt-2 text-mute">Votre proposition n'est transmise qu'une fois le message envoyé. Rien n'est enregistré sur ce site.</p>
      <details class="faq mt-3"><summary>Voir le message</summary><pre class="mb-4 overflow-x-auto whitespace-pre-wrap break-words bg-mist p-4 font-sans text-sm" id="msg">${msg}</pre></details>
      <div class="mt-3 flex flex-wrap gap-3">
        ${channel === 'email' ? html`<a class="btn btn-sm" href="${url}">${icon('mail')}Ouvrir mon e-mail</a>` : html`<a class="btn btn-wa btn-sm" href="${url}" target="_blank" rel="noopener noreferrer">${icon('wa')}Ouvrir WhatsApp</a>`}
        <button type="button" class="btn btn-ghost btn-sm" data-copy>Copier le message</button>
      </div>`);
    el.dataset.msg = msg; el.focus();
  }

  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('input', (e) => { const k = e.target.name; if (k && $(`#e_${k}`)?.textContent) { $(`#e_${k}`).textContent = ''; e.target.removeAttribute('aria-invalid'); } });
  form.addEventListener('change', (e) => {
    if (e.target.id !== 'photos') return;
    const { ok, errors } = validatePhotos([...e.target.files], files.length);
    files = [...files, ...ok.map((file) => ({ key: ++keys, n: 0, file, preview: URL.createObjectURL(file) }))].map((f, i) => ({ ...f, n: i + 1 }));
    $('#e_photos').textContent = errors.join(' '); e.target.value = ''; renderPhotos(); $('#done').hidden = true;
  });
  form.addEventListener('click', async (e) => {
    const s = e.target.closest('[data-send]'); if (s) { send(s.dataset.send); return; }
    const rm = e.target.closest('[data-rm]');
    if (rm) { const k = Number(rm.dataset.rm), it = files.find((f) => f.key === k); if (it) URL.revokeObjectURL(it.preview); files = files.filter((f) => f.key !== k).map((f, i) => ({ ...f, n: i + 1 })); renderPhotos(); $('#done').hidden = true; $('#photos').focus(); return; }
    const c = e.target.closest('[data-copy]');
    if (c) { try { await navigator.clipboard.writeText($('#done').dataset.msg); c.textContent = 'Message copié ✓'; } catch { c.textContent = 'Copie impossible : sélectionnez le texte'; } }
  });
  window.addEventListener('pagehide', () => files.forEach((f) => URL.revokeObjectURL(f.preview)));
}
