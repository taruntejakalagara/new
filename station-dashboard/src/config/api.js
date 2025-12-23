/**
 * API Configuration for Station Dashboard
 * Venue: Configure via environment variables
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://192.168.12.154:4000/api';
export const WS_URL = import.meta.env.VITE_WS_URL || 'http://192.168.12.154:4000';
export const APP_VERSION = '2.0.0';
export const DEBUG = import.meta.env.VITE_DEBUG === 'true' || import.meta.env.DEV;

// Venue Configuration (baked in at build time)
export const VENUE = {
  id: import.meta.env.VITE_VENUE_ID || 'default',
  name: import.meta.env.VITE_VENUE_NAME || 'The Digital Key',
  logo: import.meta.env.VITE_VENUE_LOGO || '/logo.png',
};

// Refresh intervals (ms)
export const REFRESH_INTERVALS = {
  STATS: 5000,
  QUEUE: 3000,
  DRIVERS: 5000,
  VEHICLES: 5000,
  HOOKS: 3000,
  ANALYTICS: 30000,
};

// API Endpoints
export const ENDPOINTS = {
  // Auth
  LOGIN: '/managers/login',
  LOGOUT: '/managers/logout',
  
  // Dashboard
  STATS: '/station/stats',
  ALERTS: '/station/alerts',
  
  // Queue
  QUEUE: '/queue',
  ASSIGN_DRIVER: (id) => `/queue/${id}/assign`,
  CANCEL_REQUEST: (id) => `/queue/${id}/cancel`,
  
  // Drivers
  DRIVERS: '/drivers',
  DRIVER_REGISTER: '/drivers/register',
  DRIVER_STATUS: (id) => `/drivers/${id}/status`,
  DRIVER_DELETE: (id) => `/drivers/${id}`,
  DRIVER_STATS: (id) => `/drivers/${id}/stats`,
  
  // Shifts
  SHIFTS: '/shifts',
  SHIFT_START: '/shifts/start',
  SHIFT_END: '/shifts/end',
  SHIFT_ACTIVE: '/shifts/active',
  
  // Vehicles
  VEHICLES: '/vehicles',
  VEHICLE_BY_CARD: (cardId) => `/vehicles/card/${cardId}`,
  VEHICLE_PHOTOS: (id) => `/vehicles/${id}/photos`,
  
  // Hooks
  HOOKS: '/hooks',
  HOOKS_STATS: '/hooks/stats/summary',
  HOOK_RELEASE: '/hooks/release',
  HOOK_HEATMAP: '/hooks/heatmap',
  
  // Analytics
  ANALYTICS_DAILY: '/analytics/daily',
  ANALYTICS_HOURLY: '/analytics/hourly',
  ANALYTICS_DRIVERS: '/analytics/drivers',
  ANALYTICS_REVENUE: '/analytics/revenue',
  ANALYTICS_WAIT_TIMES: '/analytics/wait-times',
  
  // Closeout
  CLOSEOUT_CURRENT: '/closeout/current',
  CLOSEOUT_SUBMIT: '/closeout/submit',
  CLOSEOUT_HISTORY: '/closeout/history',
  
  // Settings
  SETTINGS: '/settings',
  PRICING: '/settings/pricing',
  TIP_POLICY: '/settings/tip-policy',
  
  // Notifications
  NOTIFICATIONS: '/notifications',
  CUSTOMER_NOTIFIED: (requestId) => `/notifications/customer/${requestId}`,
};

export default {
  API_BASE_URL,
  WS_URL,
  VENUE,
  APP_VERSION,
  DEBUG,
  REFRESH_INTERVALS,
  ENDPOINTS,
};
