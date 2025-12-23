/**
 * Venue Configuration System
 * Manages venue-specific settings, branding, and features
 */

// Default venue configurations
const DEFAULT_VENUES = {
  'fairmont-pittsburgh': {
    id: 1,
    slug: 'fairmont-pittsburgh',
    name: 'Fairmont Pittsburgh',
    shortName: 'Fairmont',
    branding: {
      logo: '/assets/venues/fairmont/logo.png',
      primaryColor: '#C9A962',
      secondaryColor: '#1a1a2e',
      backgroundColor: '#FDFBF7',
      accentColor: '#C9A962',
      fontFamily: 'Playfair Display',
      style: 'luxury'
    },
    contact: {
      phone: '+1 412-773-8800',
      email: 'valet@fairmont.com',
      address: '510 Market St, Pittsburgh, PA 15222'
    },
    location: {
      lat: 40.4406,
      lng: -79.9959,
      timezone: 'America/New_York'
    },
    settings: {
      hooksCount: 50,
      operatingHours: { open: '06:00', close: '23:00' },
      amenitiesThreshold: 2, // hours before showing retrieval-focused UI
      maxRetrievalTime: 10, // minutes
      priorityEnabled: true,
      tippingEnabled: true,
      damagePhotosEnabled: true,
      amenitiesUpsellEnabled: true
    },
    pricing: {
      baseFee: 15,
      priorityFee: 25,
      overnightFee: 45,
      currency: 'USD',
      taxRate: 0.07
    },
    features: {
      nfcCards: true,
      aiDamageDetection: true,
      realTimeTracking: true,
      customerApp: true,
      amenitiesIntegration: true
    }
  },
  'kimpton-monaco': {
    id: 2,
    slug: 'kimpton-monaco',
    name: 'Kimpton Hotel Monaco Pittsburgh',
    shortName: 'Monaco',
    branding: {
      logo: '/assets/venues/kimpton/logo.png',
      primaryColor: '#1B4D3E',
      secondaryColor: '#2C2C2C',
      backgroundColor: '#F5F5F0',
      accentColor: '#D4AF37',
      fontFamily: 'Montserrat',
      style: 'boutique'
    },
    contact: {
      phone: '+1 412-227-1010',
      email: 'valet@monaco-pittsburgh.com',
      address: '620 William Penn Pl, Pittsburgh, PA 15219'
    },
    location: {
      lat: 40.4416,
      lng: -79.9969,
      timezone: 'America/New_York'
    },
    settings: {
      hooksCount: 30,
      operatingHours: { open: '06:00', close: '24:00' },
      amenitiesThreshold: 2,
      maxRetrievalTime: 8,
      priorityEnabled: true,
      tippingEnabled: true,
      damagePhotosEnabled: true,
      amenitiesUpsellEnabled: true
    },
    pricing: {
      baseFee: 18,
      priorityFee: 30,
      overnightFee: 50,
      currency: 'USD',
      taxRate: 0.07
    },
    features: {
      nfcCards: true,
      aiDamageDetection: true,
      realTimeTracking: true,
      customerApp: true,
      amenitiesIntegration: true
    }
  },
  'ace-hotel': {
    id: 3,
    slug: 'ace-hotel',
    name: 'Ace Hotel Pittsburgh',
    shortName: 'Ace',
    branding: {
      logo: '/assets/venues/ace/logo.png',
      primaryColor: '#000000',
      secondaryColor: '#1A1A1A',
      backgroundColor: '#FFFFFF',
      accentColor: '#FF5722',
      fontFamily: 'Space Mono',
      style: 'modern'
    },
    contact: {
      phone: '+1 412-361-3300',
      email: 'valet@acehotel.com',
      address: '120 S Whitfield St, Pittsburgh, PA 15206'
    },
    location: {
      lat: 40.4534,
      lng: -79.9305,
      timezone: 'America/New_York'
    },
    settings: {
      hooksCount: 25,
      operatingHours: { open: '07:00', close: '23:00' },
      amenitiesThreshold: 1.5,
      maxRetrievalTime: 7,
      priorityEnabled: false,
      tippingEnabled: true,
      damagePhotosEnabled: true,
      amenitiesUpsellEnabled: false
    },
    pricing: {
      baseFee: 12,
      priorityFee: 20,
      overnightFee: 35,
      currency: 'USD',
      taxRate: 0.07
    },
    features: {
      nfcCards: true,
      aiDamageDetection: false,
      realTimeTracking: true,
      customerApp: true,
      amenitiesIntegration: false
    }
  }
};

class VenueConfig {
  constructor(db) {
    this.db = db;
    this.cache = new Map();
  }

  // Initialize venues table and seed defaults
  initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS venue_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venue_id INTEGER NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        short_name TEXT,
        config_json TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Seed default venues if empty
    const count = this.db.prepare('SELECT COUNT(*) as count FROM venue_config').get();
    if (count.count === 0) {
      const insert = this.db.prepare(`
        INSERT INTO venue_config (venue_id, slug, name, short_name, config_json)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      for (const [slug, config] of Object.entries(DEFAULT_VENUES)) {
        insert.run(config.id, slug, config.name, config.shortName, JSON.stringify(config));
      }
      console.log('✓ Default venue configurations seeded');
    }
  }

  // Get venue config by ID
  getById(venueId) {
    if (this.cache.has(`id:${venueId}`)) {
      return this.cache.get(`id:${venueId}`);
    }

    const row = this.db.prepare('SELECT * FROM venue_config WHERE venue_id = ? AND is_active = 1').get(venueId);
    if (row) {
      const config = JSON.parse(row.config_json);
      this.cache.set(`id:${venueId}`, config);
      return config;
    }
    
    return DEFAULT_VENUES['fairmont-pittsburgh']; // Fallback
  }

  // Get venue config by slug
  getBySlug(slug) {
    if (this.cache.has(`slug:${slug}`)) {
      return this.cache.get(`slug:${slug}`);
    }

    const row = this.db.prepare('SELECT * FROM venue_config WHERE slug = ? AND is_active = 1').get(slug);
    if (row) {
      const config = JSON.parse(row.config_json);
      this.cache.set(`slug:${slug}`, config);
      return config;
    }
    
    return DEFAULT_VENUES[slug] || DEFAULT_VENUES['fairmont-pittsburgh'];
  }

  // Get all active venues
  getAll() {
    const rows = this.db.prepare('SELECT * FROM venue_config WHERE is_active = 1').all();
    return rows.map(row => JSON.parse(row.config_json));
  }

  // Update venue config
  update(venueId, updates) {
    const current = this.getById(venueId);
    const updated = { ...current, ...updates };
    
    this.db.prepare(`
      UPDATE venue_config 
      SET config_json = ?, updated_at = datetime('now')
      WHERE venue_id = ?
    `).run(JSON.stringify(updated), venueId);
    
    // Clear cache
    this.cache.delete(`id:${venueId}`);
    this.cache.delete(`slug:${current.slug}`);
    
    return updated;
  }

  // Add new venue
  add(config) {
    const insert = this.db.prepare(`
      INSERT INTO venue_config (venue_id, slug, name, short_name, config_json)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = insert.run(config.id, config.slug, config.name, config.shortName, JSON.stringify(config));
    return { ...config, dbId: result.lastInsertRowid };
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}

module.exports = { VenueConfig, DEFAULT_VENUES };
