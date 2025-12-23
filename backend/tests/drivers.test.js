/**
 * Driver API Tests
 */
const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createTestDb, createTestApp, cleanupTestDb, createTestDriver } = require('./setup');

describe('Driver API', () => {
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
  
  describe('POST /api/drivers (Registration)', () => {
    it('should register a new driver', async () => {
      const res = await request(app)
        .post('/api/drivers')
        .send({
          fullName: 'John Smith',
          username: 'johnsmith',
          password: 'securepass123',
          phone: '5551234567',
          email: 'john@example.com'
        })
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.driverId).toBeDefined();
    });
    
    it('should reject registration without required fields', async () => {
      const res = await request(app)
        .post('/api/drivers')
        .send({
          fullName: 'Missing Fields'
        })
        .expect(400);
      
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });
    
    it('should reject short passwords', async () => {
      const res = await request(app)
        .post('/api/drivers')
        .send({
          fullName: 'Short Pass',
          username: 'shortpass',
          password: '123',
          phone: '555-000-0000'
        })
        .expect(400);
      
      expect(res.body.success).toBe(false);
    });
    
    it('should reject duplicate usernames', async () => {
      // Create first driver
      await request(app)
        .post('/api/drivers')
        .send({
          fullName: 'First Driver',
          username: 'duplicate_user',
          password: 'password123',
          phone: '5551111111'
        });
      
      // Try to create second with same username
      const res = await request(app)
        .post('/api/drivers')
        .send({
          fullName: 'Second Driver',
          username: 'duplicate_user',
          password: 'password456',
          phone: '5552222222'
        })
        .expect(400);
      
      expect(res.body.success).toBe(false);
      // Could be validation error or duplicate error
      expect(res.body.message).toBeDefined();
    });
    
    it('should hash passwords with bcrypt', async () => {
      await request(app)
        .post('/api/drivers')
        .send({
          fullName: 'Hash Test',
          username: 'hashtest',
          password: 'plaintextpass',
          phone: '555-333-3333'
        });
      
      // Check password is hashed
      const driver = db.prepare('SELECT password FROM drivers WHERE username = ?').get('hashtest');
      expect(driver.password).not.toBe('plaintextpass');
      expect(driver.password.startsWith('$2')).toBe(true); // bcrypt prefix
    });
  });
  
  describe('POST /api/drivers/login', () => {
    beforeAll(() => {
      // Create a test driver for login tests
      createTestDriver(db, {
        username: 'logintest',
        password: bcrypt.hashSync('testpassword', 10),
        fullName: 'Login Test User',
        status: 'active'
      });
    });
    
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/drivers/login')
        .send({
          username: 'logintest',
          password: 'testpassword'
        })
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.driver).toBeDefined();
      expect(res.body.driver.username).toBe('logintest');
      expect(res.body.driver.status).toBe('online');
    });
    
    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/drivers/login')
        .send({
          username: 'logintest',
          password: 'wrongpassword'
        })
        .expect(401);
      
      expect(res.body.success).toBe(false);
    });
    
    it('should reject non-existent user', async () => {
      const res = await request(app)
        .post('/api/drivers/login')
        .send({
          username: 'nonexistent',
          password: 'anypassword'
        })
        .expect(401);
      
      expect(res.body.success).toBe(false);
    });
    
    it('should reject suspended accounts', async () => {
      createTestDriver(db, {
        username: 'suspended_driver',
        password: bcrypt.hashSync('password', 10),
        status: 'suspended'
      });
      
      const res = await request(app)
        .post('/api/drivers/login')
        .send({
          username: 'suspended_driver',
          password: 'password'
        })
        .expect(403);
      
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('suspended');
    });
  });
  
  describe('POST /api/drivers/logout', () => {
    it('should logout a driver', async () => {
      const driver = createTestDriver(db, {
        username: 'logout_test',
        status: 'online'
      });
      
      const res = await request(app)
        .post('/api/drivers/logout')
        .send({ driverId: driver.id })
        .expect(200);
      
      expect(res.body.success).toBe(true);
      
      // Verify status changed
      const updated = db.prepare('SELECT status FROM drivers WHERE id = ?').get(driver.id);
      expect(updated.status).toBe('offline');
    });
    
    it('should require driverId', async () => {
      const res = await request(app)
        .post('/api/drivers/logout')
        .send({})
        .expect(400);
      
      expect(res.body.success).toBe(false);
    });
  });
  
  describe('GET /api/drivers', () => {
    it('should return list of drivers without passwords', async () => {
      const res = await request(app)
        .get('/api/drivers')
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.drivers)).toBe(true);
      
      // Ensure no passwords are exposed
      res.body.drivers.forEach(driver => {
        expect(driver.password).toBeUndefined();
      });
    });
  });
  
  describe('GET /api/drivers/:id', () => {
    it('should return driver by ID', async () => {
      const driver = createTestDriver(db, { fullName: 'Get By ID Test' });
      
      const res = await request(app)
        .get(`/api/drivers/${driver.id}`)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.driver.fullName).toBe('Get By ID Test');
      expect(res.body.driver.password).toBeUndefined();
    });
    
    it('should return 404 for non-existent driver', async () => {
      const res = await request(app)
        .get('/api/drivers/99999')
        .expect(404);
      
      expect(res.body.success).toBe(false);
    });
  });
  
  describe('PUT /api/drivers/:id', () => {
    it('should update driver info', async () => {
      const driver = createTestDriver(db, { fullName: 'Before Update' });
      
      const res = await request(app)
        .put(`/api/drivers/${driver.id}`)
        .send({ fullName: 'After Update', phone: '555-999-9999' })
        .expect(200);
      
      expect(res.body.success).toBe(true);
      
      // Verify update
      const updated = db.prepare('SELECT fullName, phone FROM drivers WHERE id = ?').get(driver.id);
      expect(updated.fullName).toBe('After Update');
      expect(updated.phone).toBe('555-999-9999');
    });
  });
  
  describe('DELETE /api/drivers/:id', () => {
    it('should delete driver without active tasks', async () => {
      const driver = createTestDriver(db, { fullName: 'To Be Deleted' });
      
      const res = await request(app)
        .delete(`/api/drivers/${driver.id}`)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      
      // Verify deletion
      const deleted = db.prepare('SELECT id FROM drivers WHERE id = ?').get(driver.id);
      expect(deleted).toBeUndefined();
    });
  });
  
  describe('POST /api/drivers/:id/change-password', () => {
    it('should change password with correct current password', async () => {
      const driver = createTestDriver(db, {
        username: 'changepass_test',
        password: bcrypt.hashSync('oldpassword', 10)
      });
      
      const res = await request(app)
        .post(`/api/drivers/${driver.id}/change-password`)
        .send({
          currentPassword: 'oldpassword',
          newPassword: 'newpassword123'
        })
        .expect(200);
      
      expect(res.body.success).toBe(true);
      
      // Verify new password works
      const updated = db.prepare('SELECT password FROM drivers WHERE id = ?').get(driver.id);
      expect(bcrypt.compareSync('newpassword123', updated.password)).toBe(true);
    });
    
    it('should reject incorrect current password', async () => {
      const driver = createTestDriver(db, {
        username: 'wrongpass_test',
        password: bcrypt.hashSync('correctpass', 10)
      });
      
      const res = await request(app)
        .post(`/api/drivers/${driver.id}/change-password`)
        .send({
          currentPassword: 'wrongpass',
          newPassword: 'newpassword'
        })
        .expect(401);
      
      expect(res.body.success).toBe(false);
    });
  });
});
