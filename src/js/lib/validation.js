import { CONFIG } from './config.js';

export function validatePhone(v) {
  const s = String(v || '').replace(/[\s.\-()]/g, '');
  return /^(\+?237)?[236]\d{8}$/.test(s) || /^\+\d{8,15}$/.test(s);
}

export function validatePhotos(files, existing = 0) {
  const ok = [], errors = [];
  for (const f of files) {
    if (!CONFIG.photoTypes.includes(f.type)) errors.push(`« ${f.name} » : format non autorisé (JPEG, PNG ou WebP uniquement).`);
    else if (f.size > CONFIG.maxPhotoMB * 1048576) errors.push(`« ${f.name} » dépasse ${CONFIG.maxPhotoMB} Mo.`);
    else if (existing + ok.length >= CONFIG.maxPhotos) errors.push(`Maximum ${CONFIG.maxPhotos} photos.`);
    else ok.push(f);
  }
  return { ok, errors: [...new Set(errors)] };
}

export const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());

// Formulaire de vente simplifié : nom du vendeur, téléphone et appareil obligatoires ; e-mail, prix et description facultatifs.
export function validateSell(d) {
  const e = {}, need = 'Ce champ est obligatoire.';
  if (!d.product || d.product.length < 2) e.product = "Indiquez le nom de l'appareil (ex. HP 15, Samsung A54, PS4 Slim).";
  if (!d.condition) e.condition = 'Choisissez l\'état de l\'appareil.';
  if (!d.name || d.name.length < 2) e.name = 'Indiquez votre nom.';
  if (!d.phone) e.phone = need; else if (!validatePhone(d.phone)) e.phone = 'Numéro invalide (ex. 6XX XX XX XX ou +237…).';
  if (d.email && !validateEmail(d.email)) e.email = 'Adresse e-mail invalide (ex. nom@exemple.com).';
  const pr = String(d.price || '').replace(/[\s.]/g, '');
  if (pr && !/^\d+$/.test(pr)) e.price = 'Indiquez un montant en chiffres.';
  return e;
}
