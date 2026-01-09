// Cores primarias do app (escala coral para harmonizar com tema quente)
export const Colors = {
  primary: {
    50: '#FDF6F0',
    100: '#F5D6C8',
    200: '#EEBFAB',
    300: '#E8A090',
    400: '#D4806A',
    500: '#C96B55',
    600: '#B85C46',
    700: '#A04D3A',
    800: '#7D3D2E',
    900: '#5C2D22',
  },
  // Cores semanticas
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  // Escala de cinza (light mode)
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  white: '#FFFFFF',
  black: '#000000',
} as const;

// Cores tematicas - Light Mode
export const LightColors = {
  background: '#E89A7C',
  surface: '#FDEEE8',
  surfaceVariant: '#F5D6C8',
  primary: '#C96B55',
  primaryAccent: '#C96B55',
  text: '#3D2314',
  textSecondary: '#7D5A4A',
  textMuted: '#A68B7B',
  border: '#D4A892',
  borderLight: '#F5D6C8',
} as const;

// Cores tematicas - Dark Mode
export const DarkColors = {
  background: '#1C1917',
  surface: '#292524',
  surfaceVariant: '#3D3836',
  primary: '#D4806A',
  primaryAccent: '#D4806A',
  text: '#FFFFFF',
  textSecondary: '#A8A29E',
  textMuted: '#78716C',
  border: '#44403C',
  borderLight: '#3D3836',
} as const;

export const CategoryColors = {
  // Task Categories
  cleaning: '#3B82F6',
  kitchen: '#F59E0B',
  laundry: '#8B5CF6',
  organization: '#10B981',
  shopping: '#EC4899',

  // Maintenance Categories
  airConditioning: '#0EA5E9',
  electrical: '#FBBF24',
  plumbing: '#3B82F6',
  appliances: '#8B5CF6',
  vehicle: '#EF4444',
  pestControl: '#84CC16',

  // Finance Categories
  housing: '#3B82F6',
  food: '#F59E0B',
  transport: '#EF4444',
  utilities: '#FBBF24',
  leisure: '#8B5CF6',
  health: '#10B981',
  salary: '#22C55E',
  freelance: '#14B8A6',

  other: '#6B7280',
} as const;
