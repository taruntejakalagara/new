/**
 * Venue Theme Configuration
 * Each venue gets a unique visual identity while sharing the same workflow
 */

export const venues = {
  // Default/Fallback Theme
  default: {
    id: 'default',
    name: 'The Digital Key',
    logo: null, // Use text fallback
    colors: {
      primary: '#0f172a',      // Slate 900
      primaryLight: '#1e293b', // Slate 800
      accent: '#3b82f6',       // Blue 500
      accentLight: '#60a5fa',  // Blue 400
      success: '#10b981',      // Emerald 500
      warning: '#f59e0b',      // Amber 500
      error: '#ef4444',        // Red 500
      surface: '#ffffff',
      surfaceAlt: '#f8fafc',   // Slate 50
      text: '#0f172a',
      textMuted: '#64748b',    // Slate 500
      border: '#e2e8f0',       // Slate 200
    },
    fonts: {
      display: "'DM Sans', system-ui, sans-serif",
      body: "'DM Sans', system-ui, sans-serif",
    },
    style: 'modern', // modern, classic, minimal
  },

  // Luxury Hotel Theme - Gold & Navy
  fairmont: {
    id: 'fairmont',
    name: 'Fairmont Pittsburgh',
    logo: '/venues/fairmont-logo.png',
    colors: {
      primary: '#1a365d',      // Navy
      primaryLight: '#2c4a7c',
      accent: '#c5a572',       // Gold
      accentLight: '#d4b88a',
      success: '#2f855a',      // Forest green
      warning: '#c5a572',
      error: '#c53030',
      surface: '#fffef7',      // Warm white
      surfaceAlt: '#f7f5ed',
      text: '#1a365d',
      textMuted: '#4a5568',
      border: '#e8e4d9',
    },
    fonts: {
      display: "'Playfair Display', Georgia, serif",
      body: "'Source Sans 3', system-ui, sans-serif",
    },
    style: 'classic',
  },

  // Boutique Hotel Theme - Teal & Coral
  kimpton: {
    id: 'kimpton',
    name: 'Kimpton Hotel Monaco',
    logo: '/venues/kimpton-logo.png',
    colors: {
      primary: '#134e4a',      // Teal 900
      primaryLight: '#0f766e',
      accent: '#f97316',       // Orange
      accentLight: '#fb923c',
      success: '#059669',
      warning: '#f97316',
      error: '#dc2626',
      surface: '#ffffff',
      surfaceAlt: '#f0fdfa',   // Teal 50
      text: '#134e4a',
      textMuted: '#5eead4',
      border: '#99f6e4',
    },
    fonts: {
      display: "'Outfit', system-ui, sans-serif",
      body: "'Outfit', system-ui, sans-serif",
    },
    style: 'modern',
  },

  // Hip/Modern Theme - Black & Orange
  ace: {
    id: 'ace',
    name: 'Ace Hotel',
    logo: '/venues/ace-logo.png',
    colors: {
      primary: '#000000',
      primaryLight: '#171717',
      accent: '#ff5722',       // Deep Orange
      accentLight: '#ff7043',
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
      surface: '#fafafa',
      surfaceAlt: '#f5f5f5',
      text: '#000000',
      textMuted: '#757575',
      border: '#e0e0e0',
    },
    fonts: {
      display: "'Space Grotesk', monospace",
      body: "'IBM Plex Sans', system-ui, sans-serif",
    },
    style: 'minimal',
  },

  // Corporate/Business Theme - Blue & Silver
  marriott: {
    id: 'marriott',
    name: 'Pittsburgh Marriott',
    logo: '/venues/marriott-logo.png',
    colors: {
      primary: '#1e3a5f',      // Corporate blue
      primaryLight: '#2d4a6f',
      accent: '#b91c1c',       // Marriott red
      accentLight: '#dc2626',
      success: '#15803d',
      warning: '#ca8a04',
      error: '#b91c1c',
      surface: '#ffffff',
      surfaceAlt: '#f1f5f9',
      text: '#1e293b',
      textMuted: '#64748b',
      border: '#cbd5e1',
    },
    fonts: {
      display: "'Inter', system-ui, sans-serif",
      body: "'Inter', system-ui, sans-serif",
    },
    style: 'modern',
  },
};

/**
 * Get theme by venue ID
 */
export const getVenueTheme = (venueId) => {
  return venues[venueId] || venues.default;
};

/**
 * Generate CSS variables from theme
 */
export const generateCSSVariables = (theme) => {
  return {
    '--color-primary': theme.colors.primary,
    '--color-primary-light': theme.colors.primaryLight,
    '--color-accent': theme.colors.accent,
    '--color-accent-light': theme.colors.accentLight,
    '--color-success': theme.colors.success,
    '--color-warning': theme.colors.warning,
    '--color-error': theme.colors.error,
    '--color-surface': theme.colors.surface,
    '--color-surface-alt': theme.colors.surfaceAlt,
    '--color-text': theme.colors.text,
    '--color-text-muted': theme.colors.textMuted,
    '--color-border': theme.colors.border,
    '--font-display': theme.fonts.display,
    '--font-body': theme.fonts.body,
  };
};

export default venues;
