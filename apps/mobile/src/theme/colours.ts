export const colours = {
  // Brand
  primary: '#1A237E',       // deep indigo — main action colour
  primaryLight: '#3949AB',
  primaryDark: '#0D1259',

  // Surfaces
  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceVariant: '#E8EAF6',

  // Text
  textPrimary: '#1A1A2E',
  textSecondary: '#5C6BC0',
  textMuted: '#9E9E9E',
  textOnPrimary: '#FFFFFF',

  // Status / semantic
  success: '#2E7D32',       // paid
  warning: '#F57F17',       // partial
  error: '#C62828',         // due / error
  archived: '#757575',      // archived / inactive

  // Wallet
  cash: '#00695C',
  bkash: '#E91E8C',
  nagad: '#FF6200',

  // Borders
  border: '#E0E0E0',
  divider: '#EEEEEE',
} as const;

export type ColourKey = keyof typeof colours;
