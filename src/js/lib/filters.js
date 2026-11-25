import { deviceCat } from './devices.js';
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// f : q, cat (catégorie d'appareil), platform, brand, ram, storage, condition, variant, minPrice, maxPrice, inStock, sort.
export function filterProducts(list, f = {}) {
  let r = list.filter((p) =>
    (!f.q || norm(`${p.name} ${p.variant || ''} ${p.brand || ''}`).includes(norm(f.q))) &&
    (!f.cat || deviceCat(p) === f.cat) &&
    (!f.platform || p.platform === f.platform) && (!f.brand || p.brand === f.brand) &&
    (!f.ram || p.ram === f.ram) && (!f.storage || p.storage === f.storage) && (!f.condition || p.condition === f.condition) &&
    (!f.variant || p.variant === f.variant) && (!f.minPrice || p.price >= +f.minPrice) &&
    (!f.maxPrice || p.price <= +f.maxPrice) && (!f.inStock || p.stock));
  if (f.sort === 'asc') r = [...r].sort((a, b) => a.price - b.price);
  if (f.sort === 'desc') r = [...r].sort((a, b) => b.price - a.price);
  return r;
}
