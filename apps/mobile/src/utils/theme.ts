export const COLORS = {
  // Status colors
  safe: '#2E7D32',
  caution: '#F9A825',
  warning: '#E65100',
  danger: '#C62828',

  // Brand
  primary: '#1565C0',

  // Neutral
  background: '#FFFFFF',
  backgroundGray: '#F5F5F5',
  text: '#1A1A1A',
  subText: '#757575',
  border: '#E0E0E0',
} as const;

// Accessibility: minimum sizes for elderly UI
export const ELDERLY_UI = {
  MIN_FONT_SIZE: 24,
  MAIN_BUTTON_FONT: 36,
  MIN_TOUCH_TARGET: 56,
  RECOMMENDED_TOUCH_TARGET: 72,
} as const;
