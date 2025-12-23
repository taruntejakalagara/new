/**
 * Venue Configuration
 * Customize for each hotel/venue deployment
 */

export const VENUE = {
  id: 'fairmont-pittsburgh',
  name: 'Fairmont Pittsburgh',
  shortName: 'Fairmont',
  tagline: 'Luxury Redefined',
  address: '510 Market Street, Pittsburgh, PA 15222',
  phone: '(412) 773-8800',
  valetPhone: '(412) 773-8848',
  
  // Branding
  logo: '/fairmont-logo.svg',
  
  // Time threshold for showing amenities vs direct retrieval (in hours)
  amenitiesThreshold: 2,
  
  // Default valet fee
  defaultValetFee: 15.00,
  
  // Social links
  social: {
    instagram: 'https://instagram.com/fairmontpittsburgh',
    facebook: 'https://facebook.com/fairmontpittsburgh',
  }
};

// Theme colors matching Fairmont branding
export const THEME = {
  // Primary gold accent
  accent: '#C9A962',
  accentLight: '#D4B36D',
  accentDark: '#B8983F',
  
  // Dark navy backgrounds
  dark: '#1a1a2e',
  darkSecondary: '#16213e',
  
  // Light backgrounds
  cream: '#FDFBF7',
  warmGray: '#F5F2ED',
  border: '#E8E2D9',
  
  // Text colors
  textPrimary: '#1a1a2e',
  textSecondary: '#6B6B6B',
  textMuted: '#8A8A8A',
  
  // Status colors
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
};

// API Configuration
export const API_BASE_URL = 'http://10.1.10.217:4000/api';

export default { VENUE, THEME, API_BASE_URL };
