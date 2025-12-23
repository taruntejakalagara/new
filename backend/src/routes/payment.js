/**
 * Payment Routes
 * Handles payment processing, pricing, and transactions
 */
const express = require('express');
const router = express.Router();
const { payment: paymentValidators, validatePagination } = require('../middleware/validation');

/**
 * GET /api/payment/pricing
 * Get current pricing configuration
 */
router.get('/pricing', (req, res) => {
  const db = req.app.get('db');
  try {
    // Ensure settings table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    
    const baseFee = db.prepare("SELECT value FROM settings WHERE key = 'base_fee'").get();
    const priorityFee = db.prepare("SELECT value FROM settings WHERE key = 'priority_fee'").get();
    const hourlyRate = db.prepare("SELECT value FROM settings WHERE key = 'hourly_rate'").get();
    const surgeMultiplier = db.prepare("SELECT value FROM settings WHERE key = 'surge_multiplier'").get();
    const surgeEnabled = db.prepare("SELECT value FROM settings WHERE key = 'surge_enabled'").get();
    
    const baseAmount = baseFee ? parseFloat(baseFee.value) : 15;
    const priorityAmount = priorityFee ? parseFloat(priorityFee.value) : 10;
    const hourly = hourlyRate ? parseFloat(hourlyRate.value) : 5;
    const surge = surgeMultiplier ? parseFloat(surgeMultiplier.value) : 1.0;
    const surgeOn = surgeEnabled ? surgeEnabled.value === 'true' : false;
    
    res.json({
      success: true,
      pricing: {
        base_fee: baseAmount,
        base_valet_fee: baseAmount,
        priority_fee: priorityAmount,
        hourly_rate: hourly,
        surge_multiplier: surge,
        surge_enabled: surgeOn,
        currency: 'USD'
      }
    });
  } catch (error) {
    console.error('Error getting pricing:', error);
    // Return defaults on error
    res.json({
      success: true,
      pricing: { 
        base_fee: 15, 
        base_valet_fee: 15, 
        priority_fee: 10, 
        hourly_rate: 5,
        surge_multiplier: 1.0, 
        surge_enabled: false, 
        currency: 'USD' 
      }
    });
  }
});

/**
 * POST /api/payment/pricing
 * Update pricing configuration
 */
