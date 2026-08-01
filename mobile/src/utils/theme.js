// Shared design tokens — spacing/radius/shadow/typography scale extracted
// from the reference mockups (rounded hero headers, pill buttons, soft
// tinted list rows, generous card padding). Pure style constants; nothing
// here touches app logic, navigation, or data.
export const RADIUS = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const SHADOW = {
  card: {
    shadowColor: '#0F2A1C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  raised: {
    shadowColor: '#0F2A1C',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 6,
  },
};

export const TYPE = {
  h1: { fontSize: 22, fontWeight: '800' },
  h2: { fontSize: 17, fontWeight: '800' },
  h3: { fontSize: 14, fontWeight: '700' },
  body: { fontSize: 13, fontWeight: '500' },
  bodyStrong: { fontSize: 13, fontWeight: '700' },
  caption: { fontSize: 11, fontWeight: '600' },
};
