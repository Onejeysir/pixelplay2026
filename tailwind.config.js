/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/pages/**/*.html', './src/js/**/*.js'],
  theme: {
    extend: {
      // ★ COULEURS : modifiez uniquement ici, puis `npm run build`. Tout le site (pages, CSS, illustrations) les reprend.
      colors: {
        ink: '#26242E', // texte anthracite, pied de page, menu admin
        violet: {
          DEFAULT: '#A78BFA', // violet clair de la marque : boutons, bandeau d'accueil, éléments actifs (texte anthracite dessus)
          hover: '#B9A2FC', // survol des boutons (un peu plus lumineux)
          deep: '#6D4BD8', // violet soutenu pour les liens et textes sur fond clair (contraste AA)
          dark: '#352C5C', // texte sur fond lavande, illustrations
          lav: '#F3EFFE', // lavande très claire : fonds de sections et de cartes
          soft: '#E4DBFD', mid: '#C4B5FD', // survols, filets, accents
        },
        mist: '#F6F6F8', // gris très clair : fonds et séparations
        line: '#E4E2EA', // filets et bordures
        edge: '#8E8A9E', // bordure des champs (contraste >= 3:1)
        mute: '#666473', // texte secondaire
        fog: '#D5D2E0', fog2: '#B9B6C4', // textes sur fond sombre
        wa: { DEFAULT: '#25D366', hover: '#1FBD5B' }, // vert WhatsApp : réservé aux éléments WhatsApp
        ok: { DEFAULT: '#17703A', bg: '#E8F5EC' },
        warn: { DEFAULT: '#8A4A00', bg: '#FFF4E5', note: '#FFF9ED' },
        bad: { DEFAULT: '#B3261E', bg: '#FDECEA' },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', '"Arial Narrow"', 'Arial', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'Arial', 'sans-serif'],
      },
      maxWidth: { page: '1200px' },
      boxShadow: { // ombres légères des boutons
        btn: '0 6px 14px -6px rgba(109,75,216,.55)', btnh: '0 10px 20px -8px rgba(109,75,216,.6)',
        wa: '0 6px 14px -6px rgba(37,211,102,.65)', wah: '0 10px 20px -8px rgba(37,211,102,.7)',
        soft: '0 4px 14px -4px rgba(38,36,46,.25)',
      },
    },
  },
  plugins: [],
};
