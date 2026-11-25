import { createCategory, deleteCategory, listCategories, updateCategory } from '../lib/sim/db.js';
import { area, empty, fld, head, html, mount, run, showErrors, $ } from './ui.js';

export async function categories(view) {
  const cats = await listCategories();
  mount(view, html`
    ${head('Catégories', 'Les 4 catégories de base pilotent l\'affichage du site : elles se renomment mais ne se suppriment pas.')}
    <div class="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div class="panel overflow-hidden"><table class="tbl"><thead><tr><th>Catégorie</th><th>Description</th><th>Produits</th><th><span class="sr">Actions</span></th></tr></thead><tbody>
        ${cats.map((c) => html`<tr data-id="${c.id}"><td data-label="Catégorie" class="font-semibold">${c.name}${c.core ? html` <span class="pill pill-new ml-1">Base</span>` : ''}</td><td data-label="Description" class="text-mute">${c.description || '—'}</td><td data-label="Produits" class="tabular-nums">${c.products}</td>
          <td data-label=""><span class="flex flex-wrap justify-end gap-x-4"><button type="button" class="linkbtn" data-edit="${c.id}">Modifier</button>${c.core ? '' : html`<button type="button" class="linkbtn danger" data-del="${c.id}">Supprimer</button>`}</span></td></tr>`)}
      </tbody></table></div>
      <form id="cf" class="panel grid h-fit content-start gap-4 p-5 sm:p-6" novalidate><h2 class="!text-2xl" id="ct">Nouvelle catégorie</h2>
        <input type="hidden" name="id" value="">
        ${fld('name', 'Nom', '', { req: true })}
        ${area('description', 'Description (facultatif)', '', { rows: 2 })}
        <div class="flex flex-wrap gap-3"><button class="btn" type="submit" id="cs">Ajouter</button><button class="btn btn-ghost hidden" type="button" id="cc">Annuler</button></div>
      </form>
    </div>`);
  const f = $('#cf'), reset = () => { f.reset(); f.elements.id.value = ''; $('#ct').textContent = 'Nouvelle catégorie'; $('#cs').textContent = 'Ajouter'; $('#cc').classList.add('hidden'); showErrors(f, {}); };
  $('#cc').onclick = reset;
  view.onclick = async (e) => {
    const ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
    if (ed) { const c = cats.find((x) => x.id === ed.dataset.edit); f.elements.id.value = c.id; f.elements.name.value = c.name; f.elements.description.value = c.description || ''; $('#ct').textContent = 'Modifier la catégorie'; $('#cs').textContent = 'Enregistrer'; $('#cc').classList.remove('hidden'); f.elements.name.focus(); }
    if (del) { const c = cats.find((x) => x.id === del.dataset.del); if (window.confirm(`Supprimer la catégorie « ${c.name} » ?`) && (await run(() => deleteCategory(c.id), 'Catégorie supprimée')).ok) categories(view); }
  };
  f.onsubmit = async (e) => {
    e.preventDefault();
    const name = f.elements.name.value.trim(); if (!name) { showErrors(f, { name: 'Le nom est obligatoire.' }); return; }
    const id = f.elements.id.value, d = f.elements.description.value;
    if ((await run(() => (id ? updateCategory(id, { name, description: d }) : createCategory({ name, description: d })), id ? 'Catégorie modifiée' : 'Catégorie ajoutée')).ok) categories(view);
  };
}
