/**
 * Retrieval API Tests
 */
const request = require('supertest');
const { 
  createTestDb, 
  createTestApp, 
  cleanupTestDb, 
  createTestVehicle, 
  createTestDriver,
  createTestRequest 
} = require('./setup');

describe('Retrieval API', () => {
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
  
  describe('POST /api/retrieval/request', () => {
    it('should create a retrieval request', async () => {
      const vehicle = createTestVehicle(db, {
        unique_card_id: 'RETRIEVAL_TEST_001',
        hook_number: 15
      });
      
      const res = await request(app)
        .post('/api/retrieval/request')
        .send({
          unique_card_id: vehicle.unique_card_id,
          is_priority: false
        })
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.requestId).toBeDefined();
      expect(res.body.amount).toBe(15); // Base fee
    });
    
    it('should create priority request with higher fee', async () => {
      const vehicle = createTestVehicle(db, {
        unique_card_id: 'PRIORITY_TEST_001',
        hook_number: 16
      });
      
      const res = await request(app)
        .post('/api/retrieval/request')
        .send({
          unique_card_id: vehicle.unique_card_id,
          is_priority: true
        })
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.amount).toBe(25); // Base + priority fee
    });
    
    it('should reject request for non-existent vehicle', async () => {
      const res = await request(app)
        .post('/api/retrieval/request')
        .send({
          unique_card_id: 'NONEXISTENT_CARD'
        })
        .expect(404);
      
      expect(res.body.success).toBe(false);
    });
    
    it('should reject duplicate pending request', async () => {
      const vehicle = createTestVehicle(db, {
        unique_card_id: 'DUPLICATE_REQ_TEST',
        hook_number: 17
      });
      
      // First request
      await request(app)
        .post('/api/retrieval/request')
        .send({ unique_card_id: vehicle.unique_card_id });
      
      // Second request for same vehicle
      const res = await request(app)
        .post('/api/retrieval/request')
        .send({ unique_card_id: vehicle.unique_card_id });
      
      expect(res.body.alreadyRequested).toBe(true);
    });
    
    it('should require card ID', async () => {
      const res = await request(app)
        .post('/api/retrieval/request')
        .send({})
        .expect(400);
      
      expect(res.body.success).toBe(false);
    });
  });
  
  describe('GET /api/retrieval/queue', () => {
    it('should return retrieval queue', async () => {
      const res = await request(app)
        .get('/api/retrieval/queue')
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.requests)).toBe(true);
    });
    
    it('should include vehicle details in queue', async () => {
      const vehicle = createTestVehicle(db, {
        unique_card_id: 'QUEUE_DETAIL_TEST',
        license_plate: 'QUE123',
        hook_number: 18
      });
      
      createTestRequest(db, vehicle.unique_card_id);
      
      const res = await request(app)
        .get('/api/retrieval/queue')
        .expect(200);
      
      const queuedRequest = res.body.requests.find(
        r => r.unique_card_id === vehicle.unique_card_id
      );
      
      expect(queuedRequest).toBeDefined();
      expect(queuedRequest.license_plate).toBe('QUE123');
    });
  });
  
  describe('POST /api/retrieval/:taskId/accept', () => {
    it('should allow driver to accept task', async () => {
      const vehicle = createTestVehicle(db, {
        unique_card_id: 'ACCEPT_TEST',
        hook_number: 19
      });
      const driver = createTestDriver(db);
      const request_obj = createTestRequest(db, vehicle.unique_card_id);
      
      const res = await request(app)
        .post(`/api/retrieval/${request_obj.id}/accept`)
        .send({ driverId: driver.id })
        .expect(200);
      
      expect(res.body.success).toBe(true);
      
      // Verify assignment
      const updated = db.prepare('SELECT assigned_driver_id, status FROM retrieval_requests WHERE id = ?')
        .get(request_obj.id);
      expect(updated.assigned_driver_id).toBe(driver.id);
      expect(updated.status).toBe('assigned');
    });
    
    it('should reject accept without driver ID', async () => {
      const vehicle = createTestVehicle(db, {
        unique_card_id: 'ACCEPT_NO_DRIVER',
        hook_number: 20
      });
      const request_obj = createTestRequest(db, vehicle.unique_card_id);
      
      const res = await request(app)
        .post(`/api/retrieval/${request_obj.id}/accept`)
        .send({})
        .expect(400);
      
      expect(res.body.success).toBe(false);
    });
  });
  
  describe('POST /api/retrieval/:taskId/car-ready', () => {
    it('should mark car as ready', async () => {
      const vehicle = createTestVehicle(db, {
        unique_card_id: 'READY_TEST',
        hook_number: 21
      });
      const request_obj = createTestRequest(db, vehicle.unique_card_id, { status: 'assigned' });
      
      const res = await request(app)
        .post(`/api/retrieval/${request_obj.id}/car-ready`)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      
      // Verify status
      const updated = db.prepare('SELECT status, car_ready_at FROM retrieval_requests WHERE id = ?')
        .get(request_obj.id);
      expect(updated.status).toBe('ready');
      expect(updated.car_ready_at).toBeDefined();
    });
  });
  
  describe('POST /api/retrieval/:taskId/handover-keys', () => {
    it('should complete retrieval and release hook', async () => {
      const vehicle = createTestVehicle(db, {
        unique_card_id: 'HANDOVER_TEST',
        hook_number: 22
      });
      const request_obj = createTestRequest(db, vehicle.unique_card_id, { status: 'ready' });
      
      const res = await request(app)
        .post(`/api/retrieval/${request_obj.id}/handover-keys`)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      
      // Verify request completed
      const updatedReq = db.prepare('SELECT status FROM retrieval_requests WHERE id = ?')
        .get(request_obj.id);
      expect(updatedReq.status).toBe('completed');
      
      // Verify vehicle retrieved
      const updatedVehicle = db.prepare('SELECT status FROM vehicles WHERE unique_card_id = ?')
        .get(vehicle.unique_card_id);
      expect(updatedVehicle.status).toBe('retrieved');
      
      // Verify hook released
      const hook = db.prepare('SELECT status FROM hooks WHERE hook_number = ?').get(22);
      expect(hook.status).toBe('available');
    });
  });
  
  describe('POST /api/retrieval/complete', () => {
    it('should complete retrieval by card ID', async () => {
      const vehicle = createTestVehicle(db, {
        unique_card_id: 'COMPLETE_BY_CARD',
        hook_number: 23
      });
      createTestRequest(db, vehicle.unique_card_id, { status: 'ready' });
      
      const res = await request(app)
        .post('/api/retrieval/complete')
        .send({ cardId: vehicle.unique_card_id })
        .expect(200);
      
      expect(res.body.success).toBe(true);
    });
    
    it('should require cardId or requestId', async () => {
      const res = await request(app)
        .post('/api/retrieval/complete')
        .send({})
        .expect(400);
      
      expect(res.body.success).toBe(false);
    });
  });
  
  describe('GET /api/retrieval/pending-handovers', () => {
    it('should return cars ready for handover', async () => {
      const vehicle = createTestVehicle(db, {
        unique_card_id: 'PENDING_HANDOVER_TEST',
        hook_number: 24
      });
      createTestRequest(db, vehicle.unique_card_id, { status: 'ready' });
      
      const res = await request(app)
        .get('/api/retrieval/pending-handovers')
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.handovers)).toBe(true);
      
      const handover = res.body.handovers.find(
        h => h.unique_card_id === vehicle.unique_card_id
      );
      expect(handover).toBeDefined();
    });
  });
  
  describe('POST /api/retrieval/:requestId/payment-method', () => {
    it('should update payment method', async () => {
      const vehicle = createTestVehicle(db, {
        unique_card_id: 'PAYMENT_METHOD_TEST',
        hook_number: 25
      });
      const request_obj = createTestRequest(db, vehicle.unique_card_id);
      
      const res = await request(app)
        .post(`/api/retrieval/${request_obj.id}/payment-method`)
        .send({ paymentMethod: 'cash' })
        .expect(200);
      
      expect(res.body.success).toBe(true);
      
      const updated = db.prepare('SELECT payment_method FROM retrieval_requests WHERE id = ?')
        .get(request_obj.id);
      expect(updated.payment_method).toBe('cash');
    });
    
    it('should reject invalid payment method', async () => {
      const vehicle = createTestVehicle(db, {
        unique_card_id: 'INVALID_PAY_TEST',
        hook_number: 26
      });
      const request_obj = createTestRequest(db, vehicle.unique_card_id);
      
      const res = await request(app)
        .post(`/api/retrieval/${request_obj.id}/payment-method`)
        .send({ paymentMethod: 'bitcoin' })
        .expect(400);
      
      expect(res.body.success).toBe(false);
    });
  });
});
