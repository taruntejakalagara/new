/**
 * Admin Dashboard Configuration
 */

// ============================================
// 👇 CHANGE THIS WHEN SWITCHING NETWORKS 👇
// ============================================
const API_HOST = '192.168.12.154';
// ============================================

export const API_BASE_URL = `http://${API_HOST}:4000/api`;
export const WS_URL = `ws://${API_HOST}:4000`;

export const REFRESH_INTERVALS = {
  LIVE_FEED: 3000,      // 3 seconds
  STATS: 10000,         // 10 seconds
  VENUES: 30000,        // 30 seconds
  SYSTEM_HEALTH: 5000,  // 5 seconds
};

export const ALERT_THRESHOLDS = {
  LONG_WAIT_MINUTES: 10,
  LOW_HOOKS_PERCENT: 20,
  HIGH_QUEUE_COUNT: 10,
};

export default {
  API_BASE_URL,
  WS_URL,
  REFRESH_INTERVALS,
  ALERT_THRESHOLDS,
};
