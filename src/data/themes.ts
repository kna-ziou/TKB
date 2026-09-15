import { getAutoCustomColor } from './subjectColors';
import { Subject } from '../types/subject';
import { ThemeId, TimetableTheme } from '../types/theme';

export const DEFAULT_THEME_ID: ThemeId = 'professional';

export const THEMES: Record<ThemeId, TimetableTheme> = {
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'Chuẩn mực, tinh tế & trang nhã',
    category: 'Cổ điển',
    tokens: {
      pageBackground: 'bg-slate-50',
      panelBackground: 'bg-white',
      panelBorder: 'border-slate-200',

      timetableBackground: 'bg-white',
      timetableBorder: 'border border-slate-200',
      timetableShadow: 'shadow-xl',
      timetableRadius: 'rounded-2xl',

      headerBackground: 'bg-white',
      headerBorder: 'border-b border-slate-100',
      headerTitleColor: 'text-slate-800',
      headerSubtextColor: 'text-slate-500',
      headerBadgeBg: 'bg-sky-50 text-sky-700 border border-sky-200',
      headerBadgeText: 'text-sky-700',

      tableHeaderBg: 'bg-white',
      tableHeaderText: 'text-slate-700',
      tableHeaderBorder: 'border-b border-r border-slate-100',

      periodColBg: 'bg-white',
      periodColText: 'text-slate-400 font-bold',
      gridBorder: 'border-slate-100',

      morningBackground: 'bg-sky-50/50',
      morningText: 'text-sky-600',
      morningIconColor: 'text-sky-600',
      morningBorder: 'border-b border-slate-100',

      afternoonBackground: 'bg-orange-50/50',
      afternoonText: 'text-orange-600',
      afternoonIconColor: 'text-orange-600',
      afternoonBorder: 'border-b border-slate-100',

      footerBackground: 'bg-slate-50',
      footerText: 'text-slate-400',
      footerBorder: 'border-t border-slate-100',
      accent: '#0284c7',

      fontFamilyClass: 'font-sans',
      cellBorder: 'border-r border-b border-slate-100',
      cellHoverBg: 'hover:bg-sky-50/30',
    },
    decoration: {
      type: 'none',
      density: 'none',
    },
    // Original Phase 02 palette
    subjectPalette: [
      '#dbeafe', // Blue
      '#ffe4e6', // Rose
      '#ede9fe', // Purple / Violet
      '#dcfce7', // Green
      '#fef3c7', // Amber
      '#ccfbf1', // Teal
      '#cffafe', // Cyan
      '#e0e7ff', // Indigo
      '#f3e8ff', // Violet / Lavender
      '#ffedd5', // Orange / Peach
      '#d1fae5', // Emerald
      '#fce7f3', // Pink
      '#fef9c3', // Yellow
      '#f1f5f9', // Slate
      '#fee2e2', // Red-soft
      '#f5ebe0', // Sand
    ],
  },

  simple: {
    id: 'simple',
    name: 'Simple',
    description: 'Tối giản, đường nét rõ & chuẩn in ấn',
    category: 'Tối giản',
    tokens: {
      pageBackground: 'bg-zinc-100/70',
      panelBackground: 'bg-white',
      panelBorder: 'border-zinc-300',

      timetableBackground: 'bg-white',
      timetableBorder: 'border-2 border-zinc-400',
      timetableShadow: 'shadow-sm',
      timetableRadius: 'rounded-lg',

      headerBackground: 'bg-zinc-50',
      headerBorder: 'border-b-2 border-zinc-300',
      headerTitleColor: 'text-zinc-900',
      headerSubtextColor: 'text-zinc-600',
      headerBadgeBg: 'bg-zinc-200 text-zinc-800 border border-zinc-300',
      headerBadgeText: 'text-zinc-800',

      tableHeaderBg: 'bg-zinc-100',
      tableHeaderText: 'text-zinc-900 font-bold',
      tableHeaderBorder: 'border-b-2 border-r-2 border-zinc-300',

      periodColBg: 'bg-zinc-50',
      periodColText: 'text-zinc-600 font-bold',
      gridBorder: 'border-zinc-300',

      morningBackground: 'bg-zinc-100',
      morningText: 'text-zinc-800 font-bold',
      morningIconColor: 'text-zinc-700',
      morningBorder: 'border-b-2 border-zinc-300',

      afternoonBackground: 'bg-zinc-100',
      afternoonText: 'text-zinc-800 font-bold',
      afternoonIconColor: 'text-zinc-700',
      afternoonBorder: 'border-b-2 border-zinc-300',

      footerBackground: 'bg-white',
      footerText: 'text-zinc-500 font-medium',
      footerBorder: 'border-t-2 border-zinc-300',
      accent: '#52525b',

      fontFamilyClass: 'font-sans',
      cellBorder: 'border-r-2 border-b-2 border-zinc-300',
      cellHoverBg: 'hover:bg-zinc-100/70',
    },
    decoration: {
      type: 'none',
      density: 'none',
    },
    // High-contrast, clean print-friendly muted tints
    subjectPalette: [
      '#f4f4f5',
      '#e4e4e7',
      '#e2e8f0',
      '#f1f5f9',
      '#e0e7ff',
      '#ede9fe',
      '#f3f4f6',
      '#dbeafe',
      '#fef2f2',
      '#f0fdf4',
      '#fffbeb',
      '#fdf4ff',
      '#ecfdf5',
      '#f8fafc',
      '#d4d4d8',
      '#cbd5e1',
    ],
  },

  fun: {
    id: 'fun',
    name: 'Fun',
    description: 'Năng động, rực rỡ & ngập tràn sắc màu',
    category: 'Vui vẻ',
    tokens: {
      pageBackground: 'bg-amber-50/40',
      panelBackground: 'bg-white',
      panelBorder: 'border-amber-200',

      timetableBackground: 'bg-white',
      timetableBorder: 'border-2 border-amber-300',
      timetableShadow: 'shadow-xl shadow-amber-200/40',
      timetableRadius: 'rounded-3xl',

      headerBackground: 'bg-gradient-to-r from-amber-100/90 via-orange-100/80 to-yellow-100/90',
      headerBorder: 'border-b-2 border-amber-200',
      headerTitleColor: 'text-amber-950 font-black',
      headerSubtextColor: 'text-amber-800',
      headerBadgeBg: 'bg-amber-200 text-amber-900 border border-amber-300',
      headerBadgeText: 'text-amber-900',

      tableHeaderBg: 'bg-amber-100/70',
      tableHeaderText: 'text-amber-950 font-extrabold',
      tableHeaderBorder: 'border-b border-r border-amber-200',

      periodColBg: 'bg-amber-50/80',
      periodColText: 'text-amber-700 font-extrabold',
      gridBorder: 'border-amber-200/80',

      morningBackground: 'bg-gradient-to-r from-amber-100 to-yellow-100',
      morningText: 'text-amber-800 font-black',
      morningIconColor: 'text-amber-600',
      morningBorder: 'border-b border-amber-200',

      afternoonBackground: 'bg-gradient-to-r from-rose-100 to-orange-100',
      afternoonText: 'text-rose-800 font-black',
      afternoonIconColor: 'text-rose-600',
      afternoonBorder: 'border-b border-rose-200',

      footerBackground: 'bg-amber-50/70',
      footerText: 'text-amber-700 font-bold',
      footerBorder: 'border-t border-amber-200',
      accent: '#f59e0b',

      fontFamilyClass: 'font-sans',
      cellBorder: 'border-r border-b border-amber-200/70',
      cellHoverBg: 'hover:bg-amber-100/50',
    },
    decoration: {
      type: 'dots',
      density: 'medium',
    },
    // Vibrant, energetic pastels
    subjectPalette: [
      '#fed7aa', // Warm peach
      '#bbf7d0', // Fresh mint
      '#bae6fd', // Sky blue
      '#fbcfe8', // Bubblegum pink
      '#fef08a', // Sunny yellow
      '#ddd6fe', // Bright violet
      '#a7f3d0', // Spring emerald
      '#fecdd3', // Coral rose
      '#c7d2fe', // Periwinkle
      '#fde047', // Sunshine
      '#99f6e4', // Bright teal
      '#fed7aa', // Light orange
      '#e9d5ff', // Sweet purple
      '#bfdbfe', // Soft electric blue
      '#fef9c3', // Lemon
      '#fce7f3', // Rosy
    ],
  },

  kawaii: {
    id: 'kawaii',
    name: 'Kawaii',
    description: 'Ngọt ngào pastel, mây êm & dễ thương',
    category: 'Dễ thương',
    tokens: {
      pageBackground: 'bg-pink-50/40',
      panelBackground: 'bg-white',
      panelBorder: 'border-pink-200',

      timetableBackground: 'bg-white',
      timetableBorder: 'border-2 border-pink-300',
      timetableShadow: 'shadow-xl shadow-pink-200/40',
      timetableRadius: 'rounded-3xl',

      headerBackground: 'bg-gradient-to-r from-pink-100/90 via-purple-100/60 to-pink-100/90',
      headerBorder: 'border-b-2 border-pink-200',
      headerTitleColor: 'text-pink-900 font-extrabold',
      headerSubtextColor: 'text-purple-800',
      headerBadgeBg: 'bg-pink-200 text-pink-800 border border-pink-300',
      headerBadgeText: 'text-pink-800',

      tableHeaderBg: 'bg-pink-50/80',
      tableHeaderText: 'text-pink-900 font-extrabold',
      tableHeaderBorder: 'border-b border-r border-pink-200',

      periodColBg: 'bg-purple-50/40',
      periodColText: 'text-purple-600 font-bold',
      gridBorder: 'border-pink-200/70',

      morningBackground: 'bg-pink-100/70',
      morningText: 'text-pink-700 font-extrabold',
      morningIconColor: 'text-pink-500',
      morningBorder: 'border-b border-pink-200',

      afternoonBackground: 'bg-purple-100/70',
      afternoonText: 'text-purple-700 font-extrabold',
      afternoonIconColor: 'text-purple-500',
      afternoonBorder: 'border-b border-purple-200',

      footerBackground: 'bg-pink-50/60',
      footerText: 'text-pink-600 font-semibold',
      footerBorder: 'border-t border-pink-200',
      accent: '#ec4899',

      fontFamilyClass: 'font-sans',
      cellBorder: 'border-r border-b border-pink-200/60',
      cellHoverBg: 'hover:bg-pink-50',
    },
    decoration: {
      type: 'clouds',
      density: 'medium',
    },
    // Soft dreamy sweet pastels
    subjectPalette: [
      '#fce7f3', // Cotton candy pink
      '#ede9fe', // Dream lavender
      '#dbeafe', // Baby sky
      '#dcfce7', // Sweet mint
      '#ffedd5', // Peach puff
      '#fef9c3', // Soft custard
      '#fae8ff', // Orchid flower
      '#e0f2fe', // Cloud blue
      '#fbcfe8', // Strawberry milk
      '#e9d5ff', // Lilac
      '#ccfbf1', // Mint dew
      '#fee2e2', // Sweet heart
      '#f5ebe0', // Cookie cream
      '#fef3c7', // Warm vanilla
      '#cffafe', // Sparkle teal
      '#f3e8ff', // Fairy violet
    ],
  },

  space: {
    id: 'space',
    name: 'Space Adventure',
    description: 'Vũ trụ kỳ thú, các vì sao & tinh vân bí ẩn',
    category: 'Khám phá',
    tokens: {
      pageBackground: 'bg-slate-900',
      panelBackground: 'bg-white',
      panelBorder: 'border-slate-200',

      timetableBackground: 'bg-white',
      timetableBorder: 'border-2 border-indigo-400',
      timetableShadow: 'shadow-2xl shadow-indigo-950/70',
      timetableRadius: 'rounded-2xl',

      headerBackground: 'bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white',
      headerBorder: 'border-b-2 border-indigo-500/40',
      headerTitleColor: 'text-indigo-100 font-black tracking-wider',
      headerSubtextColor: 'text-indigo-200',
      headerBadgeBg: 'bg-indigo-900/90 text-cyan-300 border border-cyan-400/50',
      headerBadgeText: 'text-cyan-300',

      tableHeaderBg: 'bg-slate-100',
      tableHeaderText: 'text-indigo-950 font-black',
      tableHeaderBorder: 'border-b border-r border-indigo-200',

      periodColBg: 'bg-slate-50',
      periodColText: 'text-indigo-700 font-bold',
      gridBorder: 'border-indigo-100',

      morningBackground: 'bg-indigo-100/60',
      morningText: 'text-indigo-900 font-extrabold',
      morningIconColor: 'text-indigo-600',
      morningBorder: 'border-b border-indigo-200',

      afternoonBackground: 'bg-purple-100/60',
      afternoonText: 'text-purple-900 font-extrabold',
      afternoonIconColor: 'text-purple-600',
      afternoonBorder: 'border-b border-purple-200',

      footerBackground: 'bg-slate-100',
      footerText: 'text-slate-600 font-medium',
      footerBorder: 'border-t border-slate-200',
      accent: '#6366f1',

      fontFamilyClass: 'font-sans',
      cellBorder: 'border-r border-b border-indigo-100',
      cellHoverBg: 'hover:bg-indigo-50/60',
    },
    decoration: {
      type: 'stars',
      density: 'medium',
    },
    // Cosmic galactic palette: deep cyan, nebula violet, solar flare, aurora teal
    subjectPalette: [
      '#c7d2fe', // Cosmic periwinkle
      '#a5f3fc', // Cyan pulsar
      '#e9d5ff', // Nebula violet
      '#99f6e4', // Aurora teal
      '#fed7aa', // Solar flare
      '#bae6fd', // Sky orbit
      '#fbcfe8', // Supernova pink
      '#ddd6fe', // Deep starlight
      '#fef08a', // Solar yellow
      '#bfdbfe', // Comet blue
      '#d8b4fe', // Galactic purple
      '#a7f3d0', // Ion green
      '#fecdd3', // Mars red
      '#e0e7ff', // Space indigo
      '#fde047', // Star core
      '#cffafe', // Asteroid glow
    ],
  },

  dino: {
    id: 'dino',
    name: 'Dino World',
    description: 'Kỷ Jura xanh tươi hoang dã & phiêu lưu',
    category: 'Thiên nhiên',
    tokens: {
      pageBackground: 'bg-stone-100',
      panelBackground: 'bg-white',
      panelBorder: 'border-stone-300',

      timetableBackground: 'bg-white',
      timetableBorder: 'border-2 border-emerald-400',
      timetableShadow: 'shadow-xl shadow-stone-300',
      timetableRadius: 'rounded-2xl',

      headerBackground: 'bg-gradient-to-r from-emerald-100/90 via-stone-100 to-amber-100/80',
      headerBorder: 'border-b-2 border-emerald-300',
      headerTitleColor: 'text-emerald-950 font-black tracking-tight',
      headerSubtextColor: 'text-stone-700',
      headerBadgeBg: 'bg-emerald-200 text-emerald-900 border border-emerald-300',
      headerBadgeText: 'text-emerald-900',

      tableHeaderBg: 'bg-emerald-50',
      tableHeaderText: 'text-emerald-900 font-extrabold',
      tableHeaderBorder: 'border-b border-r border-emerald-200',

      periodColBg: 'bg-stone-50',
      periodColText: 'text-stone-700 font-bold',
      gridBorder: 'border-emerald-100',

      morningBackground: 'bg-emerald-100/70',
      morningText: 'text-emerald-800 font-black',
      morningIconColor: 'text-emerald-600',
      morningBorder: 'border-b border-emerald-200',

      afternoonBackground: 'bg-amber-100/70',
      afternoonText: 'text-amber-800 font-black',
      afternoonIconColor: 'text-amber-600',
      afternoonBorder: 'border-b border-amber-200',

      footerBackground: 'bg-stone-50',
      footerText: 'text-stone-600 font-medium',
      footerBorder: 'border-t border-stone-200',
      accent: '#059669',

      fontFamilyClass: 'font-sans',
      cellBorder: 'border-r border-b border-emerald-100',
      cellHoverBg: 'hover:bg-emerald-50/60',
    },
    decoration: {
      type: 'leaves',
      density: 'medium',
    },
    // Prehistoric greens, earth ochres, fern mint, stone amber
    subjectPalette: [
      '#d1fae5', // Fern green
      '#fef3c7', // Amber ochre
      '#ccfbf1', // River mint
      '#ffedd5', // Terracotta sand
      '#dcfce7', // Jungle leaf
      '#fed7aa', // Warm clay
      '#e2e8f0', // Fossil stone
      '#bbf7d0', // Moss green
      '#fef08a', // Sunflower amber
      '#a7f3d0', // Fresh bamboo
      '#e0e7ff', // Rain puddle
      '#fde68a', // Desert sand
      '#f1f5f9', // River pebble
      '#fce7f3', // Jungle blossom
      '#99f6e4', // Deep lagoon
      '#fed7aa', // Canyon rock
    ],
  },

  robot: {
    id: 'robot',
    name: 'Robot Tech',
    description: 'Công nghệ số tương lai, vi mạch & góc cạnh',
    category: 'Khoa học',
    tokens: {
      pageBackground: 'bg-slate-200/80',
      panelBackground: 'bg-white',
      panelBorder: 'border-cyan-300',

      timetableBackground: 'bg-white',
      timetableBorder: 'border-2 border-cyan-500',
      timetableShadow: 'shadow-2xl shadow-cyan-900/20',
      timetableRadius: 'rounded-xl',

      headerBackground: 'bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 text-white',
      headerBorder: 'border-b-2 border-cyan-500',
      headerTitleColor: 'text-cyan-200 font-mono font-black tracking-widest',
      headerSubtextColor: 'text-slate-300 font-mono',
      headerBadgeBg: 'bg-cyan-950 text-cyan-300 border border-cyan-400',
      headerBadgeText: 'text-cyan-300',

      tableHeaderBg: 'bg-slate-100',
      tableHeaderText: 'text-slate-900 font-mono font-bold',
      tableHeaderBorder: 'border-b border-r border-cyan-200',

      periodColBg: 'bg-cyan-50/40',
      periodColText: 'text-cyan-800 font-mono font-bold',
      gridBorder: 'border-cyan-200/80',

      morningBackground: 'bg-cyan-100/60',
      morningText: 'text-cyan-900 font-mono font-bold',
      morningIconColor: 'text-cyan-700',
      morningBorder: 'border-b border-cyan-300',

      afternoonBackground: 'bg-sky-100/60',
      afternoonText: 'text-sky-900 font-mono font-bold',
      afternoonIconColor: 'text-sky-700',
      afternoonBorder: 'border-b border-sky-300',

      footerBackground: 'bg-slate-900 text-slate-400',
      footerText: 'text-cyan-400 font-mono text-xs',
      footerBorder: 'border-t border-cyan-500/50',
      accent: '#06b6d4',

      fontFamilyClass: 'font-mono',
      cellBorder: 'border-r border-b border-cyan-200/80',
      cellHoverBg: 'hover:bg-cyan-50/60',
    },
    decoration: {
      type: 'circuits',
      density: 'medium',
    },
    // High-tech electric cyan, laser blue, slate gray, reactor teal
    subjectPalette: [
      '#cffafe', // Neon cyan
      '#bfdbfe', // Laser blue
      '#ccfbf1', // Quantum teal
      '#e2e8f0', // Titanium slate
      '#e0e7ff', // Plasma indigo
      '#f3e8ff', // Ion violet
      '#fed7aa', // Energy orange
      '#a7f3d0', // Matrix green
      '#a5f3fc', // Cyber teal
      '#c7d2fe', // Core blue
      '#ddd6fe', // Pulse purple
      '#fef08a', // Power yellow
      '#fbcfe8', // Laser magenta
      '#bae6fd', // Sky optic
      '#f1f5f9', // Armor plate
      '#dbeafe', // Signal wave
    ],
  },
};

