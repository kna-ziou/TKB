export interface ColorSwatch {
  id: string;
  name: string;
  hex: string;
  borderHex: string;
}

/**
  * Professional Polish 20-swatch pastel palette
  * High luminance, soft eye-friendly tones, high contrast with dark slate text
  */
export const PASTEL_PALETTE: ColorSwatch[] = [
  { id: 'sky', name: 'Xanh da trời', hex: '#e0f2fe', borderHex: '#bae6fd' },
  { id: 'blue', name: 'Xanh dương', hex: '#dbeafe', borderHex: '#bfdbfe' },
  { id: 'indigo', name: 'Chàm', hex: '#e0e7ff', borderHex: '#c7d2fe' },
  { id: 'violet', name: 'Tím violet', hex: '#ede9fe', borderHex: '#ddd6fe' },
  { id: 'purple', name: 'Tím hoa cà', hex: '#f3e8ff', borderHex: '#e9d5ff' },
  { id: 'fuchsia', name: 'Hồng sen nhạt', hex: '#fae8ff', borderHex: '#f5d0fe' },
  { id: 'pink', name: 'Hồng phấn', hex: '#fce7f3', borderHex: '#fbcfe8' },
  { id: 'rose', name: 'Hồng đào', hex: '#ffe4e6', borderHex: '#fecdd3' },
  { id: 'red-soft', name: 'Đỏ san hô nhạt', hex: '#fee2e2', borderHex: '#fecaca' },
  { id: 'orange', name: 'Cam đào', hex: '#ffedd5', borderHex: '#fed7aa' },
  { id: 'amber', name: 'Hổ phách', hex: '#fef3c7', borderHex: '#fde68a' },
  { id: 'yellow', name: 'Vàng tươi nhẹ', hex: '#fef9c3', borderHex: '#fef08a' },
  { id: 'lime', name: 'Xanh cốm', hex: '#ecfccb', borderHex: '#d9f99d' },
  { id: 'green', name: 'Xanh lá tươi', hex: '#dcfce7', borderHex: '#bbf7d0' },
  { id: 'emerald', name: 'Ngọc lục bảo', hex: '#d1fae5', borderHex: '#a7f3d0' },
  { id: 'teal', name: 'Xanh mòng két', hex: '#ccfbf1', borderHex: '#99f6e4' },
  { id: 'cyan', name: 'Xanh ngọc', hex: '#cffafe', borderHex: '#a5f3fc' },
  { id: 'mint', name: 'Bạc hà nhẹ', hex: '#d8f3dc', borderHex: '#b7e4c7' },
  { id: 'sand', name: 'Nâu cát nhạt', hex: '#f5ebe0', borderHex: '#e6ccb2' },
  { id: 'slate', name: 'Xám đá nhạt', hex: '#f1f5f9', borderHex: '#e2e8f0' },
];

/**
  * Distinct rotation sequence for automatically assigning colors to new custom subjects
  */
const CUSTOM_ROTATION_HEXES: string[] = [
  '#fce7f3', // Pink
  '#dbeafe', // Blue
  '#fef3c7', // Amber
  '#d1fae5', // Emerald
  '#ede9fe', // Violet
  '#ffedd5', // Orange
  '#cffafe', // Cyan
  '#ecfccb', // Lime
  '#fae8ff', // Fuchsia
  '#ccfbf1', // Teal
  '#fee2e2', // Coral/Red
  '#e0e7ff', // Indigo
];

/**
  * Deterministic color assignment for custom subjects based on index
  */
export function getAutoCustomColor(index: number = 0): string {
  const safeIndex = Math.max(0, index);
  return CUSTOM_ROTATION_HEXES[safeIndex % CUSTOM_ROTATION_HEXES.length];
}