router.post('/pricing', paymentValidators.updatePricing, (req, res) => {
  const db = req.app.get('db');
  try {
    const { base_fee, base_valet_fee, priority_fee, hourly_rate, surge_multiplier, surge_enabled } = req.body;
    
    // Ensure settings table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    
    const updateSetting = (key, value) => {
      if (value !== undefined) {
        db.prepare(`
          INSERT OR REPLACE INTO settings (key, value, updated_at) 
          VALUES (?, ?, datetime('now'))
        `).run(key, value.toString());
      }
    };
    
    // Support both naming conventions
    updateSetting('base_fee', base_fee || base_valet_fee);
    updateSetting('priority_fee', priority_fee);
    updateSetting('hourly_rate', hourly_rate);
    updateSetting('surge_multiplier', surge_multiplier);
    updateSetting('surge_enabled', surge_enabled);
    
    console.log('✅ Pricing updated:', { base_fee, priority_fee, hourly_rate, surge_multiplier, surge_enabled });
    res.json({ success: true, message: 'Pricing updated successfully' });
  } catch (error) {
    console.error('Error updating pricing:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/payment/process
 * Process an online payment
 */
router.post('/process', paymentValidators.process, (req, res) => {
  const db = req.app.get('db');
  try {
    const { requestId, amount, paymentMethod, tipAmount, cardDetails } = req.body;
    
    console.log('💳 Processing payment:', { requestId, amount, paymentMethod, tipAmount });

    // Verify request exists
    const request = db.prepare('SELECT * FROM retrieval_requests WHERE id = ?').get(requestId);
    if (!request) {
      return res.status(404).json({ 
        success: false, 
        message: 'Request not found' 
      });
    }

    // In a real implementation, you would:
    // 1. Integrate with Stripe/Square/etc.
    // 2. Process the card payment
    // 3. Handle success/failure

    // For now, simulate successful payment
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const totalAmount = (amount || 15) + (tipAmount || 0);
    
    // Update the retrieval request with payment info
    const stmt = db.prepare(`
      UPDATE retrieval_requests 
      SET payment_method = 'online',
          payment_processed = 1,
          amount = ?,
          tip_amount = ?
      WHERE id = ?
    `);
    
    const result = stmt.run(amount || 15, tipAmount || 0, requestId);
    
    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Failed to update request' 
      });
    }
    
    console.log(`✅ Payment processed for request ${requestId}: $${amount} + $${tipAmount} tip`);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('paymentProcessed', { 
        requestId, 
        transactionId,
        amount,
        tipAmount 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Payment processed successfully',
      transactionId: transactionId,
      amount: amount || 15,
      tip: tipAmount || 0,
      total: totalAmount
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/payment/cash
 * Record a cash payment
 */
router.post('/cash', paymentValidators.process, (req, res) => {
  const db = req.app.get('db');
  try {
    const { requestId, amount, tipAmount, collectedBy } = req.body;

    const result = db.prepare(`
      UPDATE retrieval_requests 
      SET payment_method = 'cash',
          payment_processed = 1,
          amount = ?,
          tip_amount = ?
      WHERE id = ?
    `).run(amount || 15, tipAmount || 0, requestId);
    
    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Request not found' 
      });
    }
    
    console.log(`✅ Cash payment recorded for request ${requestId}: $${amount} by ${collectedBy}`);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('cashCollected', { requestId, amount, tipAmount });
    }
    
    res.json({ 
      success: true, 
      message: 'Cash payment recorded',
      amount: amount || 15,
      tip: tipAmount || 0
    });
  } catch (error) {
    console.error('Error recording cash payment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/payment/calculate/:cardId
 * Calculate fee for a parked vehicle
 */
router.get('/calculate/:cardId', paymentValidators.calculateFee, (req, res) => {
  const db = req.app.get('db');
  try {
    const { cardId } = req.params;
    const { isPriority } = req.query;
    
    // Get vehicle
    const vehicle = db.prepare(`
      SELECT * FROM vehicles WHERE unique_card_id = ? AND status = 'parked'
    `).get(cardId);
    
    if (!vehicle) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vehicle not found' 
      });
    }
    
    // Get pricing
    const baseFeeRow = db.prepare("SELECT value FROM settings WHERE key = 'base_fee'").get();
    const priorityFeeRow = db.prepare("SELECT value FROM settings WHERE key = 'priority_fee'").get();
    const hourlyRateRow = db.prepare("SELECT value FROM settings WHERE key = 'hourly_rate'").get();
    const surgeRow = db.prepare("SELECT value FROM settings WHERE key = 'surge_multiplier'").get();
    const surgeEnabledRow = db.prepare("SELECT value FROM settings WHERE key = 'surge_enabled'").get();
    
    const baseFee = baseFeeRow ? parseFloat(baseFeeRow.value) : 15;
    const priorityFee = priorityFeeRow ? parseFloat(priorityFeeRow.value) : 10;
    const hourlyRate = hourlyRateRow ? parseFloat(hourlyRateRow.value) : 5;
    const surgeMultiplier = surgeRow ? parseFloat(surgeRow.value) : 1.0;
    const surgeEnabled = surgeEnabledRow ? surgeEnabledRow.value === 'true' : false;
    
    // Calculate duration
    const checkin = new Date(vehicle.check_in_time);
    const now = new Date();
    const hours = Math.ceil((now - checkin) / (1000 * 60 * 60));
    
    // Calculate fee
    let totalFee = baseFee;
    if (hours > 1) {
      totalFee += (hours - 1) * hourlyRate;
    }
    if (isPriority === 'true') {
      totalFee += priorityFee;
    }
    if (surgeEnabled) {
      totalFee *= surgeMultiplier;
    }
    
    res.json({
      success: true,
      calculation: {
        cardId,
        parkingDuration: hours,
        baseFee,
        hourlyRate,
        hourlyCharges: hours > 1 ? (hours - 1) * hourlyRate : 0,
        priorityFee: isPriority === 'true' ? priorityFee : 0,
        surgeMultiplier: surgeEnabled ? surgeMultiplier : 1.0,
        totalFee: Math.round(totalFee * 100) / 100
      }
    });
  } catch (error) {
    console.error('Error calculating fee:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/payment/history
 * Get payment history
 */
router.get('/history', (req, res) => {
  const db = req.app.get('db');
  try {
    const { limit = 50, offset = 0, startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        r.id,
        r.unique_card_id,
        r.amount,
        r.tip_amount,
        r.payment_method,
        r.payment_processed,
        r.completed_at,
        v.license_plate,
        v.make,
        v.model
      FROM retrieval_requests r
      JOIN vehicles v ON r.unique_card_id = v.unique_card_id
      WHERE r.payment_processed = 1
    `;
    
    const params = [];
    
    if (startDate) {
      query += ' AND DATE(r.completed_at) >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND DATE(r.completed_at) <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY r.completed_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const payments = db.prepare(query).all(...params);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as count 
      FROM retrieval_requests 
      WHERE payment_processed = 1
    `;
    const countParams = [];
    
    if (startDate) {
      countQuery += ' AND DATE(completed_at) >= ?';
      countParams.push(startDate);
    }
    if (endDate) {
      countQuery += ' AND DATE(completed_at) <= ?';
      countParams.push(endDate);
    }
    
    const total = db.prepare(countQuery).get(...countParams);
    
    res.json({ 
      success: true, 
      payments,
      total: total.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error getting payment history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
