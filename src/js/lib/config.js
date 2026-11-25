// Informations commerciales centralisées : modifiez ici uniquement.
import { LIMITS } from './constants.js';

export const CONFIG = {
  brand: 'PIXEL PLAY',
  whatsapp: '237697692598',
  phoneDisplay: '+237 697 692 598',
  phoneTel: '+237697692598',
  email: 'jeysonudalric150@gmail.com', // adresse e-mail officielle : destinataire des propositions de vente envoyées par e-mail
  address: 'Bonamoussadi, face Petit Terrain',
  city: 'Douala, Cameroun',
  mapQuery: 'Bonamoussadi, face Petit Terrain, Douala, Cameroun',
  deliveryFee: null, // frais de livraison en FCFA (entier) ; null = « À confirmer »
  pageSize: 8, // nombre d'appareils par page dans le catalogue de l'accueil
  maxPerItem: 10, // quantité max par produit quand le stock n'est pas chiffré
  imageMaxDim: 1600, // côté max (px) après compression
  imageQuality: 0.82, // qualité WebP/JPEG
  uploadTimeoutMs: 60000,
  maxPhotos: LIMITS.maxPhotos,
  maxPhotoMB: LIMITS.maxMB,
  photoTypes: ['image/jpeg', 'image/png', 'image/webp'],
};
