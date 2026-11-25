// Pagination : fonctions pures (testées).
export function paginate(list, page = 1, size = 8) {
  const n = Math.max(1, Math.trunc(size) || 1), total = list.length, pages = Math.max(1, Math.ceil(total / n));
  const cur = Math.min(Math.max(1, Math.trunc(Number(page)) || 1), pages);
  return { items: list.slice((cur - 1) * n, cur * n), page: cur, pages, total, from: total ? (cur - 1) * n + 1 : 0, to: Math.min(cur * n, total) };
}

// Numéros affichés : toujours la première et la dernière page, la page courante et ses voisines, « … » entre les trous.
// Ex. page 5 sur 12 → [1, '…', 4, 5, 6, '…', 12].
export function pageItems(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => set.add(n));
  if (page >= pages - 2) [pages - 3, pages - 2, pages - 1].forEach((n) => set.add(n));
  const nums = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b), out = [];
  nums.forEach((n, i) => { if (i && n - nums[i - 1] > 1) out.push('…'); out.push(n); });
  return out;
}
