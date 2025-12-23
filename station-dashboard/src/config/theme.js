/**
 * Fairmont Pittsburgh Theme Configuration
 * Luxury hotel branding - Navy & Gold
 */

const theme = {
  // Brand
  name: 'Fairmont Pittsburgh',
  tagline: 'Valet Services',
  logo: '/fairmont-logo.png',
  
  // Colors
  colors: {
    primary: '#1a365d',        // Navy blue
    primaryLight: '#2c5282',
    primaryDark: '#0f2942',
    accent: '#c5a572',         // Gold
    accentLight: '#d4bc91',
    accentDark: '#9a7b4f',
    
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    
    surface: '#ffffff',
    surfaceAlt: '#f8fafc',
    surfaceHover: '#f1f5f9',
    
    text: '#0f172a',
    textMuted: '#64748b',
    textLight: '#94a3b8',
    
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
  },
  
  // Typography
  fonts: {
    display: "'Playfair Display', Georgia, serif",
    body: "'Source Sans 3', system-ui, sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  
  // Styling
  borderRadius: {
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '20px',
  },
  
  // Custom overrides for this venue
  features: {
    showWeatherAlerts: true,
    showVIPBadges: true,
    enableSoundAlerts: true,
    darkModeOption: false,
  },
};

export default theme;
