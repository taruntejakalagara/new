/**
 * Environment Configuration
 * Centralized configuration for the Digital Key Backend
 */

const os = require('os');

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const config = {
  // Server
  port: process.env.PORT || 4000,
  host: process.env.HOST || '0.0.0.0',
  localIP: getLocalIP(),
  
  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',
  isProd: process.env.NODE_ENV === 'production',
  
  // Database
  dbPath: process.env.DB_PATH || './valet.db',
  
  // CORS
  corsOrigins: process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',') 
    : ['*'],
  
  // JWT (for future auth)
  jwtSecret: process.env.JWT_SECRET || 'digital-key-secret-change-in-production',
  jwtExpiry: process.env.JWT_EXPIRY || '24h',
  
  // Venues
  defaultVenueId: process.env.DEFAULT_VENUE_ID || 1,
  
  // Feature flags
  features: {
    websockets: process.env.ENABLE_WEBSOCKETS !== 'false',
    analytics: process.env.ENABLE_ANALYTICS !== 'false',
    logging: process.env.ENABLE_LOGGING !== 'false',
  },
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.RATE_LIMIT_MAX || 1000,
  },
};

// Computed URLs
config.apiUrl = `http://${config.localIP}:${config.port}`;
config.wsUrl = `ws://${config.localIP}:${config.port}`;

module.exports = config;
