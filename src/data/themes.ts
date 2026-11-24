import type { TopicMood } from '../types.ts';

export interface ThemePalette {
  id: string;
  name: string;
  group: 'dark' | 'vibrant' | 'light';
  isLight: boolean;
  bg: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentFg: string;
  accentSoft: string;
  success: string;
  warning: string;
  danger: string;
  bgMesh1: string;
  bgMesh2: string;
  glassTint: string;
  glassBorderTop: string;
  glassSpecular: string;
}

export const THEMES: ThemePalette[] = [
  {
    id: 'minimal-dark',
    name: 'Minimal Dark',
    group: 'dark',
    isLight: false,
    bg: '#0B0F19',
    surface: '#111827',
    surfaceElevated: '#172033',
    border: 'rgba(255, 255, 255, 0.09)',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    accent: '#38BDF8',
    accentFg: '#04121E',
    accentSoft: 'rgba(56, 189, 248, 0.16)',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    bgMesh1: 'rgba(56, 189, 248, 0.18)',
    bgMesh2: 'rgba(99, 102, 241, 0.14)',
    glassTint: 'rgba(17, 24, 39, 0.62)',
    glassBorderTop: 'rgba(255, 255, 255, 0.22)',
    glassSpecular: 'rgba(255, 255, 255, 0.14)',
  },
  {
    id: 'obsidian-red',
    name: 'Obsidian Red',
    group: 'dark',
    isLight: false,
    bg: '#0C0A0C',
    surface: '#161216',
    surfaceElevated: '#201A20',
    border: 'rgba(248, 113, 113, 0.14)',
    text: '#FAF5F5',
    textMuted: '#A8999D',
    accent: '#F87171',
    accentFg: '#1E0606',
    accentSoft: 'rgba(248, 113, 113, 0.16)',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#FB7185',
    bgMesh1: 'rgba(248, 113, 113, 0.18)',
    bgMesh2: 'rgba(217, 70, 239, 0.12)',
    glassTint: 'rgba(22, 18, 22, 0.65)',
    glassBorderTop: 'rgba(255, 255, 255, 0.20)',
    glassSpecular: 'rgba(248, 113, 113, 0.18)',
  },
  {
    id: 'midnight-crimson',
    name: 'Midnight Crimson',
    group: 'dark',
    isLight: false,
    bg: '#10070B',
    surface: '#1B0C12',
    surfaceElevated: '#26121A',
    border: 'rgba(244, 63, 94, 0.18)',
    text: '#FFF1F2',
    textMuted: '#FDA4AF',
    accent: '#FB7185',
    accentFg: '#28050D',
    accentSoft: 'rgba(251, 113, 133, 0.16)',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F43F5E',
    bgMesh1: 'rgba(244, 63, 94, 0.22)',
    bgMesh2: 'rgba(168, 85, 247, 0.14)',
    glassTint: 'rgba(27, 12, 18, 0.66)',
    glassBorderTop: 'rgba(255, 255, 255, 0.22)',
    glassSpecular: 'rgba(251, 113, 133, 0.20)',
  },
  {
    id: 'cyber-blue',
    name: 'Cyber Blue',
    group: 'vibrant',
    isLight: false,
    bg: '#050C1B',
    surface: '#0A162D',
    surfaceElevated: '#102242',
    border: 'rgba(56, 189, 248, 0.18)',
    text: '#F0F9FF',
    textMuted: '#7DD3FC',
    accent: '#22D3EE',
    accentFg: '#021720',
    accentSoft: 'rgba(34, 211, 238, 0.18)',
    success: '#2DD4BF',
    warning: '#FBBF24',
    danger: '#F87171',
    bgMesh1: 'rgba(34, 211, 238, 0.22)',
    bgMesh2: 'rgba(59, 130, 246, 0.18)',
    glassTint: 'rgba(10, 22, 45, 0.64)',
    glassBorderTop: 'rgba(255, 255, 255, 0.26)',
    glassSpecular: 'rgba(56, 189, 248, 0.22)',
  },
  {
    id: 'deep-ocean',
    name: 'Deep Ocean',
    group: 'dark',
    isLight: false,
    bg: '#06131A',
    surface: '#0B1F2A',
    surfaceElevated: '#112D3C',
    border: 'rgba(45, 212, 191, 0.15)',
    text: '#ECFEFF',
    textMuted: '#8BB3C0',
    accent: '#2DD4BF',
    accentFg: '#04201C',
    accentSoft: 'rgba(45, 212, 191, 0.16)',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#FB7185',
    bgMesh1: 'rgba(45, 212, 191, 0.20)',
    bgMesh2: 'rgba(6, 182, 212, 0.15)',
    glassTint: 'rgba(11, 31, 42, 0.65)',
    glassBorderTop: 'rgba(255, 255, 255, 0.22)',
    glassSpecular: 'rgba(45, 212, 191, 0.16)',
  },
  {
    id: 'emerald-terminal',
    name: 'Emerald Terminal',
    group: 'dark',
    isLight: false,
    bg: '#05100B',
    surface: '#0A1C14',
    surfaceElevated: '#10291E',
    border: 'rgba(16, 185, 129, 0.18)',
    text: '#ECFDF5',
    textMuted: '#6EE7B7',
    accent: '#10B981',
    accentFg: '#021A10',
    accentSoft: 'rgba(16, 185, 129, 0.18)',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
    bgMesh1: 'rgba(16, 185, 129, 0.20)',
    bgMesh2: 'rgba(20, 184, 166, 0.15)',
    glassTint: 'rgba(10, 28, 20, 0.65)',
    glassBorderTop: 'rgba(255, 255, 255, 0.24)',
    glassSpecular: 'rgba(16, 185, 129, 0.18)',
  },
  {
    id: 'amoled-pitch-black',
    name: 'AMOLED Pitch Black',
    group: 'dark',
    isLight: false,
    bg: '#000000',
    surface: '#09090B',
    surfaceElevated: '#121216',
    border: 'rgba(255, 255, 255, 0.14)',
    text: '#FFFFFF',
    textMuted: '#A1A1AA',
    accent: '#E4E4E7',
    accentFg: '#09090B',
    accentSoft: 'rgba(255, 255, 255, 0.14)',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    bgMesh1: 'rgba(255, 255, 255, 0.10)',
    bgMesh2: 'rgba(161, 161, 170, 0.08)',
    glassTint: 'rgba(15, 15, 18, 0.72)',
    glassBorderTop: 'rgba(255, 255, 255, 0.32)',
    glassSpecular: 'rgba(255, 255, 255, 0.22)',
  },
  {
    id: 'violet-pulse',
    name: 'Violet Pulse',
    group: 'vibrant',
    isLight: false,
    bg: '#0D0817',
    surface: '#160E26',
    surfaceElevated: '#211538',
    border: 'rgba(192, 132, 252, 0.18)',
    text: '#FAF5FF',
    textMuted: '#C4B5FD',
    accent: '#C084FC',
    accentFg: '#19062B',
    accentSoft: 'rgba(192, 132, 252, 0.18)',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#FB7185',
    bgMesh1: 'rgba(192, 132, 252, 0.22)',
    bgMesh2: 'rgba(236, 72, 153, 0.15)',
    glassTint: 'rgba(22, 14, 38, 0.65)',
    glassBorderTop: 'rgba(255, 255, 255, 0.24)',
    glassSpecular: 'rgba(192, 132, 252, 0.20)',
  },
  {
    id: 'neon-synthwave',
    name: 'Neon Synthwave',
    group: 'vibrant',
    isLight: false,
    bg: '#13071E',
    surface: '#1E0C30',
    surfaceElevated: '#2A1242',
    border: 'rgba(244, 114, 182, 0.22)',
    text: '#FDF2F8',
    textMuted: '#F9A8D4',
    accent: '#F472B6',
    accentFg: '#280518',
    accentSoft: 'rgba(244, 114, 182, 0.20)',
    success: '#2DD4BF',
    warning: '#FBBF24',
    danger: '#FB7185',
    bgMesh1: 'rgba(244, 114, 182, 0.24)',
    bgMesh2: 'rgba(34, 211, 238, 0.18)',
    glassTint: 'rgba(30, 12, 48, 0.66)',
    glassBorderTop: 'rgba(255, 255, 255, 0.25)',
    glassSpecular: 'rgba(244, 114, 182, 0.22)',
  },
  {
    id: 'sunset-rose',
    name: 'Sunset Rose',
    group: 'vibrant',
    isLight: false,
    bg: '#160B0E',
    surface: '#221116',
    surfaceElevated: '#2F181F',
    border: 'rgba(251, 146, 60, 0.20)',
    text: '#FFF7ED',
    textMuted: '#FDBA74',
    accent: '#FB923C',
    accentFg: '#280D02',
    accentSoft: 'rgba(251, 146, 60, 0.18)',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
    bgMesh1: 'rgba(251, 146, 60, 0.22)',
    bgMesh2: 'rgba(244, 63, 94, 0.16)',
    glassTint: 'rgba(34, 17, 22, 0.66)',
    glassBorderTop: 'rgba(255, 255, 255, 0.22)',
    glassSpecular: 'rgba(251, 146, 60, 0.18)',
  },
  {
    id: 'warm-paper-light',
    name: 'Warm Paper Light',
    group: 'light',
    isLight: true,
    bg: '#F8F6F1',
    surface: '#FFFFFF',
    surfaceElevated: '#F1EDE4',
    border: 'rgba(28, 25, 23, 0.10)',
    text: '#1C1917',
    textMuted: '#57534E',
    accent: '#0F172A',
    accentFg: '#FFFFFF',
    accentSoft: 'rgba(15, 23, 42, 0.08)',
    success: '#15803D',
    warning: '#B45309',
    danger: '#B91C1C',
    bgMesh1: 'rgba(217, 119, 6, 0.14)',
    bgMesh2: 'rgba(244, 114, 182, 0.09)',
    glassTint: 'rgba(255, 255, 255, 0.76)',
    glassBorderTop: 'rgba(255, 255, 255, 0.95)',
    glassSpecular: 'rgba(255, 255, 255, 0.70)',
  },
  {
    id: 'crisp-daylight',
    name: 'Crisp Daylight',
    group: 'light',
    isLight: true,
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceElevated: '#F1F5F9',
    border: 'rgba(15, 23, 42, 0.09)',
    text: '#0F172A',
    textMuted: '#475569',
    accent: '#0284C7',
    accentFg: '#FFFFFF',
    accentSoft: 'rgba(2, 132, 199, 0.10)',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
    bgMesh1: 'rgba(14, 165, 233, 0.16)',
    bgMesh2: 'rgba(99, 102, 241, 0.10)',
    glassTint: 'rgba(255, 255, 255, 0.80)',
    glassBorderTop: 'rgba(255, 255, 255, 0.98)',
    glassSpecular: 'rgba(255, 255, 255, 0.75)',
  },
  {
    id: 'nord-frost',
    name: 'Nord Frost',
    group: 'dark',
    isLight: false,
    bg: '#2E3440',
    surface: '#3B4252',
    surfaceElevated: '#434C5E',
    border: 'rgba(216, 222, 233, 0.14)',
    text: '#ECEFF4',
    textMuted: '#D8DEE9',
    accent: '#88C0D0',
    accentFg: '#1D232C',
    accentSoft: 'rgba(136, 192, 208, 0.20)',
    success: '#A3BE8C',
    warning: '#EBCB8B',
    danger: '#BF616A',
    bgMesh1: 'rgba(136, 192, 208, 0.22)',
    bgMesh2: 'rgba(129, 161, 193, 0.16)',
    glassTint: 'rgba(59, 66, 82, 0.65)',
    glassBorderTop: 'rgba(255, 255, 255, 0.24)',
    glassSpecular: 'rgba(136, 192, 208, 0.20)',
  },
  {
    id: 'dracula',
    name: 'Dracula',
    group: 'dark',
    isLight: false,
    bg: '#21222C',
    surface: '#282A36',
    surfaceElevated: '#343746',
    border: 'rgba(189, 147, 249, 0.18)',
    text: '#F8F8F2',
    textMuted: '#BD93F9',
    accent: '#FF79C6',
    accentFg: '#21222C',
    accentSoft: 'rgba(255, 121, 198, 0.18)',
    success: '#50FA7B',
    warning: '#F1FA8C',
    danger: '#FF5555',
    bgMesh1: 'rgba(255, 121, 198, 0.22)',
    bgMesh2: 'rgba(189, 147, 249, 0.18)',
    glassTint: 'rgba(40, 42, 54, 0.65)',
    glassBorderTop: 'rgba(255, 255, 255, 0.24)',
    glassSpecular: 'rgba(255, 121, 198, 0.20)',
  },
  {
    id: 'monokai',
    name: 'Monokai',
    group: 'dark',
    isLight: false,
    bg: '#1E1F1C',
    surface: '#272822',
    surfaceElevated: '#32332B',
    border: 'rgba(248, 248, 242, 0.12)',
    text: '#F8F8F2',
    textMuted: '#A59F85',
    accent: '#A6E22E',
    accentFg: '#1E1F1C',
    accentSoft: 'rgba(166, 226, 46, 0.16)',
    success: '#A6E22E',
    warning: '#E6DB74',
    danger: '#F92672',
    bgMesh1: 'rgba(166, 226, 46, 0.20)',
    bgMesh2: 'rgba(249, 38, 114, 0.15)',
    glassTint: 'rgba(39, 40, 34, 0.66)',
    glassBorderTop: 'rgba(255, 255, 255, 0.20)',
    glassSpecular: 'rgba(166, 226, 46, 0.18)',
  },
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    group: 'dark',
    isLight: false,
    bg: '#002B36',
    surface: '#073642',
    surfaceElevated: '#0C4352',
    border: 'rgba(147, 161, 161, 0.18)',
    text: '#FDF6E3',
    textMuted: '#93A1A1',
    accent: '#2AA198',
    accentFg: '#001F27',
    accentSoft: 'rgba(42, 161, 152, 0.18)',
    success: '#859900',
    warning: '#B58900',
    danger: '#DC322F',
    bgMesh1: 'rgba(42, 161, 152, 0.22)',
    bgMesh2: 'rgba(38, 139, 210, 0.16)',
    glassTint: 'rgba(7, 54, 66, 0.66)',
    glassBorderTop: 'rgba(255, 255, 255, 0.22)',
    glassSpecular: 'rgba(42, 161, 152, 0.18)',
  },
  {
    id: 'coffee-sepia',
    name: 'Coffee Sepia',
    group: 'dark',
    isLight: false,
    bg: '#17110D',
    surface: '#221913',
    surfaceElevated: '#2E221A',
    border: 'rgba(214, 180, 140, 0.15)',
    text: '#F5EBE0',
    textMuted: '#C7B299',
    accent: '#D4A373',
    accentFg: '#1A110A',
    accentSoft: 'rgba(212, 163, 115, 0.18)',
    success: '#84A98C',
    warning: '#E9C46A',
    danger: '#E76F51',
    bgMesh1: 'rgba(212, 163, 115, 0.22)',
    bgMesh2: 'rgba(231, 111, 81, 0.15)',
    glassTint: 'rgba(34, 25, 19, 0.68)',
    glassBorderTop: 'rgba(255, 255, 255, 0.20)',
    glassSpecular: 'rgba(212, 163, 115, 0.18)',
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    group: 'dark',
    isLight: false,
    bg: '#000000',
    surface: '#0B0B0B',
    surfaceElevated: '#161616',
    border: '#FFFFFF',
    text: '#FFFFFF',
    textMuted: '#E5E5E5',
    accent: '#FACC15',
    accentFg: '#000000',
    accentSoft: 'rgba(250, 204, 21, 0.24)',
    success: '#4ADE80',
    warning: '#FACC15',
    danger: '#F87171',
    bgMesh1: 'rgba(250, 204, 21, 0.18)',
    bgMesh2: 'rgba(255, 255, 255, 0.12)',
    glassTint: 'rgba(15, 15, 15, 0.82)',
    glassBorderTop: 'rgba(255, 255, 255, 0.40)',
    glassSpecular: 'rgba(250, 204, 21, 0.25)',
  },
];

