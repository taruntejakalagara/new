/**
 * API Health & Basic Tests
 */
const request = require('supertest');
const { createTestDb, createTestApp, cleanupTestDb } = require('./setup');

describe('API Health & Basics', () => {
  let app, db, testDbPath;
  
  beforeAll(() => {
    const testDb = createTestDb();
    db = testDb.db;
    testDbPath = testDb.path;
    app = createTestApp(db);
  });
  
  afterAll(() => {
    db.close();
    cleanupTestDb(testDbPath);
  });
  
  describe('GET /api/health', () => {
    it('should return healthy status', async () => {
      const res = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('API is running');
      expect(res.body.version).toBeDefined();
    });
  });
  
  describe('GET /api/stats', () => {
    it('should return system stats', async () => {
      const res = await request(app)
        .get('/api/stats')
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.parked).toBeDefined();
      expect(res.body.total).toBeDefined();
      expect(res.body.pendingRequests).toBeDefined();
      expect(res.body.onlineDrivers).toBeDefined();
    });
  });
  
  describe('GET /api/next-hook', () => {
    it('should return next available hook number', async () => {
      const res = await request(app)
        .get('/api/next-hook')
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.hookNumber).toBeDefined();
      expect(typeof res.body.hookNumber).toBe('number');
    });
  });
  
  describe('404 Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const res = await request(app)
        .get('/api/nonexistent')
        .expect(404);
      
      // Express default 404 may not have success field
      expect(res.status).toBe(404);
    });
  });
});
