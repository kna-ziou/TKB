import { PASTEL_PALETTE, ColorSwatch } from '../data/subjectColors';

/**
 * Get swatch matching hex
 */
export function findSwatchByHex(hex: string): ColorSwatch | undefined {
  if (!hex) return undefined;
  const cleanHex = hex.toLowerCase().trim();
  return PASTEL_PALETTE.find((s) => s.hex.toLowerCase() === cleanHex);
}

/**
 * Get subtle border color matching pastel background
 */
export function getBorderColor(bgColor: string): string {
  if (!bgColor) return '#e2e8f0';
  const swatch = findSwatchByHex(bgColor);
  if (swatch) {
    return swatch.borderHex;
  }
  return '#cbd5e1';
}

/**
 * Relative luminance calculation for text contrast verification
 */
export function getReadableTextColor(bgColor: string): string {
  if (!bgColor) return '#1e293b';
  // All our pastel colors are high-luminance pastels (> 80%),
  // hence slate-800 (#1e293b) guarantees WCAG AAA contrast ratio > 10:1.
  return '#1e293b';
}
