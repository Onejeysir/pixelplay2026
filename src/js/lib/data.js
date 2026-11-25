// CATALOGUE DE DÉMONSTRATION : tous les produits ci-dessous sont des exemples (demo:true).
// Pour passer en production : remplacez ces lignes par vos vrais produits, mettez demo:false
// et indiquez le chemin d'une vraie photo dans "image" (ex. '/assets/img/ps5.webp').
// `stock` : true/false, ou un nombre d'exemplaires (limite la quantité commandable).
// `extra` (appareils) : brand (marque), ram (mémoire), storage (stockage). Les consoles PS4/PS5 sont de marque Sony.
const p = (id, type, name, platform, variant, condition, price, stock, description, extra = {}) =>
  ({ id, type, name, platform, variant, condition, price, stock, description, image: null, demo: true, ...(type === 'console' ? { brand: 'Sony' } : {}), ...extra });
const EX = 'Exemple de démonstration.';

export const PRODUCTS = [
  p('c-ps5-std', 'console', 'PlayStation 5 Standard', 'PS5', 'PS5 Standard (lecteur)', 'Neuf', 450000, 3, 'Console PS5 avec lecteur de disque. Exemple de démonstration.'),
  p('c-ps5-dig', 'console', 'PlayStation 5 Digital Edition', 'PS5', 'PS5 Digital Edition', 'Neuf', 400000, true, 'Console PS5 sans lecteur de disque. Exemple de démonstration.'),
  p('c-ps5-slim', 'console', 'PlayStation 5 Slim', 'PS5', 'PS5 Slim', 'Occasion', 380000, false, 'Exemple de démonstration.'),
  p('c-ps4-slim', 'console', 'PlayStation 4 Slim 500 Go', 'PS4', 'PS4 Slim', 'Occasion', 120000, true, 'Exemple de démonstration.'),
  p('c-ps4-pro', 'console', 'PlayStation 4 Pro 1 To', 'PS4', 'PS4 Pro', 'Occasion', 160000, true, 'Exemple de démonstration.'),
  p('c-ps4-std', 'console', 'PlayStation 4 Standard', 'PS4', 'PS4 Standard', 'Occasion', 90000, true, 'Exemple de démonstration.'),
  p('g-gow', 'jeu-physique', 'God of War Ragnarök', 'PS5', null, 'Neuf', 25000, 2, 'Jeu sur disque. Exemple de démonstration.'),
  p('g-gt7', 'jeu-physique', 'Gran Turismo 7', 'PS4', null, 'Occasion', 12000, true, 'Jeu sur disque. Exemple de démonstration.'),
  p('g-sm2', 'jeu-physique', "Marvel's Spider-Man 2", 'PS5', null, 'Occasion', 20000, false, 'Jeu sur disque. Exemple de démonstration.'),
  p('g-tlou', 'jeu-physique', 'The Last of Us Part II', 'PS4', null, 'Occasion', 10000, true, 'Jeu sur disque. Exemple de démonstration.'),
  p('n-gow', 'jeu-numerique', 'God of War Ragnarök (numérique)', 'PS5', null, null, 22000, true, 'Produit numérique. Conditions précisées avant commande. Exemple de démonstration.'),
  p('n-gt7', 'jeu-numerique', 'Gran Turismo 7 (numérique)', 'PS4', null, null, 10000, true, 'Produit numérique. Conditions précisées avant commande. Exemple de démonstration.'),
  p('a-lap', 'appareil', 'HP portable 15" (exemple)', 'Ordinateur', null, 'Occasion', 180000, true, EX, { brand: 'HP', ram: '8 Go', storage: '256 Go SSD' }),
  p('a-lap2', 'appareil', 'Dell portable 14" (exemple)', 'Ordinateur', null, 'Occasion', 260000, true, EX, { brand: 'Dell', ram: '16 Go', storage: '512 Go SSD' }),
  p('a-lap3', 'appareil', 'Lenovo portable 15" (exemple)', 'Ordinateur', null, 'Occasion', 150000, 2, EX, { brand: 'Lenovo', ram: '8 Go', storage: '1 To HDD' }),
  p('a-lap4', 'appareil', 'Asus portable 15" (exemple)', 'Ordinateur', null, 'Neuf', 350000, 1, EX, { brand: 'Asus', ram: '16 Go', storage: '512 Go SSD' }),
  p('a-lap5', 'appareil', 'Acer portable 15" (exemple)', 'Ordinateur', null, 'Occasion', 95000, true, EX, { brand: 'Acer', ram: '4 Go', storage: '500 Go HDD' }),
  p('a-tel', 'appareil', 'Samsung smartphone 128 Go (exemple)', 'Téléphone', null, 'Occasion', 90000, true, EX, { brand: 'Samsung', ram: '6 Go', storage: '128 Go' }),
  p('a-tel2', 'appareil', 'Apple iPhone 64 Go (exemple)', 'Téléphone', null, 'Occasion', 140000, true, EX, { brand: 'Apple', storage: '64 Go' }),
  p('a-tel3', 'appareil', 'Tecno smartphone 128 Go (exemple)', 'Téléphone', null, 'Neuf', 85000, 4, EX, { brand: 'Tecno', ram: '4 Go', storage: '128 Go' }),
  p('a-tel4', 'appareil', 'Infinix smartphone 64 Go (exemple)', 'Téléphone', null, 'Neuf', 65000, true, EX, { brand: 'Infinix', ram: '4 Go', storage: '64 Go' }),
  p('a-tel5', 'appareil', 'Xiaomi smartphone 128 Go (exemple)', 'Téléphone', null, 'Occasion', 75000, false, EX, { brand: 'Xiaomi', ram: '6 Go', storage: '128 Go' }),
  p('a-tel6', 'appareil', 'Samsung smartphone 256 Go (exemple)', 'Téléphone', null, 'Neuf', 210000, 2, EX, { brand: 'Samsung', ram: '8 Go', storage: '256 Go' }),
];

export const CAT_LABEL = { ordinateur: 'Ordinateur', telephone: 'Téléphone', console: 'Console' };

// États proposés dans le formulaire « Vendre mon appareil ».
export const SELL_CONDITIONS = ['Comme neuf', 'Bon état', 'État moyen', 'À réparer / pour pièces'];

// Champs complémentaires utilisés par les tests et par le panier.
for (const p of PRODUCTS) { p.reference = p.id; p.status = !p.stock ? 'out' : typeof p.stock === 'number' && p.stock <= 3 ? 'low' : 'available'; }
