// État partagé du site : catalogue courant (lu dans la base simulée) + réglages. Rechargé à chaque modification (même depuis un autre onglet).
import { CONFIG } from '../lib/config.js';
import { applySettings } from '../lib/product.js';
import { loadCatalog, readSettings } from '../lib/sim/db.js';
import { subscribe } from '../lib/sim/store.js';

export const state = { products: [], ready: false, error: null };
const fns = new Set();
export const onCatalog = (f) => { fns.add(f); return () => fns.delete(f); };

export async function loadAll() {
  try { applySettings(CONFIG, readSettings()); state.products = await loadCatalog(); state.error = null; }
  catch (e) { state.products = []; state.error = e?.message || 'Catalogue indisponible.'; }
  state.ready = true;
  fns.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
}
export function startSync() { let t; subscribe(() => { clearTimeout(t); t = setTimeout(loadAll, 60); }); }
