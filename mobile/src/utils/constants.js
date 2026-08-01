export const CROPS = ['White Maize', 'Yam (Pona)', 'Cassava', 'Plantain (Apem)', 'Rice (Local)'];
export const LOCATIONS = ['Techiman', 'Kumasi', 'Tamale', 'Accra'];
export const UNITS = ['Bags', 'Tubers', 'Tons', 'Crates'];

// Light palette modeled on the FarmWallet reference: deep forest-green hero
// surfaces, white floating cards, a gold accent for badges/highlights, and
// pill-shaped green CTAs. Consumed via useTheme() (src/context/ThemeContext.js),
// never imported directly by screens/components anymore.
export const LIGHT_COLORS = {
  primary: '#1FA34A',
  primaryLight: '#4ADE80',
  primaryDark: '#0F7A34',
  primarySoft: '#E6F5EA',
  forestDark: '#123A28',
  forestDarker: '#0C2A1C',
  accent: '#F5C518',
  accentSoft: '#FFF3C4',
  success: '#16a34a',
  danger: '#dc2626',
  warning: '#d97706',
  info: '#0ea5e9',
  bg: '#F3F8F4',
  card: '#ffffff',
  border: '#E4EDE7',
  text: '#12201A',
  textMuted: '#657268',
  dark: '#123A28',

  // Reference-aligned tokens (Login/SignUp, Farmer home, Buyer shop): deep
  // green hero surfaces on white, sage-tinted rows instead of the gold-accent
  // look used elsewhere in the app.
  refGreen: '#1B4D34',
  refGreenDark: '#0F3323',
  refSage: '#EAF3EA',
  refSageBorder: '#D3E6D6',
};

// Dark counterpart — same keys/roles as LIGHT_COLORS so every screen styled
// with colors.<key> works unmodified under either theme. Text/bg/border move
// to a near-black green-tinted scale; "soft"/text-on-soft pairs (primarySoft +
// primaryDark, accentSoft) are inverted so they stay readable on dark surfaces
// instead of just going dark-on-dark.
export const DARK_COLORS = {
  primary: '#2ECC71',
  primaryLight: '#6EE7A8',
  primaryDark: '#6EE7A8',
  primarySoft: '#16301F',
  forestDark: '#0F2E1F',
  forestDarker: '#081F15',
  accent: '#F5C518',
  accentSoft: '#3A2E10',
  success: '#22c55e',
  danger: '#f87171',
  warning: '#fbbf24',
  info: '#38bdf8',
  bg: '#0F1712',
  card: '#182720',
  border: '#26362C',
  text: '#EAF2EC',
  textMuted: '#8FA396',
  dark: '#0F2E1F',

  refGreen: '#2E7D52',
  refGreenDark: '#1B4D34',
  refSage: '#1B2E22',
  refSageBorder: '#2C4736',
};
