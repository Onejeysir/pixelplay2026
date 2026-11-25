import { CONFIG } from './config.js';
export const formatPrice = (n) => new Intl.NumberFormat('fr-FR').format(n).replace(/[\u202f\u00a0]/g, ' ') + ' FCFA';
export const waUrl = (text) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;
export const GENERIC = "Bonjour PIXEL PLAY, j'ai une question.";
export const TYPE_LABEL = { 'jeu-numerique': 'Numérique', 'jeu-physique': 'Disque', console: 'Console', appareil: 'Appareil' };
const join = (a) => a.filter((x) => x != null && x !== false).join('\n');

// Proposition de vente d'un appareil. channel : 'whatsapp' (défaut) ou 'email' (change seulement la phrase sur les photos).
// d : { name, phone, email?, product, condition, price?, description?, photoCount }.
export function sellMessage(d, channel = 'whatsapp') {
  const n = d.photoCount || 0, where = channel === 'email' ? 'cet e-mail' : 'cette conversation WhatsApp';
  return join(['Bonjour PIXEL PLAY,', '', 'Je souhaite proposer un appareil pour estimation et éventuel rachat.', '',
    'INFORMATIONS DU VENDEUR', `- Nom : ${d.name}`, `- Téléphone : ${d.phone}`, d.email ? `- E-mail : ${d.email}` : null, '',
    "INFORMATIONS DE L'APPAREIL", `- Appareil : ${d.product}`, `- État : ${d.condition}`,
    `- Prix souhaité : ${d.price ? formatPrice(d.price) : 'non renseigné'}`, d.description ? `- Description : ${d.description}` : null, '',
    'PHOTOS', `- Nombre d'images sélectionnées : ${n}`, n ? `- Je les joins dans ${where}.` : null, '',
    'Merci d\'étudier ma proposition et de me communiquer une estimation.']);
}

// Lien mailto prérempli (le client relit et envoie depuis sa messagerie ; les photos se joignent à la main).
export function sellMailto(d, to = CONFIG.email) {
  const subject = `Proposition de vente : ${String(d.product).slice(0, 80)}`;
  const body = sellMessage(d, 'email').replace(/\n/g, '\r\n');
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
