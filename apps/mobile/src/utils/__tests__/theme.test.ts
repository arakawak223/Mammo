import { COLORS, ELDERLY_UI } from '../theme';

describe('theme', () => {
  describe('COLORS', () => {
    it('should define all required colors', () => {
      expect(COLORS.safe).toBeDefined();
      expect(COLORS.danger).toBeDefined();
      expect(COLORS.warning).toBeDefined();
      expect(COLORS.primary).toBeDefined();
      expect(COLORS.background).toBeDefined();
      expect(COLORS.text).toBeDefined();
    });

    it('should use valid hex color codes', () => {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;
      Object.values(COLORS).forEach((color) => {
        expect(color).toMatch(hexRegex);
      });
    });
  });

  describe('ELDERLY_UI', () => {
    it('should have minimum font size >= 24', () => {
      expect(ELDERLY_UI.MIN_FONT_SIZE).toBeGreaterThanOrEqual(24);
    });

    it('should have minimum touch target >= 48', () => {
      expect(ELDERLY_UI.MIN_TOUCH_TARGET).toBeGreaterThanOrEqual(48);
    });
  });
});
