import { Colors } from '@/constants/theme';

function luminance(hex: string) {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// WCAG AA: 4.5:1 for body text.
const textPairs = [
  ['text', 'background'],
  ['text', 'surface'],
  ['textSecondary', 'background'],
  ['textSecondary', 'surface'],
  ['accentText', 'background'],
  ['accentText', 'surface'],
  ['onPrimary', 'primary'],
  ['onPrimary', 'primaryPressed'],
  ['onChip', 'chip'],
  ['danger', 'background'],
  ['success', 'background'],
] as const;

describe.each(['light', 'dark'] as const)('%s palette', (scheme) => {
  it.each(textPairs)('%s on %s meets AA contrast', (fg, bg) => {
    const colors = Colors[scheme];
    expect(contrast(colors[fg], colors[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it('defines the same tokens as the other scheme', () => {
    expect(Object.keys(Colors[scheme]).sort()).toEqual(Object.keys(Colors.light).sort());
  });
});