export function getThemeById(id: string): ThemePalette {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

export function getAdaptiveThemeId(mood: TopicMood): string {
  switch (mood) {
    case 'Serious':
      return 'midnight-crimson';
    case 'Analytical':
      return 'cyber-blue';
    case 'Entertaining':
      return 'violet-pulse';
    default:
      return 'minimal-dark';
  }
}

export function applyThemeToDocument(theme: ThemePalette): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--pc-bg', theme.bg);
  root.style.setProperty('--pc-surface', theme.surface);
  root.style.setProperty('--pc-surface-elevated', theme.surfaceElevated);
  root.style.setProperty('--pc-border', theme.border);
  root.style.setProperty('--pc-text', theme.text);
  root.style.setProperty('--pc-text-muted', theme.textMuted);
  root.style.setProperty('--pc-accent', theme.accent);
  root.style.setProperty('--pc-accent-fg', theme.accentFg);
  root.style.setProperty('--pc-accent-soft', theme.accentSoft);
  root.style.setProperty('--pc-success', theme.success);
  root.style.setProperty('--pc-warning', theme.warning);
  root.style.setProperty('--pc-danger', theme.danger);

  // Apple Liquid Glass dynamic variables
  root.style.setProperty('--bg-mesh-1', theme.bgMesh1);
  root.style.setProperty('--bg-mesh-2', theme.bgMesh2);
  root.style.setProperty('--glass-tint', theme.glassTint);
  root.style.setProperty('--glass-border-top', theme.glassBorderTop);
  root.style.setProperty('--glass-specular', theme.glassSpecular);

  root.style.colorScheme = theme.isLight ? 'light' : 'dark';
  if (theme.isLight) {
    root.classList.remove('dark');
  } else {
    root.classList.add('dark');
  }
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute('content', theme.bg);
  }
}
