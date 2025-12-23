/**
 * Retrieval Routes
 * Handles vehicle retrieval requests, queue management, and completion
 */
const express = require('express');
const router = express.Router();
const { retrieval: retrievalValidators } = require('../middleware/validation');

/**
 * POST /api/retrieval/request
 * Create a new retrieval request
 */
router.post('/request', retrievalValidators.request, (req, res) => {
  const db = req.app.get('db');
  try {
    const { unique_card_id, is_priority } = req.body;
    
    console.log('🚗 Retrieval request:', { unique_card_id, is_priority });

    // Check if vehicle exists and is parked
    const vehicle = db.prepare(`
      SELECT * FROM vehicles 
      WHERE unique_card_id = ? AND status = 'parked'
    `).get(unique_card_id);
    
    if (!vehicle) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vehicle not found or already retrieved' 
      });
    }

    // Check for existing pending/active request
    const existingRequest = db.prepare(`
      SELECT * FROM retrieval_requests 
      WHERE unique_card_id = ? 
      AND status IN ('pending', 'assigned', 'in_progress', 'ready')
    `).get(unique_card_id);
    
    if (existingRequest) {
      return res.json({
        success: false,
        alreadyRequested: true,
        message: 'Your vehicle has already been requested and is being retrieved',
        requestId: existingRequest.id,
        status: existingRequest.status,
        vehicle: vehicle
      });
    }

    // Get current pricing
    const baseFeeRow = db.prepare("SELECT value FROM settings WHERE key = 'base_fee'").get();
    const priorityFeeRow = db.prepare("SELECT value FROM settings WHERE key = 'priority_fee'").get();
    
    const baseAmount = baseFeeRow ? parseFloat(baseFeeRow.value) : 15;
    const priorityAmount = priorityFeeRow ? parseFloat(priorityFeeRow.value) : 10;
    const totalAmount = is_priority ? baseAmount + priorityAmount : baseAmount;

    // Create retrieval request
    const stmt = db.prepare(`
      INSERT INTO retrieval_requests (
        unique_card_id, is_priority, payment_method, status, amount, requested_at
      )
      VALUES (?, ?, 'pending', 'pending', ?, datetime('now'))
    `);
    
    const result = stmt.run(unique_card_id, is_priority ? 1 : 0, totalAmount);
    const requestId = result.lastInsertRowid;
    
    console.log('✅ Request created:', requestId);

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('newRetrievalRequest', {
        requestId,
        vehicle,
        is_priority: is_priority ? 1 : 0,
        amount: totalAmount
      });
    }

    res.json({
      success: true,
      message: 'Retrieval request created',
      requestId: requestId,
      amount: totalAmount,
      vehicle: vehicle
    });
  } catch (error) {
    console.error('❌ Error creating request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/retrieval/queue
 * Get the retrieval queue (pending requests)
 */
router.get('/queue', (req, res) => {
  const db = req.app.get('db');
  try {
    const requests = db.prepare(`
      SELECT 
        r.*,
        v.license_plate,
        v.make,
        v.model,
        v.color,
        v.hook_number,
        d.fullName as driver_name
      FROM retrieval_requests r
      JOIN vehicles v ON r.unique_card_id = v.unique_card_id
      LEFT JOIN drivers d ON r.assigned_driver_id = d.id
      WHERE r.status IN ('pending', 'assigned', 'in_progress')
      ORDER BY r.is_priority DESC, r.requested_at ASC
    `).all();

    res.json({ success: true, requests });
  } catch (error) {
    console.error('Error getting queue:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/retrieval/pending-handovers
 * Get cars that are ready for handover
 */
router.get('/pending-handovers', (req, res) => {
  const db = req.app.get('db');
  try {
    const handovers = db.prepare(`
      SELECT 
        r.*, 
        v.license_plate, 
        v.make, 
        v.model, 
        v.color, 
        v.hook_number,
        d.fullName as driver_name
      FROM retrieval_requests r
      JOIN vehicles v ON r.unique_card_id = v.unique_card_id
      LEFT JOIN drivers d ON r.assigned_driver_id = d.id
      WHERE r.status = 'ready'
      ORDER BY r.car_ready_at ASC
    `).all();
    
    res.json({ success: true, handovers });
  } catch (error) {
    console.error('Error getting pending handovers:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/retrieval/:taskId/accept
 * Driver accepts a retrieval task
 */
router.post('/:taskId/accept', retrievalValidators.accept, (req, res) => {
  const db = req.app.get('db');
  try {
    const { taskId } = req.params;
    const { driverId } = req.body;

    const result = db.prepare(`
      UPDATE retrieval_requests 
      SET assigned_driver_id = ?, 
          status = 'assigned', 
          assigned_at = datetime('now')
      WHERE id = ? AND status = 'pending'
    `).run(driverId, taskId);

    if (result.changes === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Task not found or already assigned' 
      });
    }
    
    console.log(`✅ Task ${taskId} accepted by driver ${driverId}`);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('taskAccepted', { taskId, driverId });
    }

    res.json({ success: true, message: 'Task accepted' });
  } catch (error) {
    console.error('Error accepting task:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/retrieval/:taskId/car-ready
 * Mark car as ready for pickup
 */
router.post('/:taskId/car-ready', retrievalValidators.taskId, (req, res) => {
  const db = req.app.get('db');
  try {
    const { taskId } = req.params;
    
    const result = db.prepare(`
      UPDATE retrieval_requests 
      SET status = 'ready', 
          car_ready_at = datetime('now')
      WHERE id = ?
    `).run(taskId);

    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Task not found' 
      });
    }
    
    console.log(`✅ Car ready for task ${taskId}`);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('carReady', { taskId });
    }

    res.json({ success: true, message: 'Car marked as ready' });
  } catch (error) {
    console.error('Error marking car ready:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/retrieval/:taskId/complete
 * Complete retrieval (alternative endpoint)
 */
router.post('/:taskId/complete', (req, res) => {
  const db = req.app.get('db');
  try {
    const { taskId } = req.params;
    const { driverId } = req.body;
    
    db.prepare(`
      UPDATE retrieval_requests 
      SET status = 'ready', 
          car_ready_at = datetime('now')
      WHERE id = ? AND assigned_driver_id = ?
    `).run(taskId, driverId);
    
    console.log(`✅ Task ${taskId} marked as ready by driver ${driverId}`);
    res.json({ success: true, message: 'Car marked as ready' });
  } catch (error) {
    console.error('Error completing retrieval:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/retrieval/:taskId/handover-keys
 * Complete the handover (keys given to customer)
 */
router.post('/:taskId/handover-keys', retrievalValidators.taskId, (req, res) => {
  const db = req.app.get('db');
  const hookManager = req.app.get('hookManager');
  
  try {
    const { taskId } = req.params;
    
    // Get the request to find the vehicle
    const request = db.prepare(`
      SELECT r.*, v.hook_number, v.unique_card_id 
      FROM retrieval_requests r
      JOIN vehicles v ON r.unique_card_id = v.unique_card_id
      WHERE r.id = ?
    `).get(taskId);

    if (!request) {
      return res.status(404).json({ 
        success: false, 
        message: 'Request not found' 
      });
    }

    // Update request status
    db.prepare(`
      UPDATE retrieval_requests 
      SET status = 'completed', 
          keys_handed_at = datetime('now'), 
          completed_at = datetime('now')
      WHERE id = ?
    `).run(taskId);

    // Update vehicle status
    db.prepare(`
      UPDATE vehicles 
      SET status = 'retrieved', 
          check_out_time = datetime('now')
      WHERE unique_card_id = ?
    `).run(request.unique_card_id);

    // Release the hook
    if (request.hook_number && hookManager) {
      hookManager.releaseHook(request.hook_number);
      console.log(`✅ Hook ${request.hook_number} released`);
    }
    
    console.log(`✅ Keys handed for task ${taskId}`);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('retrievalCompleted', { taskId });
    }

    res.json({ success: true, message: 'Keys handed over, retrieval completed' });
  } catch (error) {
    console.error('Error handing over keys:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/retrieval/complete
 * Complete retrieval by card ID
 */
router.post('/complete', retrievalValidators.complete, (req, res) => {
  const db = req.app.get('db');
  const hookManager = req.app.get('hookManager');
  
  try {
    const { cardId, requestId, driverId } = req.body;
    
    console.log('📦 Completing retrieval:', { cardId, requestId, driverId });

    // Get the vehicle
    let vehicle;
    if (cardId) {
      vehicle = db.prepare('SELECT * FROM vehicles WHERE unique_card_id = ?').get(cardId);
    } else {
      const request = db.prepare('SELECT unique_card_id FROM retrieval_requests WHERE id = ?').get(requestId);
      if (request) {
        vehicle = db.prepare('SELECT * FROM vehicles WHERE unique_card_id = ?').get(request.unique_card_id);
      }
    }
    
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    // Update vehicle status
    db.prepare(`
      UPDATE vehicles 
      SET status = 'retrieved', 
          check_out_time = datetime('now')
      WHERE unique_card_id = ?
    `).run(vehicle.unique_card_id);

    // Update retrieval request
    db.prepare(`
      UPDATE retrieval_requests 
      SET status = 'completed', 
          completed_at = datetime('now'),
          assigned_driver_id = COALESCE(assigned_driver_id, ?)
      WHERE unique_card_id = ? AND status != 'completed'
    `).run(driverId, vehicle.unique_card_id);

    // Release the hook
    if (vehicle.hook_number && hookManager) {
      hookManager.releaseHook(vehicle.hook_number);
      console.log(`✅ Hook ${vehicle.hook_number} released`);
    }

    console.log(`✅ Retrieval completed for card ${vehicle.unique_card_id}`);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('retrievalCompleted', { 
        cardId: vehicle.unique_card_id,
        hookNumber: vehicle.hook_number 
      });
    }

    res.json({ success: true, message: 'Retrieval completed' });
  } catch (error) {
    console.error('Error completing retrieval:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/retrieval/:requestId/payment-method
 * Update payment method for a request
 */
router.post('/:requestId/payment-method', retrievalValidators.paymentMethod, (req, res) => {
  const db = req.app.get('db');
  try {
    const { requestId } = req.params;
    const { paymentMethod } = req.body;

    db.prepare(`
      UPDATE retrieval_requests 
      SET payment_method = ? 
      WHERE id = ?
    `).run(paymentMethod, requestId);
    
    console.log(`✅ Payment method updated for request ${requestId}: ${paymentMethod}`);
    res.json({ success: true, message: 'Payment method updated' });
  } catch (error) {
    console.error('Error updating payment method:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/retrieval/:taskId/collect-cash
 * Collect cash payment
 */
router.post('/:taskId/collect-cash', retrievalValidators.collectCash, (req, res) => {
  const db = req.app.get('db');
  try {
    const { taskId } = req.params;
    const { amount } = req.body;
    
    db.prepare(`
      UPDATE retrieval_requests 
      SET payment_method = 'cash',
          payment_processed = 1, 
          amount = ?
      WHERE id = ?
    `).run(amount || 15, taskId);
    
    console.log(`✅ Cash collected for task ${taskId}: $${amount}`);
    res.json({ success: true, message: 'Cash collected' });
  } catch (error) {
    console.error('Error collecting cash:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/retrieval/:requestId/status
 * Get status of a specific retrieval request
 */
router.get('/:requestId/status', (req, res) => {
  const db = req.app.get('db');
  try {
    const { requestId } = req.params;
    
    const request = db.prepare(`
      SELECT 
        r.*,
        v.license_plate,
        v.make,
        v.model,
        v.color,
        v.hook_number,
        d.fullName as driver_name
      FROM retrieval_requests r
      JOIN vehicles v ON r.unique_card_id = v.unique_card_id
      LEFT JOIN drivers d ON r.assigned_driver_id = d.id
      WHERE r.id = ?
    `).get(requestId);

    if (!request) {
      return res.status(404).json({ 
        success: false, 
        message: 'Request not found' 
      });
    }

    res.json({ success: true, request });
  } catch (error) {
    console.error('Error getting request status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/retrieval/:requestId/cancel
 * Cancel a retrieval request
 */
router.post('/:requestId/cancel', (req, res) => {
  const db = req.app.get('db');
  try {
    const { requestId } = req.params;
    
    const result = db.prepare(`
      UPDATE retrieval_requests 
      SET status = 'cancelled', 
          completed_at = datetime('now')
      WHERE id = ? AND status IN ('pending', 'assigned')
    `).run(requestId);

    if (result.changes === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot cancel - request not found or already in progress' 
      });
    }

    console.log(`✅ Request ${requestId} cancelled`);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('requestCancelled', { requestId });
    }

    res.json({ success: true, message: 'Request cancelled' });
  } catch (error) {
    console.error('Error cancelling request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
