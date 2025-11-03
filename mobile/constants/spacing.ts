/**
 * Design System - Spacing
 * Consistent spacing scale throughout the app
 */

export const Spacing = {
  // Base spacing unit: 4px
  xs: 4,    // 0.25rem - Very tight spacing
  sm: 8,    // 0.5rem  - Tight spacing
  md: 12,   // 0.75rem - Comfortable spacing
  base: 16, // 1rem    - Standard spacing (default)
  lg: 20,   // 1.25rem - Loose spacing
  xl: 24,   // 1.5rem  - Spacious
  '2xl': 32, // 2rem   - Very spacious
  '3xl': 40, // 2.5rem - Extra spacious
  '4xl': 48, // 3rem   - Huge spacing
};

// Screen padding (horizontal)
export const ScreenPadding = {
  horizontal: 16, // px-4
  vertical: 16,   // py-4
};

// Card spacing
export const CardSpacing = {
  padding: 20,      // p-5
  gap: 12,          // gap-3
  marginBottom: 16, // mb-4
};

// Section spacing
export const SectionSpacing = {
  gap: 24,          // gap-6 - Between major sections
  headerMargin: 16, // mb-4 - Below section headers
};

// List item spacing
export const ListSpacing = {
  gap: 12,          // gap-3 - Between list items
  padding: 16,      // p-4 - Inside list items
};

export default Spacing;
