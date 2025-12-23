/**
 * Vehicle API Tests
 */
const request = require('supertest');
const { createTestDb, createTestApp, cleanupTestDb, createTestVehicle } = require('./setup');

describe('Vehicle API', () => {
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
  
  describe('POST /api/vehicles/checkin', () => {
    it('should check in a vehicle successfully', async () => {
      const res = await request(app)
        .post('/api/vehicles/checkin')
        .send({
          unique_card_id: 'NFC_TEST_001',
          license_plate: 'ABC123',
          make: 'BMW',
          model: 'X5',
          color: 'White',
          key_slot: 2
        })
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.vehicleId).toBeDefined();
      expect(res.body.vehicle.license_plate).toBe('ABC123');
      expect(res.body.vehicle.hook_number).toBe(2);
    });
    
    it('should reject check-in without card ID', async () => {
      const res = await request(app)
        .post('/api/vehicles/checkin')
        .send({
          license_plate: 'XYZ789',
          key_slot: 3
        })
        .expect(400);
      
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });
    
    it('should reject check-in without license plate', async () => {
      const res = await request(app)
        .post('/api/vehicles/checkin')
        .send({
          unique_card_id: 'NFC_TEST_002',
          key_slot: 3
        })
        .expect(400);
      
      expect(res.body.success).toBe(false);
    });
    
    it('should reject check-in without hook number', async () => {
      const res = await request(app)
        .post('/api/vehicles/checkin')
        .send({
          unique_card_id: 'NFC_TEST_003',
          license_plate: 'TEST999'
        })
        .expect(400);
      
      expect(res.body.success).toBe(false);
    });
    
    it('should reject duplicate card ID', async () => {
      // First check-in
      await request(app)
        .post('/api/vehicles/checkin')
        .send({
          unique_card_id: 'NFC_DUPLICATE',
          license_plate: 'DUP001',
          key_slot: 4
        });
      
      // Second check-in with same card
      const res = await request(app)
        .post('/api/vehicles/checkin')
        .send({
          unique_card_id: 'NFC_DUPLICATE',
          license_plate: 'DUP002',
          key_slot: 5
        })
        .expect(400);
      
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already in use');
    });
    
    it('should reject invalid hook number', async () => {
      const res = await request(app)
        .post('/api/vehicles/checkin')
        .send({
          unique_card_id: 'NFC_INVALID_HOOK',
          license_plate: 'INV001',
          key_slot: 999 // Invalid hook
        })
        .expect(400);
      
      expect(res.body.success).toBe(false);
    });
  });
  
  describe('GET /api/vehicles', () => {
    it('should return list of parked vehicles', async () => {
      const res = await request(app)
        .get('/api/vehicles')
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.vehicles)).toBe(true);
    });
  });
  
  describe('GET /api/vehicles/card/:cardId', () => {
    it('should return vehicle by card ID', async () => {
      // Create a vehicle first
      const vehicle = createTestVehicle(db, {
        unique_card_id: 'CARD_LOOKUP_TEST',
        hook_number: 10
      });
      
      const res = await request(app)
        .get(`/api/vehicles/card/${vehicle.unique_card_id}`)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.vehicle.unique_card_id).toBe(vehicle.unique_card_id);
      expect(res.body.vehicle.parking_fee).toBeDefined();
    });
    
    it('should return 404 for non-existent card', async () => {
      const res = await request(app)
        .get('/api/vehicles/card/NONEXISTENT_CARD')
        .expect(404);
      
      expect(res.body.success).toBe(false);
    });
  });
});
