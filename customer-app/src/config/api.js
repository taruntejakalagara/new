/**
 * API Configuration
 * The Digital Key - Customer App
 * 
 * EASY IP UPDATE: Just change the API_HOST below when switching networks
 */

// ============================================
// 👇 CHANGE THIS WHEN SWITCHING NETWORKS 👇
// ============================================
const API_HOST = '192.168.12.154';
// ============================================

// Computed URLs (don't change these)
export const API_BASE_URL = `http://${API_HOST}:4000/api`;
export const WS_URL = `http://${API_HOST}:4000`;

// Venue & App settings
export const DEFAULT_VENUE = 'fairmont-pittsburgh';
export const APP_VERSION = '2.0.0';
export const DEBUG = import.meta.env?.DEV || false;

// Export host for display purposes
export const API_HOST_IP = API_HOST;

export default {
  API_BASE_URL,
  WS_URL,
  DEFAULT_VENUE,
  APP_VERSION,
  DEBUG,
  API_HOST_IP,
};