export const THEME_LIST: TimetableTheme[] = [
  THEMES.professional,
  THEMES.simple,
  THEMES.fun,
  THEMES.kawaii,
  THEMES.space,
  THEMES.dino,
  THEMES.robot,
];

export function getTheme(id: ThemeId): TimetableTheme {
  return THEMES[id] || THEMES.professional;
}

/**
 * Harmonize subject colors according to active theme.
 * RULES:
 * 1. If subject.colorLocked === true, NEVER mutate subject.color.
 * 2. If subject.colorLocked === false, map deterministically to theme palette.
 * 3. Never mutate subject.defaultColor.
 * 4. Switching back to 'professional' returns unlocked subjects to their exact canonical default colors.
 */
export function harmonizeSubjectsForTheme(
  subjects: Subject[],
  themeId: ThemeId
): Subject[] {
  const theme = THEMES[themeId] || THEMES.professional;

  if (themeId === 'professional') {
    // When returning to professional:
    // Default subjects return to their canonical defaultColor.
    // Custom subjects return to their auto custom color by index.
    return subjects.map((s, idx) => {
      if (s.colorLocked) return s;
      if (!s.custom) {
        return {
          ...s,
          color: s.defaultColor,
        };
      }
      const customIdx = subjects.filter((item) => item.custom).indexOf(s);
      const autoColor = getAutoCustomColor(customIdx >= 0 ? customIdx : idx);
      return {
        ...s,
        color: autoColor,
      };
    });
  }

  const palette = theme.subjectPalette;
  if (!palette || palette.length === 0) return subjects;

  return subjects.map((s, idx) => {
    if (s.colorLocked) {
      return s;
    }
    const paletteIndex = idx % palette.length;
    const harmonizedColor = palette[paletteIndex];
    return {
      ...s,
      color: harmonizedColor,
    };
  });
}
