# Guide : modifier le site soi-même, comme un jeu

Règle d'or : **on modifie uniquement le dossier `src/` et `tailwind.config.js`**, puis on recompile.
Les fichiers à la racine (`index.html`, `jeux.html`, `assets/css`, `assets/js`…) sont **générés** : si vous les modifiez à la main, ils seront écrasés à la prochaine compilation.

## 0. Préparer le terrain (une seule fois)

1. Installer Node.js 18 ou plus (nodejs.org).
2. Ouvrir un terminal dans le dossier du site, puis : `npm install`

## 1. La boucle de jeu (à répéter)

| Étape | Commande / action |
|---|---|
| Lancer le mode live (garder ce terminal ouvert) | `npm run dev` |
| Lancer le site | 2ᵉ terminal : `npm run serve` → ouvrir http://localhost:8080 |
| Modifier un fichier dans `src/` et l'enregistrer | le site se recompile seul |
| Voir le résultat | actualiser le navigateur (F5) |
| Vous avez cassé quelque chose ? | relire la dernière modification ; `npm run build` affiche l'erreur |
| Vérifier que tout marche encore | `npm test` (doit afficher `pass 35`, `fail 0`) |

Astuce : gardez un exemplaire du dossier (copier-coller) avant une grosse modification.

---

## Niveau 1 : changer les textes et les liens

