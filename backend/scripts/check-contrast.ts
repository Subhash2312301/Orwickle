// WCAG Contrast Calculation Script
// Standard WCAG 2.1 relative luminance calculation

function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return [r, g, b];
}

function luminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function contrast(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const lum1 = luminance(rgb1[0], rgb1[1], rgb1[2]);
  const lum2 = luminance(rgb2[0], rgb2[1], rgb2[2]);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

const tokens = {
  light: {
    'color-bg': '#F3EFE6',
    'color-surface': '#FBF9F4',
    'color-ink': '#14110F',
    'color-ink-muted': '#5B554C',
    'color-rule': '#D9D2C3',
    'color-signal': '#D9381E',
    'color-error': '#8E281B',
    'color-success': '#1F6F5C',
    'color-caution': '#B7791F',
  },
  dark: {
    'color-bg': '#0F1512',
    'color-surface': '#161E1A',
    'color-ink': '#ECE6D8',
    'color-ink-muted': '#A39C8D',
    'color-rule': '#2A3530',
    'color-signal': '#FF6A3D',
    'color-error': '#E05A47',
    'color-success': '#2EA083',
    'color-caution': '#D4902A',
  }
};

const checks = [
  // Light Mode checks
  { theme: 'Light', fgToken: 'color-ink', fgHex: tokens.light['color-ink'], bgToken: 'color-bg', bgHex: tokens.light['color-bg'] },
  { theme: 'Light', fgToken: 'color-ink', fgHex: tokens.light['color-ink'], bgToken: 'color-surface', bgHex: tokens.light['color-surface'] },
  { theme: 'Light', fgToken: 'color-ink-muted', fgHex: tokens.light['color-ink-muted'], bgToken: 'color-bg', bgHex: tokens.light['color-bg'] },
  { theme: 'Light', fgToken: 'color-ink-muted', fgHex: tokens.light['color-ink-muted'], bgToken: 'color-surface', bgHex: tokens.light['color-surface'] },
  { theme: 'Light', fgToken: 'color-rule', fgHex: tokens.light['color-rule'], bgToken: 'color-bg', bgHex: tokens.light['color-bg'] },
  { theme: 'Light', fgToken: 'color-error', fgHex: tokens.light['color-error'], bgToken: 'color-bg', bgHex: tokens.light['color-bg'] },
  { theme: 'Light', fgToken: 'color-error', fgHex: tokens.light['color-error'], bgToken: 'color-surface', bgHex: tokens.light['color-surface'] },
  { theme: 'Light', fgToken: 'color-success', fgHex: tokens.light['color-success'], bgToken: 'color-bg', bgHex: tokens.light['color-bg'] },
  { theme: 'Light', fgToken: 'color-signal', fgHex: tokens.light['color-signal'], bgToken: 'color-bg', bgHex: tokens.light['color-bg'] },
  { theme: 'Light', fgToken: 'color-caution', fgHex: tokens.light['color-caution'], bgToken: 'color-bg', bgHex: tokens.light['color-bg'] },

  // Dark Mode checks
  { theme: 'Dark', fgToken: 'color-ink', fgHex: tokens.dark['color-ink'], bgToken: 'color-bg', bgHex: tokens.dark['color-bg'] },
  { theme: 'Dark', fgToken: 'color-ink', fgHex: tokens.dark['color-ink'], bgToken: 'color-surface', bgHex: tokens.dark['color-surface'] },
  { theme: 'Dark', fgToken: 'color-ink-muted', fgHex: tokens.dark['color-ink-muted'], bgToken: 'color-bg', bgHex: tokens.dark['color-bg'] },
  { theme: 'Dark', fgToken: 'color-ink-muted', fgHex: tokens.dark['color-ink-muted'], bgToken: 'color-surface', bgHex: tokens.dark['color-surface'] },
  { theme: 'Dark', fgToken: 'color-rule', fgHex: tokens.dark['color-rule'], bgToken: 'color-bg', bgHex: tokens.dark['color-bg'] },
  { theme: 'Dark', fgToken: 'color-error', fgHex: tokens.dark['color-error'], bgToken: 'color-bg', bgHex: tokens.dark['color-bg'] },
  { theme: 'Dark', fgToken: 'color-error', fgHex: tokens.dark['color-error'], bgToken: 'color-surface', bgHex: tokens.dark['color-surface'] },
  { theme: 'Dark', fgToken: 'color-signal', fgHex: tokens.dark['color-signal'], bgToken: 'color-bg', bgHex: tokens.dark['color-bg'] },
  { theme: 'Dark', fgToken: 'color-success', fgHex: tokens.dark['color-success'], bgToken: 'color-bg', bgHex: tokens.dark['color-bg'] },
  { theme: 'Dark', fgToken: 'color-caution', fgHex: tokens.dark['color-caution'], bgToken: 'color-bg', bgHex: tokens.dark['color-bg'] },
];

console.log('='.repeat(105));
console.log('ORWICKLE DEALROOM DOSSIER — WCAG 2.1 RELATIVE LUMINANCE & CONTRAST VERIFICATION');
console.log('='.repeat(105));
console.log(
  'Theme'.padEnd(8) +
  'Foreground Token (Hex)'.padEnd(28) +
  'Background Token (Hex)'.padEnd(28) +
  'Ratio'.padEnd(10) +
  'WCAG AA'.padEnd(12) +
  'Usage Policy'
);
console.log('-'.repeat(105));

for (const c of checks) {
  const ratio = contrast(c.fgHex, c.bgHex);
  const ratioStr = ratio.toFixed(2) + ':1';
  let status = '';
  let policy = '';

  if (ratio >= 7.0) {
    status = 'Pass (AAA)';
    policy = 'Unrestricted text, headlines, components';
  } else if (ratio >= 4.5) {
    status = 'Pass (AA)';
    policy = 'Standard body text, captions, components';
  } else if (ratio >= 3.0) {
    status = 'Restricted';
    policy = 'Non-text components, borders, ≥24px bold text only';
  } else {
    status = 'Fail (Text)';
    policy = 'Prohibited for text/components; decorative rules only';
  }

  console.log(
    c.theme.padEnd(8) +
    `${c.fgToken} (${c.fgHex})`.padEnd(28) +
    `${c.bgToken} (${c.bgHex})`.padEnd(28) +
    ratioStr.padEnd(10) +
    status.padEnd(12) +
    policy
  );
}
console.log('='.repeat(105));
