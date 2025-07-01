// Definiamo le tonalità che vogliamo supportare
export type ColorShade = '400' | '700' | '800';

// Definiamo la struttura di ogni colore di base
export interface ProjectColor {
  name: string; // Es. "Blu"
  base: string; // Es. "blue"
  shades: {
    [key in ColorShade]: string; // Es. { 400: 'bg-blue-400', 700: 'bg-blue-700', ... }
  };
  hex: {
    [key in ColorShade]: string; // Es. { 400: '#60a5fa', 700: '#1d4ed8', ... }
  };
}

// La nostra palette di colori completa di tutte le gradazioni
export const projectColorPalette: ProjectColor[] = [
  { name: 'Pietra', base: 'stone', shades: { '400': 'bg-stone-400', '700': 'bg-stone-700', '800': 'bg-stone-800' }, hex: { '400': '#a8a29e', '700': '#44403c', '800': '#292524' }},
  { name: 'Rosso', base: 'red', shades: { '400': 'bg-red-400', '700': 'bg-red-700', '800': 'bg-red-800' }, hex: { '400': '#f87171', '700': '#b91c1c', '800': '#991b1b' }},
  { name: 'Arancione', base: 'orange', shades: { '400': 'bg-orange-400', '700': 'bg-orange-700', '800': 'bg-orange-800' }, hex: { '400': '#fb923c', '700': '#c2410c', '800': '#9a3412' }},
  { name: 'Verde', base: 'green', shades: { '400': 'bg-green-400', '700': 'bg-green-700', '800': 'bg-green-800' }, hex: { '400': '#4ade80', '700': '#15803d', '800': '#14532d' }},
  { name: 'Blu', base: 'blue', shades: { '400': 'bg-blue-400', '700': 'bg-blue-700', '800': 'bg-blue-800' }, hex: { '400': '#60a5fa', '700': '#1d4ed8', '800': '#1e40af' }},
  { name: 'Viola', base: 'purple', shades: { '400': 'bg-purple-400', '700': 'bg-purple-700', '800': 'bg-purple-800' }, hex: { '400': '#a78bfa', '700': '#7e22ce', '800': '#6b21a8' }},
  { name: 'Rosa', base: 'rose', shades: { '400': 'bg-rose-400', '700': 'bg-rose-700', '800': 'bg-rose-800' }, hex: { '400': '#f472b6', '700': '#be123c', '800': '#9f1239' }},
];

// Funzione helper per ottenere un colore specifico, che useremo più tardi
export const getColor = (baseColor: string, shade: ColorShade): { hex: string, bgClass: string } => {
    const color = projectColorPalette.find(c => c.base === baseColor);
    if (!color) { // Se non troviamo il colore, usiamo un grigio di default
        return { hex: '#9ca3af', bgClass: 'bg-gray-400' };
    }
    return { hex: color.hex[shade], bgClass: color.shades[shade] };
};