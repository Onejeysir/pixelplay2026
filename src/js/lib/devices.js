// Catégories d'appareils de l'accueil : ordinateurs, téléphones, consoles. Fonctions pures (testées).
export const DEVICE_CATS = [
  { key: 'ordinateur', label: 'Ordinateurs', short: 'Ordinateur' },
  { key: 'telephone', label: 'Téléphones', short: 'Téléphone' },
  { key: 'console', label: 'Consoles de jeux', short: 'Console' },
];
export const CAT_KEYS = DEVICE_CATS.map((c) => c.key);

// Catégorie d'un produit : « console » pour les consoles PS4/PS5, sinon déduite du type d'appareil. null = pas un appareil.
export function deviceCat(p) {
  if (!p) return null;
  if (p.type === 'console') return 'console';
  if (p.type !== 'appareil') return null;
  const t = String(p.platform || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (t.startsWith('ordinateur')) return 'ordinateur';
  if (t.startsWith('telephone')) return 'telephone';
  if (t.startsWith('console')) return 'console';
  return null;
}
export const isDevice = (p) => deviceCat(p) !== null;

// Filtres proposés selon la catégorie sélectionnée : [champ du produit, libellé]. Un filtre n'est affiché que s'il offre un vrai choix (2 valeurs ou plus).
export const CHIP_FILTERS = {
  all: [['brand', 'Marque'], ['condition', 'État']],
  ordinateur: [['brand', 'Marque'], ['ram', 'Mémoire RAM'], ['storage', 'Stockage'], ['condition', 'État']],
  telephone: [['brand', 'Marque'], ['storage', 'Stockage'], ['condition', 'État']],
  console: [['brand', 'Marque'], ['platform', 'Génération'], ['condition', 'État']],
};
export const chipFilters = (cat) => CHIP_FILTERS[cat] || CHIP_FILTERS.all;

// Valeurs distinctes d'un champ (tri naturel : 8 Go avant 16 Go).
export const distinct = (list, key) =>
  [...new Set(list.map((p) => p[key]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'fr', { numeric: true }));