| Je veux changer… | Fichier | Quoi modifier |
|---|---|---|
| Numéro WhatsApp, téléphone, **e-mail**, adresse, carte, produits par page | `src/js/lib/config.js` | `whatsapp` (sans + ni espaces), `phoneDisplay`, `phoneTel`, `email`, `address`, `city`, `mapQuery`, `pageSize` |
| Menu du haut (noms et liens) | `src/pages/partials/header.html` | bloc `<nav id="menu">` : 3 liens (Accueil, Jeux vidéo, Vente) |
| Pied de page (très court) | `src/pages/partials/footer.html` | textes et `href` |
| Titre et texte de l'accueil | `src/pages/index.html` | texte entre les balises `<h1>`, `<p>` |
| Catégories de l'accueil (Ordinateurs, Téléphones, Consoles) et leurs filtres | `src/js/lib/devices.js` | `DEVICE_CATS`, `CHIP_FILTERS` |
| Page Vente (texte, champs du formulaire) | `src/pages/vendre-mon-appareil.html` | textes et champs |
| Texte d'une autre page | `src/pages/<nom>.html` | même principe |
| Titre dans l'onglet / description Google | haut de chaque `src/pages/*.html` | `<title>` et `<meta name="description">` |
| Produits de démonstration | `src/js/lib/data.js` (ou l'admin) | une ligne par produit : nom, prix, état, stock… |
| Logo | `assets/img/logo.png`, `logo-white.png`, `favicon.png` | remplacer par vos fichiers en gardant **le même nom** |
| Message WhatsApp d'une commande | `src/js/lib/cart.js` | texte du message |
| Message WhatsApp et e-mail « vendre mon appareil » | `src/js/lib/whatsapp.js` | `sellMessage` (texte) et `sellMailto` (objet de l'e-mail) |

Changer un lien = changer la valeur de `href`. Exemple : `<a href="jeux.html">Jeux vidéo</a>` → `<a href="https://facebook.com/votrepage" target="_blank" rel="noopener noreferrer">Facebook</a>` (pour un site externe, gardez `target` et `rel`).

⚠️ **Piège n°1 (données enregistrées)** : après avoir modifié `config.js` ou `data.js`, votre navigateur peut garder l'ancienne version, car le site enregistre ses données au premier chargement. Solution : `admin.html` → **Paramètres** → **Réinitialiser les données de démonstration** (ou vider les données du site dans le navigateur).

⚠️ **Piège n°2** : ne jamais enlever les mots entre doubles accolades comme `{{icon:wa}}` ou `{{waGeneric}}` : ce sont des emplacements remplis automatiquement à la compilation.

---

## Niveau 2 : changer les couleurs et l'aspect

### Les couleurs : un seul endroit
Ouvrez **`tailwind.config.js`**, bloc `colors`. Changez le code hexadécimal (`#A78BFA`), enregistrez : tout le site change (boutons, fonds, illustrations, couleur de la barre du téléphone).

| Nom | Où on le voit |
|---|---|
| `violet` (DEFAULT, `#A78BFA`) | boutons, bandeau d'accueil, éléments actifs : le texte dessus est **anthracite** (le blanc serait illisible) |
| `violet-hover` | survol des boutons |
| `violet-deep` (`#6D4BD8`) | liens et textes violets sur fond clair (contraste conforme) |
| `violet-lav`, `violet-soft`, `violet-mid` | fonds de cartes, survols, filets |
| `ink` | texte principal |
| `mist`, `line`, `mute` | gris : fonds, bordures, texte secondaire |
| `wa` | vert WhatsApp (à garder réservé à WhatsApp) |

Dans une page, on utilise ces noms comme classes : `bg-violet` (fond), `text-violet` (texte), `border-violet` (bordure). Exemple : `<div class="bg-violet-lav text-ink">`.

Contrôlez toujours le contraste (texte lisible sur le fond) : un violet clair avec du texte blanc est illisible sur téléphone au soleil. Si vous éclaircissez encore le violet, gardez le texte anthracite dessus.

### Les polices
`tailwind.config.js`, bloc `fontFamily` : `display` = titres (Barlow Condensed), `sans` = textes (Inter). Les fichiers sont dans `assets/fonts/` ; pour une autre police, ajouter le fichier `.woff2` et sa déclaration `@font-face` en haut de `src/css/tailwind.css`.

### Le style des boutons, cartes, champs
`src/css/tailwind.css`, section `components` : `.btn` (bouton violet arrondi), `.btn-wa`, `.btn-ghost`, `.btn-sm`, `.chip`, `.pg` (pagination), `.card`, `.field`… Modifier une classe là change tous les boutons (ou cartes) d'un coup. Les ombres des boutons sont dans `tailwind.config.js` (`boxShadow`). Les boutons ont un survol, un effet au clic, un état désactivé et mesurent au moins 44 px de haut (tactile).

### Les petits réglages directement dans une page
Chaque élément porte des classes Tailwind lisibles : `text-lg` (texte plus grand), `font-bold` (gras), `mt-8` (marge au-dessus), `py-12` (espace haut et bas), `rounded-none` (coins droits). Changez-les, enregistrez, actualisez.

---

## Niveau 3 : le responsive (téléphone, tablette, ordinateur)

Tailwind fonctionne **mobile d'abord** : une classe sans préfixe s'applique partout, et un préfixe l'applique **à partir** d'une largeur.

| Préfixe | S'applique à partir de |
|---|---|
| (aucun) | tous les écrans, dont 320 px |
| `min-[480px]:` | grands téléphones |
| `sm:` | 640 px |
| `md:` | 768 px (tablette) |
| `lg:` | 1024 px (petit ordinateur) |
| `xl:` | 1280 px |

Exemple réel de ce site (grille des produits) :

```html
grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
```
= 1 colonne sur petit téléphone, 2 dès 480 px, 3 dès 1024 px, 4 dès 1280 px. Pour 3 colonnes dès la tablette : ajouter `md:grid-cols-3`.

Autres exemples : `hidden lg:flex` (caché sur téléphone, visible sur ordinateur), `py-8 md:py-16` (petit espace sur mobile, grand sur ordinateur), `text-base md:text-lg`.

Où sont les grilles : accueil et jeux → `src/js/pages/catalog.js` (grille des produits, pagination) ; carrousel de l'accueil → `src/js/pages/home.js` ; cartes produit → `src/js/ui/card.js`.

### Tester sans téléphone
Dans Chrome ou Edge : touche **F12**, puis **Ctrl + Shift + M** (mode appareil). Choisissez une largeur (320, 375, 768…) ou faites glisser le bord. Vérifiez à chaque fois : aucun texte coupé, **aucune barre de défilement horizontale**, boutons faciles à toucher.

---

## Mini-quêtes pour s'entraîner

1. **Facile** : changer le titre de l'accueil (`src/pages/index.html`, balise `<h1>`).
2. **Facile** : changer le numéro WhatsApp dans `config.js`, puis réinitialiser les données dans l'admin.
3. **Moyen** : ajouter un lien « Facebook » dans le menu (`partials/header.html`, recopier une ligne `<a class="navlink" …>`).
4. **Moyen** : passer le violet principal à une autre teinte dans `tailwind.config.js`.
5. **Avancé** : afficher 3 colonnes de produits sur tablette (`md:grid-cols-3` dans `catalog.js`).

## Ce qu'il ne faut pas faire
- Éditer les fichiers générés à la racine.
- Mettre un mot de passe ou une clé secrète dans le code du site (il est lisible par tous).
- Supprimer les `{{ … }}` des fichiers `src/pages`.
- Utiliser le vert WhatsApp pour autre chose que WhatsApp.
