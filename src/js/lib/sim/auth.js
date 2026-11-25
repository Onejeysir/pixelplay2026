// CONNEXION DE DÉMONSTRATION (simulation). Ces identifiants sont écrits dans le code du site : ils ne protègent RIEN.
// N'importe qui peut les lire ; ne les utilisez jamais comme système de sécurité en production.
import { SESSION_KEY, storage } from './store.js';

export const DEMO_ADMIN = Object.freeze({ email: 'admin@pixelplay.cm', password: 'PixelPlay2026!' });
const TTL = 8 * 3600e3; // la session de démonstration expire après 8 h

export function signIn(email, password) {
  if (String(email ?? '').trim().toLowerCase() !== DEMO_ADMIN.email || String(password ?? '') !== DEMO_ADMIN.password) return { ok: false, error: 'Identifiant ou mot de passe incorrect.' };
  const session = { email: DEMO_ADMIN.email, full_name: 'Administrateur (démo)', role: 'admin', exp: Date.now() + TTL };
  try { storage().setItem(SESSION_KEY, JSON.stringify(session)); } catch { return { ok: false, error: 'Stockage du navigateur indisponible : connexion impossible.' }; }
  return { ok: true, session };
}
export function getSession() {
  try { const s = JSON.parse(storage().getItem(SESSION_KEY)); if (s && s.email === DEMO_ADMIN.email && s.exp > Date.now()) return s; } catch { /* session absente ou illisible */ }
  return null;
}
export const signOut = () => { try { storage().removeItem(SESSION_KEY); } catch { /* ignoré */ } };
