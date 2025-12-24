/**
 * API Configuration - SIMPLE VERSION
 * 
 * TO CHANGE NETWORK: Just update the IP below and restart apps
 * Or use 'localhost' when running on same machine
 */

// ========================================
// CHANGE THIS IP WHEN YOU SWITCH NETWORKS
// ========================================
const API_HOST = 'valet.local';  // or use your IP like '192.168.12.205'
const API_PORT = '4000';
// ========================================

// Build URLs
export const API_BASE_URL = `http://${API_HOST}:${API_PORT}/api`;
export const WS_URL = `ws://${API_HOST}:${API_PORT}`;
export const SOCKET_URL = `http://${API_HOST}:${API_PORT}`;

// App info
export const APP_VERSION = '1.0.0';
export const APP_NAME = 'Digital Valet';
export const APP_AUTHOR = 'The Digital Key';

// Customer app URLs
export const CUSTOMER_URL = `http://${API_HOST}:5174`;
export const CUSTOMER_BASE_URL = `http://${API_HOST}:5174`;

// API Endpoints
export const ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REGISTER: '/auth/register',
  
  // Managers
  MANAGERS: '/managers',
  MANAGERS_LOGIN: '/managers/login',
  
  // Drivers
  DRIVERS: '/drivers',
  DRIVER_STATUS: (id) => `/drivers/${id}/status`,
  DRIVER_DELETE: (id) => `/drivers/${id}`,
  DRIVER_LOGIN: '/drivers/login',
  
  // Vehicles
  VEHICLES: '/vehicles',
  VEHICLE_CHECKIN: '/vehicles/checkin',
  VEHICLE_CHECKOUT: '/vehicles/checkout',
  VEHICLE_PHOTOS: (id) => `/vehicles/${id}/photos`,
  
  // Queue
  QUEUE: '/queue',
  QUEUE_REQUEST: '/queue/request',
  QUEUE_ASSIGN: '/queue/assign',
  QUEUE_COMPLETE: '/queue/complete',
  ASSIGN_DRIVER: (id) => `/queue/${id}/assign`,
  CANCEL_REQUEST: (id) => `/queue/${id}/cancel`,
  CUSTOMER_NOTIFIED: (id) => `/queue/${id}/notified`,
  
  // Hooks
  HOOKS: '/hooks',
  HOOKS_AVAILABLE: '/hooks/available',
  HOOKS_STATS: '/hooks/stats',
  HOOK_HEATMAP: '/hooks/heatmap',
  HOOK_RELEASE: '/hooks/release',
  
  // Stats
  STATS: '/stats',
  ANALYTICS: '/analytics',
  
  // Venues
  VENUES: '/venues',
  
  // Settings
  SETTINGS: '/settings',
  
  // Health
  HEALTH: '/health',
  
  // Cards/NFC
  CARDS: '/cards',
  CARD_ACTIVATE: '/cards/activate',
  CARD_DEACTIVATE: '/cards/deactivate',
  
  // Closeout
  CLOSEOUT_CURRENT: '/closeout/current',
  CLOSEOUT_SUBMIT: '/closeout/submit',
  
  // Shifts
  SHIFT_START: '/shifts/start',
  SHIFT_END: '/shifts/end',
};

// Refresh intervals (in milliseconds)
export const REFRESH_INTERVALS = {
  LIVE_FEED: 3000,
  STATS: 10000,
  VENUES: 30000,
  SYSTEM_HEALTH: 5000,
  QUEUE: 3000,
  VEHICLES: 5000,
  DRIVERS: 10000,
  HOOKS: 5000,
};

// Venue config
export const VENUE = {
  id: 1,
  name: 'Fairmont Pittsburgh',
  slug: 'fairmont-pittsburgh',
  shortName: 'Fairmont',
  maxHooks: 50,
  address: '510 Market St, Pittsburgh, PA 15222',
  phone: '(412) 555-0100',
  theme: {
    primary: '#6366f1',
    secondary: '#4f46e5',
    accent: '#8b5cf6',
  }
};

export const DEFAULT_VENUE = VENUE;
export const VENUE_CONFIG = VENUE;

// Alert thresholds
export const ALERT_THRESHOLDS = {
  LONG_WAIT_MINUTES: 10,
  LOW_HOOKS_PERCENT: 20,
  HIGH_QUEUE_COUNT: 10,
};

// Pricing
export const DEFAULT_PRICING = { base: 25, priority: 35, overnight: 50 };
export const PRICING = DEFAULT_PRICING;

// Status options
export const DRIVER_STATUSES = ['online', 'offline', 'busy', 'break', 'available'];
export const VEHICLE_STATUSES = ['parked', 'retrieving', 'retrieved', 'departed'];
export const REQUEST_STATUSES = ['pending', 'assigned', 'retrieving', 'ready', 'completed', 'cancelled'];

// Payment methods
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'room_charge', label: 'Room Charge' },
  { value: 'prepaid', label: 'Prepaid' },
  { value: 'pay_at_counter', label: 'Pay at Counter' },
];

// Tip options
export const TIP_OPTIONS = [
  { value: 0, label: 'No Tip' },
  { value: 3, label: '$3' },
  { value: 5, label: '$5' },
  { value: 10, label: '$10' },
  { value: 'custom', label: 'Custom' },
];

// Time helpers
export const toEST = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  });
};

export const toESTTime = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric', minute: '2-digit', hour12: true
  });
};

export const toESTDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    month: 'short', day: 'numeric', year: 'numeric'
  });
};

export const getCurrentEST = () => {
  return new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
  });
};

export const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'Just now';
  const diff = Math.floor((new Date() - new Date(timestamp)) / 1000 / 60);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return toESTDate(timestamp);
};

export const formatDuration = (minutes) => {
  if (!minutes || minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

// API helpers
export const apiGet = async (endpoint) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`);
  return response.json();
};

export const apiPost = async (endpoint, data) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
};

export const apiPut = async (endpoint, data) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
};

export const apiDelete = async (endpoint) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'DELETE',
  });
  return response.json();
};

// Log on load
console.log(`🔗 API: ${API_BASE_URL}`);

export default {
  API_BASE_URL, WS_URL, SOCKET_URL, CUSTOMER_URL, CUSTOMER_BASE_URL,
  APP_VERSION, APP_NAME, APP_AUTHOR,
  ENDPOINTS, VENUE, DEFAULT_VENUE, VENUE_CONFIG,
  REFRESH_INTERVALS, ALERT_THRESHOLDS, DEFAULT_PRICING, PRICING,
  DRIVER_STATUSES, VEHICLE_STATUSES, REQUEST_STATUSES,
  PAYMENT_METHODS, TIP_OPTIONS,
};
