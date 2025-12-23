const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'valet.db');
// Using db from app.set instead

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// Get statistics
router.get('/stats', (req, res) => {
  const db = req.app.get('db');
  try {
    const parkedCount = db.prepare('SELECT COUNT(*) as count FROM vehicles WHERE status = ?').get('parked');
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM vehicles').get();
    
    // Daily stats
    const todayCheckins = db.prepare(`
      SELECT COUNT(*) as count FROM vehicles 
      WHERE date(check_in_time) = date('now')
    `).get();
    
    const todayRetrievals = db.prepare(`
      SELECT COUNT(*) as count FROM retrieval_requests 
      WHERE date(completed_at) = date('now') AND status = 'completed'
    `).get();
    
    const todayRevenue = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM retrieval_requests 
      WHERE date(completed_at) = date('now') AND status = 'completed'
    `).get();
    
    const pendingRequests = db.prepare(`
      SELECT COUNT(*) as count FROM retrieval_requests 
      WHERE status IN ('pending', 'assigned', 'keys_picked', 'walking', 'driving', 'ready')
    `).get();
    
    // Average wait time (from request to completion) - today
    const avgWaitTime = db.prepare(`
      SELECT AVG(
        (julianday(completed_at) - julianday(requested_at)) * 24 * 60
      ) as avg_minutes
      FROM retrieval_requests 
      WHERE date(completed_at) = date('now') 
      AND status = 'completed'
      AND completed_at IS NOT NULL 
      AND requested_at IS NOT NULL
    `).get();
    
    res.json({
      success: true,
      parked: parkedCount.count,
      total: totalCount.count,
      today: {
        checkins: todayCheckins.count,
        retrievals: todayRetrievals.count,
        revenue: todayRevenue.total,
        pending: pendingRequests.count,
        avgWaitMinutes: avgWaitTime.avg_minutes ? Math.round(avgWaitTime.avg_minutes * 10) / 10 : null
      }
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// DAILY CLOSEOUT REPORT
// ============================================
router.get('/reports/daily-closeout', (req, res) => {
  const db = req.app.get('db');
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Total check-ins
    const checkins = db.prepare(`
      SELECT COUNT(*) as count FROM vehicles 
      WHERE date(check_in_time) = ?
    `).get(targetDate);
    
    // Total retrievals
    const retrievals = db.prepare(`
      SELECT COUNT(*) as count FROM retrieval_requests 
      WHERE date(completed_at) = ? AND status = 'completed'
    `).get(targetDate);
    
    // Revenue breakdown
    const revenue = db.prepare(`
      SELECT 
        COALESCE(SUM(amount), 0) as total,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END), 0) as cash,
        COALESCE(SUM(CASE WHEN payment_method = 'card' THEN amount ELSE 0 END), 0) as card,
        COALESCE(SUM(CASE WHEN payment_method = 'online' THEN amount ELSE 0 END), 0) as online,
        COALESCE(SUM(tip_amount), 0) as tips
      FROM retrieval_requests 
      WHERE date(completed_at) = ? AND status = 'completed'
    `).get(targetDate);
    
    // Priority requests
    const priority = db.prepare(`
      SELECT COUNT(*) as count FROM retrieval_requests 
      WHERE date(completed_at) = ? AND status = 'completed' AND is_priority = 1
    `).get(targetDate);
    
    // Average wait time
    const avgWait = db.prepare(`
      SELECT AVG(
        (julianday(completed_at) - julianday(requested_at)) * 24 * 60
      ) as avg_minutes
      FROM retrieval_requests 
      WHERE date(completed_at) = ? AND status = 'completed'
      AND completed_at IS NOT NULL AND requested_at IS NOT NULL
    `).get(targetDate);
    
    // Peak hours
    const peakHours = db.prepare(`
      SELECT 
        strftime('%H', requested_at) as hour,
        COUNT(*) as count
      FROM retrieval_requests 
      WHERE date(requested_at) = ?
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 3
    `).all(targetDate);
    
    // Driver performance
    const driverStats = db.prepare(`
      SELECT 
        d.fullName as driver_name,
        COUNT(r.id) as retrievals,
        COALESCE(SUM(r.tip_amount), 0) as tips,
        AVG((julianday(r.completed_at) - julianday(r.requested_at)) * 24 * 60) as avg_time
      FROM retrieval_requests r
      LEFT JOIN drivers d ON r.assigned_driver_id = d.id
      WHERE date(r.completed_at) = ? AND r.status = 'completed'
      GROUP BY r.assigned_driver_id
      ORDER BY retrievals DESC
    `).all(targetDate);
    
    // Vehicles still parked from this day
    const stillParked = db.prepare(`
      SELECT COUNT(*) as count FROM vehicles 
      WHERE date(check_in_time) = ? AND status = 'parked'
    `).get(targetDate);
    
    res.json({
      success: true,
      date: targetDate,
      summary: {
        checkins: checkins.count,
        retrievals: retrievals.count,
        stillParked: stillParked.count,
        priorityRequests: priority.count
      },
      revenue: {
        total: revenue.total,
        cash: revenue.cash,
        card: revenue.card,
        online: revenue.online,
        tips: revenue.tips,
        grandTotal: revenue.total + revenue.tips
      },
      performance: {
        avgWaitMinutes: avgWait.avg_minutes ? Math.round(avgWait.avg_minutes * 10) / 10 : null,
        peakHours: peakHours.map(h => ({ hour: parseInt(h.hour), count: h.count }))
      },
      drivers: driverStats.map(d => ({
        name: d.driver_name || 'Unknown',
        retrievals: d.retrievals,
        tips: d.tips,
        avgTimeMinutes: d.avg_time ? Math.round(d.avg_time * 10) / 10 : null
      }))
    });
  } catch (error) {
    console.error('Error generating closeout report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// SHIFT MANAGEMENT
// ============================================

// Start a shift
router.post('/shifts/start', (req, res) => {
  const db = req.app.get('db');
  try {
    const { driverId, startCash } = req.body;
    
    if (!driverId) {
      return res.status(400).json({ success: false, message: 'Driver ID required' });
    }
    
    // Ensure table exists with all needed columns
    db.exec(`
      CREATE TABLE IF NOT EXISTS driver_shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_id INTEGER NOT NULL,
        start_time TEXT DEFAULT (datetime('now')),
        end_time TEXT,
        start_cash REAL DEFAULT 0,
        end_cash REAL DEFAULT 0,
        retrievals INTEGER DEFAULT 0,
        cash_collected REAL DEFAULT 0,
        tips REAL DEFAULT 0,
        notes TEXT,
        status TEXT DEFAULT 'active',
        FOREIGN KEY (driver_id) REFERENCES drivers(id)
      )
    `);
    
    // Check for existing open shift
    const existingShift = db.prepare(`
      SELECT * FROM driver_shifts 
      WHERE driver_id = ? AND end_time IS NULL
    `).get(driverId);
    
    if (existingShift) {
      return res.status(400).json({ 
        success: false, 
        message: 'Driver already has an open shift',
        shift: existingShift
      });
    }
    
    // Create new shift
    const result = db.prepare(`
      INSERT INTO driver_shifts (driver_id, start_time, start_cash, status)
      VALUES (?, datetime('now'), ?, 'active')
    `).run(driverId, startCash || 0);
    
    console.log(`✅ Shift started for driver ${driverId}`);
    
    res.json({
      success: true,
      message: 'Shift started',
      shiftId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Error starting shift:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// End a shift
router.post('/shifts/end', (req, res) => {
  const db = req.app.get('db');
  try {
    const { driverId, endCash, notes } = req.body;
    
    if (!driverId) {
      return res.status(400).json({ success: false, message: 'Driver ID required' });
    }
    
    // Find open shift
    const shift = db.prepare(`
      SELECT * FROM driver_shifts 
      WHERE driver_id = ? AND end_time IS NULL
    `).get(driverId);
    
    if (!shift) {
      return res.status(404).json({ success: false, message: 'No open shift found' });
    }
    
    // Calculate shift stats
    const shiftStats = db.prepare(`
      SELECT 
        COUNT(*) as retrievals,
        COALESCE(SUM(amount), 0) as revenue,
        COALESCE(SUM(tip_amount), 0) as tips,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END), 0) as cash_collected
      FROM retrieval_requests 
      WHERE assigned_driver_id = ? 
      AND status = 'completed'
      AND completed_at >= ?
    `).get(driverId, shift.start_time);
    
    // Update shift
    db.prepare(`
      UPDATE driver_shifts 
      SET end_time = datetime('now'),
          end_cash = ?,
          retrievals = ?,
          cash_collected = ?,
          tips = ?,
          notes = ?,
          status = 'completed'
      WHERE id = ?
    `).run(endCash || 0, shiftStats.retrievals, shiftStats.cash_collected, shiftStats.tips, notes || '', shift.id);
    
    console.log(`✅ Shift ended for driver ${driverId}: ${shiftStats.retrievals} retrievals, $${shiftStats.cash_collected} cash`);
    
    res.json({
      success: true,
      message: 'Shift ended',
      summary: {
        shiftId: shift.id,
        startTime: shift.start_time,
        endTime: new Date().toISOString(),
        retrievals: shiftStats.retrievals,
        revenue: shiftStats.revenue,
        tips: shiftStats.tips,
        cashCollected: shiftStats.cash_collected,
        startCash: shift.start_cash,
        endCash: endCash || 0,
        cashDifference: (endCash || 0) - (shift.start_cash || 0) - shiftStats.cash_collected
      }
    });
  } catch (error) {
    console.error('Error ending shift:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get current shift status
router.get('/shifts/current/:driverId', (req, res) => {
  const db = req.app.get('db');
  try {
    const { driverId } = req.params;
    
    const shift = db.prepare(`
      SELECT * FROM driver_shifts 
      WHERE driver_id = ? AND end_time IS NULL
    `).get(driverId);
    
    if (!shift) {
      return res.json({ success: true, hasActiveShift: false });
    }
    
    // Get current shift stats
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as retrievals,
        COALESCE(SUM(amount), 0) as revenue,
        COALESCE(SUM(tip_amount), 0) as tips,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END), 0) as cash_collected,
        AVG((julianday(completed_at) - julianday(requested_at)) * 24 * 60) as avg_time
      FROM retrieval_requests 
      WHERE assigned_driver_id = ? 
      AND status = 'completed'
      AND completed_at >= ?
    `).get(driverId, shift.start_time);
    
    const hoursWorked = (new Date() - new Date(shift.start_time)) / (1000 * 60 * 60);
    
    res.json({
      success: true,
      hasActiveShift: true,
      shift: {
        id: shift.id,
        startTime: shift.start_time,
        startCash: shift.start_cash,
        hoursWorked: Math.round(hoursWorked * 10) / 10,
        retrievals: stats.retrievals,
        revenue: stats.revenue,
        tips: stats.tips,
        cashCollected: stats.cash_collected,
        avgTimeMinutes: stats.avg_time ? Math.round(stats.avg_time * 10) / 10 : null
      }
    });
  } catch (error) {
    console.error('Error getting shift:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get shift history
router.get('/shifts/history/:driverId', (req, res) => {
  const db = req.app.get('db');
  try {
    const { driverId } = req.params;
    const { limit } = req.query;
    
    const shifts = db.prepare(`
      SELECT * FROM driver_shifts 
      WHERE driver_id = ?
      ORDER BY start_time DESC
      LIMIT ?
    `).all(driverId, limit || 10);
    
    res.json({
      success: true,
      shifts: shifts.map(s => ({
        id: s.id,
        startTime: s.start_time,
        endTime: s.end_time,
        status: s.status,
        retrievals: s.retrievals,
        cashCollected: s.cash_collected,
        tips: s.tips,
        startCash: s.start_cash,
        endCash: s.end_cash
      }))
    });
  } catch (error) {
    console.error('Error getting shift history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// WAIT TIME TRACKING
// ============================================
router.get('/analytics/wait-times', (req, res) => {
  const db = req.app.get('db');
  try {
    const { date, days } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const numDays = parseInt(days) || 1;
    
    // Average wait time by hour
    const byHour = db.prepare(`
      SELECT 
        strftime('%H', requested_at) as hour,
        COUNT(*) as count,
        AVG((julianday(completed_at) - julianday(requested_at)) * 24 * 60) as avg_minutes,
        MIN((julianday(completed_at) - julianday(requested_at)) * 24 * 60) as min_minutes,
        MAX((julianday(completed_at) - julianday(requested_at)) * 24 * 60) as max_minutes
      FROM retrieval_requests 
      WHERE date(requested_at) >= date(?, '-' || ? || ' days')
      AND status = 'completed'
      AND completed_at IS NOT NULL
      GROUP BY hour
      ORDER BY hour
    `).all(targetDate, numDays - 1);
    
    // Overall stats
    const overall = db.prepare(`
      SELECT 
        COUNT(*) as total,
        AVG((julianday(completed_at) - julianday(requested_at)) * 24 * 60) as avg_minutes,
        MIN((julianday(completed_at) - julianday(requested_at)) * 24 * 60) as min_minutes,
        MAX((julianday(completed_at) - julianday(requested_at)) * 24 * 60) as max_minutes
      FROM retrieval_requests 
      WHERE date(requested_at) >= date(?, '-' || ? || ' days')
      AND status = 'completed'
      AND completed_at IS NOT NULL
    `).get(targetDate, numDays - 1);
    
    // Priority vs Regular comparison
    const comparison = db.prepare(`
      SELECT 
        is_priority,
        COUNT(*) as count,
        AVG((julianday(completed_at) - julianday(requested_at)) * 24 * 60) as avg_minutes
      FROM retrieval_requests 
      WHERE date(requested_at) >= date(?, '-' || ? || ' days')
      AND status = 'completed'
      AND completed_at IS NOT NULL
      GROUP BY is_priority
    `).all(targetDate, numDays - 1);
    
    res.json({
      success: true,
      period: {
        from: new Date(new Date(targetDate).getTime() - (numDays - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        to: targetDate,
        days: numDays
      },
      overall: {
        totalRetrievals: overall.total,
        avgMinutes: overall.avg_minutes ? Math.round(overall.avg_minutes * 10) / 10 : null,
        minMinutes: overall.min_minutes ? Math.round(overall.min_minutes * 10) / 10 : null,
        maxMinutes: overall.max_minutes ? Math.round(overall.max_minutes * 10) / 10 : null
      },
      byHour: byHour.map(h => ({
        hour: parseInt(h.hour),
        count: h.count,
        avgMinutes: h.avg_minutes ? Math.round(h.avg_minutes * 10) / 10 : null,
        minMinutes: h.min_minutes ? Math.round(h.min_minutes * 10) / 10 : null,
        maxMinutes: h.max_minutes ? Math.round(h.max_minutes * 10) / 10 : null
      })),
      comparison: {
        regular: comparison.find(c => !c.is_priority) || { count: 0, avg_minutes: null },
        priority: comparison.find(c => c.is_priority) || { count: 0, avg_minutes: null }
      }
    });
  } catch (error) {
    console.error('Error getting wait times:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// NEW: GET NEXT AVAILABLE HOOK NUMBER (lowest available)
// ============================================
router.get('/next-hook', (req, res) => {
  const db = req.app.get('db');
  const hookManager = req.app.get('hookManager');
  
  try {
    // Use hookManager to get the lowest available hook
    if (hookManager) {
      const nextHook = hookManager.getNextAvailableHook();
      if (nextHook) {
        return res.json({ 
          success: true,
          hookNumber: nextHook 
        });
      }
    }
    
    // Fallback: Find the lowest hook number not currently in use
    const result = db.prepare(`
      SELECT MIN(h.hook_number) as next_hook
      FROM hooks h
      WHERE h.status = 'available'
      AND NOT EXISTS (
        SELECT 1 FROM vehicles v 
        WHERE v.hook_number = h.hook_number 
        AND v.status = 'parked'
      )
    `).get();
    
    const nextHook = result?.next_hook || 1;
    
    res.json({ 
      success: true,
      hookNumber: nextHook 
    });
  } catch (error) {
    console.error('Error getting next hook:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// UPDATED: Check-in vehicle (WITH NFC VALIDATION)
// ============================================
router.post('/checkin', (req, res) => {
  const hookManager = req.app.get('hookManager');
  const db = req.app.get('db');
  
  try {
    const { unique_card_id, license_plate, make, model, color, year, parking_spot, key_slot } = req.body;
    
    console.log('✅ Check-in request:', { unique_card_id, license_plate, make, model, key_slot });

    // *** NEW: Validate required NFC fields ***
    if (!unique_card_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'NFC card ID is required' 
      });
    }

    if (!license_plate) {
      return res.status(400).json({ 
        success: false, 
        message: 'License plate is required' 
      });
    }

    if (!key_slot) {
      return res.status(400).json({ 
        success: false, 
        message: 'Hook number is required' 
      });
    }

    // *** NEW: Check if card is already in use ***
    const existingCard = db.prepare(`
      SELECT * FROM vehicles 
      WHERE unique_card_id = ? 
      AND status = 'parked'
    `).get(unique_card_id);

    if (existingCard) {
      return res.status(400).json({ 
        success: false,
        message: 'This NFC card is already in use',
        vehicle: existingCard
      });
    }

    // *** NEW: Check if hook is already occupied ***
    const existingHook = db.prepare(`
      SELECT * FROM vehicles 
      WHERE hook_number = ? 
      AND status = 'parked'
    `).get(key_slot);

    if (existingHook) {
      return res.status(400).json({ 
        success: false,
        message: `Hook ${key_slot} is already occupied`,
        vehicle: existingHook
      });
    }

    const stmt = db.prepare(`
      INSERT INTO vehicles (unique_card_id, license_plate, make, model, color, hook_number, sequence_number, status, check_in_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'parked', datetime('now'))
    `);
    
    // Daily sequence number - resets each day
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const dailySeq = db.prepare(`
      SELECT COALESCE(MAX(sequence_number), 0) + 1 as next 
      FROM vehicles 
      WHERE date(check_in_time) = date('now')
    `).get().next;
    
    const result = stmt.run(unique_card_id, license_plate, make || 'Unknown', model || 'Unknown', color || 'Unknown', key_slot, dailySeq);
    const vehicleId = result.lastInsertRowid;
    
    // Assign the hook as occupied
    if (key_slot && hookManager) {
      hookManager.assignHook(key_slot, unique_card_id);
      console.log(`✅ Hook ${key_slot} assigned to vehicle ${vehicleId}`);
    }
    
    console.log('✅ Vehicle checked in successfully:', vehicleId);

    res.json({
      success: true,
      message: `Vehicle checked in successfully. Place keys on Hook #${key_slot}`,
      vehicleId: vehicleId,
      vehicle: {
        id: vehicleId,
        unique_card_id,
        license_plate,
        make: make || 'Unknown',
        model: model || 'Unknown',
        color,
        hook_number: key_slot,
        status: 'PARKED'
      }
    });
  } catch (error) {
    console.error('❌ Error checking in vehicle:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all vehicles
router.get('/vehicles', (req, res) => {
  const db = req.app.get('db');
  try {
    const vehicles = db.prepare('SELECT * FROM vehicles WHERE status = ? ORDER BY check_in_time DESC').all('parked');
    res.json({ success: true, vehicles });
  } catch (error) {
    console.error('Error getting vehicles:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// NEW: GET VEHICLE BY CARD ID (for customer page)
// ============================================
router.get('/vehicles/card/:cardId', (req, res) => {
  const db = req.app.get('db');
  try {
    const { cardId } = req.params;
    
    const vehicle = db.prepare(`
      SELECT * FROM vehicles 
      WHERE unique_card_id = ? 
      AND status = 'parked'
    `).get(cardId);

    if (!vehicle) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vehicle not found or already retrieved' 
      });
    }

    // Calculate parking duration and fees
    const checkin = new Date(vehicle.check_in_time);
    const now = new Date();
    const hours = Math.ceil((now - checkin) / (1000 * 60 * 60));
    const fee = 15 + (hours * 5); // $15 base + $5/hour

    res.json({
      success: true,
      vehicle: {
        ...vehicle,
        parking_duration_hours: hours,
        parking_fee: fee
      }
    });
  } catch (error) {
    console.error('Error getting vehicle by card:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Request vehicle retrieval
router.post('/request', (req, res) => {
  const db = req.app.get('db');
  try {
    const { unique_card_id, is_priority } = req.body;
    
    console.log('🚗 Retrieval request:', { unique_card_id, is_priority });

    const vehicle = db.prepare('SELECT * FROM vehicles WHERE unique_card_id = ? AND status = ?').get(unique_card_id, 'parked');
    
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found or already retrieved' });
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
    const baseFee = db.prepare("SELECT value FROM settings WHERE key = 'base_fee'").get();
    const priorityFeeRow = db.prepare("SELECT value FROM settings WHERE key = 'priority_fee'").get();
    
    const baseAmount = baseFee ? parseFloat(baseFee.value) : 15;
    const priorityAmount = priorityFeeRow ? parseFloat(priorityFeeRow.value) : 10;
    const totalAmount = is_priority ? baseAmount + priorityAmount : baseAmount;

    const stmt = db.prepare(`
      INSERT INTO retrieval_requests (unique_card_id, is_priority, payment_method, status, amount, requested_at)
      VALUES (?, ?, 'pay_at_counter', 'pending', ?, datetime('now'))
    `);
    
    const result = stmt.run(unique_card_id, is_priority ? 1 : 0, totalAmount);
    
    console.log('✅ Request created:', result.lastInsertRowid);

    res.json({
      success: true,
      message: 'Retrieval request created',
      requestId: result.lastInsertRowid,
      vehicle: vehicle
    });
  } catch (error) {
    console.error('❌ Error creating request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// VEHICLE REMOVAL / CLEAR ENDPOINTS (for Station App)
// ============================================

// Remove/clear a vehicle from the system (releases hook)
router.delete('/vehicles/:vehicleId', (req, res) => {
  const db = req.app.get('db');
  const hookManager = req.app.get('hookManager');
  const { vehicleId } = req.params;
  
  try {
    // Get the vehicle first
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicleId);
    
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    
    const hookNumber = vehicle.hook_number;
    
    // Cancel any pending retrieval requests for this vehicle
    db.prepare(`
      UPDATE retrieval_requests 
      SET status = 'cancelled', completed_at = datetime('now')
      WHERE unique_card_id = ? AND status IN ('pending', 'assigned', 'keys_picked', 'walking', 'driving', 'ready')
    `).run(vehicle.unique_card_id);
    
    // Mark vehicle as removed/retrieved
    db.prepare(`
      UPDATE vehicles 
      SET status = 'removed', check_out_time = datetime('now'), nfc_card_active = 0
      WHERE id = ?
    `).run(vehicleId);
    
    // Release the hook
    if (hookNumber && hookManager) {
      hookManager.releaseHook(hookNumber);
      console.log(`✅ Hook ${hookNumber} released (vehicle ${vehicleId} removed)`);
    }
    
    console.log(`🗑️ Vehicle ${vehicleId} (${vehicle.license_plate}) removed from system`);
    
    res.json({ 
      success: true, 
      message: `Vehicle ${vehicle.license_plate} removed. Hook ${hookNumber} is now available.`,
      releasedHook: hookNumber
    });
    
  } catch (error) {
    console.error('Error removing vehicle:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Remove vehicle by card ID
router.delete('/vehicles/card/:cardId', (req, res) => {
  const db = req.app.get('db');
  const hookManager = req.app.get('hookManager');
  const { cardId } = req.params;
  
  try {
    // Get the vehicle
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE unique_card_id = ? AND status = ?').get(cardId, 'parked');
    
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found or already removed' });
    }
    
    const hookNumber = vehicle.hook_number;
    
    // Cancel any pending retrieval requests
    db.prepare(`
      UPDATE retrieval_requests 
      SET status = 'cancelled', completed_at = datetime('now')
      WHERE unique_card_id = ? AND status IN ('pending', 'assigned', 'keys_picked', 'walking', 'driving', 'ready')
    `).run(cardId);
    
    // Mark vehicle as removed
    db.prepare(`
      UPDATE vehicles 
      SET status = 'removed', check_out_time = datetime('now'), nfc_card_active = 0
      WHERE unique_card_id = ?
    `).run(cardId);
    
    // Release the hook
    if (hookNumber && hookManager) {
      hookManager.releaseHook(hookNumber);
      console.log(`✅ Hook ${hookNumber} released (card ${cardId} removed)`);
    }
    
    console.log(`🗑️ Vehicle ${vehicle.license_plate} removed by card ID`);
    
    res.json({ 
      success: true, 
      message: `Vehicle ${vehicle.license_plate} removed. Hook ${hookNumber} is now available.`,
      releasedHook: hookNumber
    });
    
  } catch (error) {
    console.error('Error removing vehicle:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Clear/release a specific hook (force release)
router.post('/hooks/:hookNumber/release', (req, res) => {
  const db = req.app.get('db');
  const hookManager = req.app.get('hookManager');
  const { hookNumber } = req.params;
  
  try {
    // Find any vehicle on this hook
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE hook_number = ? AND status = ?').get(hookNumber, 'parked');
    
    if (vehicle) {
      // Cancel any pending retrieval requests
      db.prepare(`
        UPDATE retrieval_requests 
        SET status = 'cancelled', completed_at = datetime('now')
        WHERE unique_card_id = ? AND status IN ('pending', 'assigned', 'keys_picked', 'walking', 'driving', 'ready')
      `).run(vehicle.unique_card_id);
      
      // Mark vehicle as removed
      db.prepare(`
        UPDATE vehicles 
        SET status = 'removed', check_out_time = datetime('now'), nfc_card_active = 0
        WHERE id = ?
      `).run(vehicle.id);
      
      console.log(`🗑️ Vehicle ${vehicle.license_plate} removed from hook ${hookNumber}`);
    }
    
    // Release the hook
    if (hookManager) {
      hookManager.releaseHook(parseInt(hookNumber));
    }
    
    console.log(`✅ Hook ${hookNumber} force released`);
    
    res.json({ 
      success: true, 
      message: `Hook ${hookNumber} is now available`,
      removedVehicle: vehicle ? vehicle.license_plate : null
    });
    
  } catch (error) {
    console.error('Error releasing hook:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get retrieval queue
router.get('/queue', (req, res) => {
  const db = req.app.get('db');
  try {
    const { driverId } = req.query;
    
    // If driverId provided, also show assigned tasks for that driver
    let query;
    let params = [];
    
    if (driverId) {
      query = `
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
        WHERE r.status = 'pending' 
           OR (r.status IN ('assigned', 'keys_picked', 'walking', 'driving', 'ready') AND r.assigned_driver_id = ?)
        ORDER BY r.is_priority DESC, r.requested_at ASC
      `;
      params = [driverId];
    } else {
      query = `
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
        WHERE r.status IN ('pending', 'assigned', 'keys_picked', 'walking', 'driving', 'ready')
        ORDER BY r.is_priority DESC, r.requested_at ASC
      `;
    }
    
    const requests = db.prepare(query).all(...params);

    res.json({ success: true, requests });
  } catch (error) {
    console.error('Error getting queue:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Complete retrieval - update vehicle and request status
router.post('/complete-retrieval', (req, res) => {
  const db = req.app.get('db');
  const hookManager = req.app.get('hookManager');
  
  try {
    const { requestId, cardId, driverId } = req.body;
    
    console.log('📦 Completing retrieval:', { requestId, cardId, driverId });

    // Update vehicle status to 'retrieved'
    const vehicleStmt = db.prepare(`
      UPDATE vehicles 
      SET status = 'retrieved', 
          check_out_time = datetime('now')
      WHERE unique_card_id = ?
    `);
    vehicleStmt.run(cardId);
    
    // Get the vehicle's hook number to release it
    const vehicle = db.prepare('SELECT hook_number FROM vehicles WHERE unique_card_id = ?').get(cardId);
    
    // Release the hook
    if (vehicle && vehicle.hook_number && hookManager) {
      hookManager.releaseHook(vehicle.hook_number);
      console.log(`✅ Hook ${vehicle.hook_number} released`);
    }

    // Check if driver exists to avoid foreign key constraint error
    let validDriverId = null;
    if (driverId) {
      const driver = db.prepare('SELECT id FROM drivers WHERE id = ?').get(driverId);
      if (driver) {
        validDriverId = driverId;
      } else {
        console.log(`⚠️ Driver ${driverId} not found, setting assigned_driver_id to NULL`);
      }
    }

    // Update request status to 'completed'
    const requestStmt = db.prepare(`
      UPDATE retrieval_requests 
      SET status = 'completed',
          assigned_driver_id = ?,
          completed_at = datetime('now')
      WHERE id = ?
    `);
    requestStmt.run(validDriverId, requestId);
    
    console.log('✅ Retrieval completed successfully');

    res.json({
      success: true,
      message: 'Retrieval completed successfully'
    });
  } catch (error) {
    console.error('❌ Error completing retrieval:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/hooks - List all hooks
router.get('/hooks', (req, res) => {
  try {
    const db = req.app.get('db');
    
    // Ensure hooks table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS hooks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hook_number INTEGER UNIQUE NOT NULL,
        status TEXT DEFAULT 'available',
        vehicle_id INTEGER,
        reserved_for_card TEXT,
        assigned_at TEXT,
        venue_id INTEGER DEFAULT 1,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
      )
    `);
    
    // Get all hooks
    let hooks = db.prepare('SELECT * FROM hooks ORDER BY hook_number ASC').all();
    
    // If no hooks exist, create default 50 hooks
    if (hooks.length === 0) {
      const insert = db.prepare('INSERT INTO hooks (hook_number, status) VALUES (?, ?)');
      for (let i = 1; i <= 50; i++) {
        insert.run(i, 'available');
      }
      hooks = db.prepare('SELECT * FROM hooks ORDER BY hook_number ASC').all();
    }
    
    // Get vehicle info for occupied hooks
    const hooksWithVehicles = hooks.map(hook => {
      if (hook.vehicle_id) {
        const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(hook.vehicle_id);
        return { ...hook, vehicle };
      }
      return hook;
    });
    
    res.json({ success: true, hooks: hooksWithVehicles });
  } catch (error) {
    console.error('Error getting hooks:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/hooks/next-available', (req, res) => {
  try {
    const db = req.app.get('db');
    const hook = db.prepare(`
      SELECT * FROM hooks 
      WHERE status = 'available' 
      AND reserved_for_card IS NULL
      ORDER BY hook_number ASC 
      LIMIT 1
    `).get();
    
    if (!hook) {
      return res.json({ success: false, message: 'No available hooks' });
    }
    
    res.json({ success: true, hook });
  } catch (error) {
    console.error('Error getting next hook:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/hooks/reserve', (req, res) => {
  try {
    const db = req.app.get('db');
    const { hook_number, card_id } = req.body;
    
    db.prepare(`
      UPDATE hooks 
      SET reserved_for_card = ?, reserved_at = datetime('now')
      WHERE hook_number = ?
    `).run(card_id, hook_number);
    
    res.json({ success: true, message: 'Hook reserved' });
  } catch (error) {
    console.error('Error reserving hook:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Release a hook (for cancellation)
router.post('/hooks/release', (req, res) => {
  try {
    const db = req.app.get('db');
    const hookManager = req.app.get('hookManager');
    const { hook_number } = req.body;
    
    if (!hook_number) {
      return res.status(400).json({ success: false, message: 'Hook number is required' });
    }
    
    // Release the hook
    if (hookManager) {
      hookManager.releaseHook(hook_number);
    } else {
      db.prepare(`
        UPDATE hooks 
        SET status = 'available', reserved_for_card = NULL, reserved_at = NULL 
        WHERE hook_number = ?
      `).run(hook_number);
    }
    
    console.log(`✅ Hook ${hook_number} released`);
    res.json({ success: true, message: `Hook ${hook_number} released` });
  } catch (error) {
    console.error('Error releasing hook:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Pricing endpoint
router.get('/pricing', (req, res) => {
  const db = req.app.get('db');
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    
    const baseFee = db.prepare("SELECT value FROM settings WHERE key = 'base_fee'").get();
    const priorityFee = db.prepare("SELECT value FROM settings WHERE key = 'priority_fee'").get();
    const surgeMultiplier = db.prepare("SELECT value FROM settings WHERE key = 'surge_multiplier'").get();
    const surgeEnabled = db.prepare("SELECT value FROM settings WHERE key = 'surge_enabled'").get();
    
    const baseAmount = baseFee ? parseFloat(baseFee.value) : 15;
    const priorityAmount = priorityFee ? parseFloat(priorityFee.value) : 10;
    const surge = surgeMultiplier ? parseFloat(surgeMultiplier.value) : 1.0;
    const surgeOn = surgeEnabled ? surgeEnabled.value === 'true' : false;
    
    res.json({
      success: true,
      pricing: {
        base_fee: baseAmount,
        base_valet_fee: baseAmount,
        priority_fee: priorityAmount,
        surge_multiplier: surge,
        surge_enabled: surgeOn,
        hourly_rate: 5,
        currency: 'USD'
      }
    });
  } catch (error) {
    console.error('Error getting pricing:', error);
    res.json({
      success: true,
      pricing: { base_fee: 15, base_valet_fee: 15, priority_fee: 10, surge_multiplier: 1.0, surge_enabled: false, hourly_rate: 5, currency: 'USD' }
    });
  }
});

// Update payment method for a retrieval request
router.post('/retrieval/:requestId/payment-method', (req, res) => {
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

// Get driver stats
router.get('/drivers/stats/:driverId', (req, res) => {
  const db = req.app.get('db');
  try {
    const { driverId } = req.params;
    
    // Get today's stats for this driver
    const today = new Date().toISOString().split('T')[0];
    
    const completed = db.prepare(`
      SELECT COUNT(*) as count FROM retrieval_requests 
      WHERE assigned_driver_id = ? 
      AND status = 'completed'
      AND DATE(completed_at) = ?
    `).get(driverId, today);
    
    const totalEarnings = db.prepare(`
      SELECT COALESCE(SUM(tip_amount), 0) as tips FROM retrieval_requests 
      WHERE assigned_driver_id = ? 
      AND status = 'completed'
      AND DATE(completed_at) = ?
    `).get(driverId, today);
    
    res.json({
      success: true,
      stats: {
        completedToday: completed?.count || 0,
        tipsToday: totalEarnings?.tips || 0,
        rating: 4.8
      }
    });
  } catch (error) {
    console.error('Error getting driver stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get pending handovers (cars ready for pickup)
router.get('/pending-handovers', (req, res) => {
  const db = req.app.get('db');
  try {
    const handovers = db.prepare(`
      SELECT r.*, v.license_plate, v.make, v.model, v.color, v.hook_number
      FROM retrieval_requests r
      JOIN vehicles v ON r.unique_card_id = v.unique_card_id
      WHERE r.status = 'ready'
      ORDER BY r.car_ready_at ASC
    `).all();
    
    res.json({ success: true, handovers });
  } catch (error) {
    console.error('Error getting pending handovers:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Driver logout
router.post('/driver/logout', (req, res) => {
  const { driverId } = req.body;
  console.log(`Driver ${driverId} logged out`);
  res.json({ success: true, message: 'Logged out successfully' });
});

// Complete retrieval (clear NFC card and mark complete)
router.post('/complete-retrieval', (req, res) => {
  const db = req.app.get('db');
  const hookManager = req.app.get('hookManager');
  
  try {
    const { cardId } = req.body;
    
    // Get the vehicle
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE unique_card_id = ?').get(cardId);
    
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    
    // Update vehicle status
    db.prepare(`
      UPDATE vehicles 
      SET status = 'retrieved', check_out_time = datetime('now'), nfc_card_active = 0
      WHERE unique_card_id = ?
    `).run(cardId);
    
    // Update retrieval request
    db.prepare(`
      UPDATE retrieval_requests 
      SET status = 'completed', completed_at = datetime('now')
      WHERE unique_card_id = ? AND status != 'completed'
    `).run(cardId);
    
    // Release the hook
    if (vehicle.hook_number && hookManager) {
      hookManager.releaseHook(vehicle.hook_number);
      console.log(`✅ Hook ${vehicle.hook_number} released`);
    }
    
    console.log(`✅ Retrieval completed for card ${cardId}`);
    res.json({ success: true, message: 'Retrieval completed' });
  } catch (error) {
    console.error('Error completing retrieval:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Accept a task from queue
router.post('/queue/:taskId/accept', (req, res) => {
  const db = req.app.get('db');
  try {
    const { taskId } = req.params;
    const { driverId } = req.body;
    
    // If no driverId provided or driverId is invalid, set to NULL
    let validDriverId = driverId;
    if (driverId) {
      const driver = db.prepare('SELECT id FROM drivers WHERE id = ?').get(driverId);
      if (!driver) {
        console.log(`⚠️ Driver ${driverId} not found, setting to NULL`);
        validDriverId = null;
      }
    }
    
    db.prepare(`
      UPDATE retrieval_requests 
      SET assigned_driver_id = ?, status = 'assigned', assigned_at = datetime('now')
      WHERE id = ? AND status = 'pending'
    `).run(validDriverId, taskId);
    
    console.log(`✅ Task ${taskId} accepted by driver ${validDriverId || 'unknown'}`);
    res.json({ success: true, message: 'Task accepted' });
  } catch (error) {
    console.error('Error accepting task:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark retrieval as complete (car ready)
router.post('/retrieval/:taskId/complete', (req, res) => {
  const db = req.app.get('db');
  try {
    const { taskId } = req.params;
    const { driverId } = req.body;
    
    db.prepare(`
      UPDATE retrieval_requests 
      SET status = 'ready', car_ready_at = datetime('now')
      WHERE id = ? AND assigned_driver_id = ?
    `).run(taskId, driverId);
    
    console.log(`✅ Task ${taskId} marked as ready by driver ${driverId}`);
    res.json({ success: true, message: 'Car marked as ready' });
  } catch (error) {
    console.error('Error completing retrieval:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cancel/abandon a retrieval task
router.post('/retrieval/:taskId/cancel', (req, res) => {
  const db = req.app.get('db');
  const hookManager = req.app.get('hookManager');
  
  try {
    const { taskId } = req.params;
    const { driverId, reason } = req.body;
    
    console.log(`🚫 Cancelling task ${taskId} by driver ${driverId}. Reason: ${reason || 'none'}`);
    
    // Get current task info
    const task = db.prepare(`
      SELECT r.*, v.hook_number, v.license_plate 
      FROM retrieval_requests r
      JOIN vehicles v ON r.unique_card_id = v.unique_card_id
      WHERE r.id = ?
    `).get(taskId);
    
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    
    // Reset task to pending (so another driver can pick it up)
    db.prepare(`
      UPDATE retrieval_requests 
      SET status = 'pending', 
          assigned_driver_id = NULL, 
          assigned_at = NULL,
          status_updated_at = NULL
      WHERE id = ?
    `).run(taskId);
    
    console.log(`✅ Task ${taskId} (${task.license_plate}) reset to pending`);
    
    res.json({ 
      success: true, 
      message: 'Task cancelled and returned to queue',
      task: {
        id: taskId,
        license_plate: task.license_plate,
        hook_number: task.hook_number
      }
    });
  } catch (error) {
    console.error('Error cancelling task:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Driver login
router.post('/drivers/login', (req, res) => {
  const db = req.app.get('db');
  const { username, name, pin } = req.body; const driverName = username || name;
  
  try {
    // Look up driver in database
    const driver = db.prepare('SELECT * FROM drivers WHERE fullName = ? OR username = ?').get(driverName, driverName);
    
    if (driver) {
      // Update last login AND set status to online
      db.prepare("UPDATE drivers SET lastLogin = datetime('now'), status = 'online' WHERE id = ?").run(driver.id);
      
      console.log(`✅ Driver ${driverName} logged in with ID ${driver.id} - status set to online`);
      
      // Emit socket event for real-time update
      const io = req.app.get('io');
      if (io) {
        io.emit('driverStatusChanged', { driverId: driver.id, status: 'online' });
      }
      
      res.json({ 
        success: true, 
        driver: {
          id: driver.id,
          name: driver.fullName || driver.username,
          phone: driver.phone,
          status: 'online'
        }
      });
    } else {
      // Create new driver if not exists
      const result = db.prepare("INSERT INTO drivers (username, fullName, password, phone, status) VALUES (?, ?, 'temp', '0000000000', 'online')").run(driverName, driverName);
      
      console.log(`✅ New driver ${name} created with ID ${result.lastInsertRowid}`);
      
      res.json({ 
        success: true, 
        driver: {
          id: result.lastInsertRowid,
          name: name,
          status: 'online'
        }
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get next available hook
router.get('/hooks/next', (req, res) => {
  const db = req.app.get('db');
  try {
    const hook = db.prepare(`
      SELECT * FROM hooks 
      WHERE status = 'available' 
      ORDER BY hook_number ASC 
      LIMIT 1
    `).get();
    
    if (!hook) {
      return res.json({ success: false, message: 'No available hooks' });
    }
    
    res.json({ success: true, hook });
  } catch (error) {
    console.error('Error getting next hook:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Collect cash for retrieval
router.post('/retrieval/:taskId/collect-cash', (req, res) => {
  const db = req.app.get('db');
  try {
    const { taskId } = req.params;
    const { amount } = req.body;
    
    db.prepare(`
      UPDATE retrieval_requests 
      SET payment_processed = 1, amount = ?
      WHERE id = ?
    `).run(amount, taskId);
    
    console.log(`✅ Cash collected for task ${taskId}: $${amount}`);
    res.json({ success: true, message: 'Cash collected' });
  } catch (error) {
    console.error('Error collecting cash:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Handover keys
router.post('/retrieval/:taskId/handover-keys', (req, res) => {
  const db = req.app.get('db');
  try {
    const { taskId } = req.params;
    
    db.prepare(`
      UPDATE retrieval_requests 
      SET status = 'completed', keys_handed_at = datetime('now'), completed_at = datetime('now')
      WHERE id = ?
    `).run(taskId);
    
    console.log(`✅ Keys handed for task ${taskId}`);
    res.json({ success: true, message: 'Keys handed over' });
  } catch (error) {
    console.error('Error handing over keys:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get driver stats (alternate endpoint)
router.get('/drivers/:driverId/stats', (req, res) => {
  const db = req.app.get('db');
  try {
    const { driverId } = req.params;
    const today = new Date().toISOString().split('T')[0];
    
    const completed = db.prepare(`
      SELECT COUNT(*) as count FROM retrieval_requests 
      WHERE assigned_driver_id = ? 
      AND status = 'completed'
      AND DATE(completed_at) = ?
    `).get(driverId, today);
    
    const totalEarnings = db.prepare(`
      SELECT COALESCE(SUM(tip_amount), 0) as tips FROM retrieval_requests 
      WHERE assigned_driver_id = ? 
      AND status = 'completed'
      AND DATE(completed_at) = ?
    `).get(driverId, today);
    
    res.json({
      success: true,
      stats: {
        completedToday: completed?.count || 0,
        tipsToday: totalEarnings?.tips || 0,
        rating: 4.8
      }
    });
  } catch (error) {
    console.error('Error getting driver stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark car as ready
router.post('/retrieval/:taskId/car-ready', (req, res) => {
  const db = req.app.get('db');
  try {
    const { taskId } = req.params;
    
    db.prepare(`
      UPDATE retrieval_requests 
      SET status = 'ready', car_ready_at = datetime('now')
      WHERE id = ?
    `).run(taskId);
    
    console.log(`✅ Car ready for task ${taskId}`);
    res.json({ success: true, message: 'Car marked as ready' });
  } catch (error) {
    console.error('Error marking car ready:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update retrieval status (for real-time tracking)
router.post('/retrieval/:taskId/status', (req, res) => {
  const db = req.app.get('db');
  try {
    const { taskId } = req.params;
    const { status } = req.body;
    
    // Valid statuses for tracking
    const validStatuses = ['assigned', 'keys_picked', 'walking', 'driving', 'ready', 'completed'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    
    // Update status and timestamp
    const timestampField = status === 'ready' ? 'car_ready_at' : 'status_updated_at';
    
    db.prepare(`
      UPDATE retrieval_requests 
      SET status = ?, ${timestampField} = datetime('now')
      WHERE id = ?
    `).run(status, taskId);
    
    console.log(`📍 Task ${taskId} status updated to: ${status}`);
    res.json({ success: true, message: `Status updated to ${status}` });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get retrieval status (for customer tracking)
router.get('/retrieval/:taskId/status', (req, res) => {
  const db = req.app.get('db');
  try {
    const { taskId } = req.params;
    
    const request = db.prepare(`
      SELECT 
        r.*,
        d.fullName as driver_name,
        v.license_plate,
        v.make,
        v.model,
        v.color
      FROM retrieval_requests r
      LEFT JOIN drivers d ON r.assigned_driver_id = d.id
      LEFT JOIN vehicles v ON r.unique_card_id = v.unique_card_id
      WHERE r.id = ?
    `).get(taskId);
    
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    
    // Map status to customer-friendly message
    const statusMessages = {
      pending: 'Looking for a driver...',
      assigned: 'Driver assigned! Heading to get your keys.',
      keys_picked: 'Keys picked up! Walking to your car.',
      walking: 'Walking to your car.',
      driving: 'Driving your car to the valet stand.',
      ready: 'Your car is ready! Please come to the valet stand.',
      completed: 'Completed. Thank you!',
    };
    
    res.json({ 
      success: true, 
      request: {
        ...request,
        status_message: statusMessages[request.status] || 'Processing...',
      }
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get retrieval status by card ID (for customer app)
router.get('/retrieval/card/:cardId/status', (req, res) => {
  const db = req.app.get('db');
  try {
    const { cardId } = req.params;
    
    const request = db.prepare(`
      SELECT 
        r.*,
        d.fullName as driver_name,
        v.license_plate,
        v.make,
        v.model,
        v.color
      FROM retrieval_requests r
      LEFT JOIN drivers d ON r.assigned_driver_id = d.id
      LEFT JOIN vehicles v ON r.unique_card_id = v.unique_card_id
      WHERE r.unique_card_id = ?
      ORDER BY r.requested_at DESC
      LIMIT 1
    `).get(cardId);
    
    if (!request) {
      return res.status(404).json({ success: false, message: 'No request found for this card' });
    }
    
    // Map status to customer-friendly message and progress percentage
    const statusInfo = {
      pending: { message: 'Looking for a driver...', progress: 10 },
      assigned: { message: 'Driver assigned! Heading to get your keys.', progress: 25 },
      keys_picked: { message: 'Keys picked up! Walking to your car.', progress: 40 },
      walking: { message: 'Walking to your car.', progress: 55 },
      driving: { message: 'Driving your car to the valet stand.', progress: 75 },
      ready: { message: 'Your car is ready! Please come to the valet stand.', progress: 100 },
      completed: { message: 'Completed. Thank you!', progress: 100 },
    };
    
    const info = statusInfo[request.status] || { message: 'Processing...', progress: 0 };
    
    res.json({ 
      success: true, 
      request: {
        ...request,
        status_message: info.message,
        progress: info.progress,
      }
    });
  } catch (error) {
    console.error('Error getting status by card:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Check if vehicle already has pending request (add this check to /request endpoint)

// Update pricing (from station dashboard)
router.post('/pricing', (req, res) => {
  const db = req.app.get('db');
  try {
    const { base_fee, hourly_rate, priority_fee } = req.body;
    
    // Check if pricing table exists, if not create it
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    
    // Update or insert pricing values
    if (base_fee !== undefined) {
      db.prepare(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('base_fee', ?, datetime('now'))`).run(base_fee.toString());
    }
    if (hourly_rate !== undefined) {
      db.prepare(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('hourly_rate', ?, datetime('now'))`).run(hourly_rate.toString());
    }
    if (priority_fee !== undefined) {
      db.prepare(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('priority_fee', ?, datetime('now'))`).run(priority_fee.toString());
    }
    
    console.log('✅ Pricing updated:', { base_fee, hourly_rate, priority_fee });
    res.json({ success: true, message: 'Pricing updated' });
  } catch (error) {
    console.error('Error updating pricing:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Overview stats for station dashboard
router.get('/overview', (req, res) => {
  const db = req.app.get('db');
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const activeVehicles = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'parked'").get();
    const todayRequests = db.prepare("SELECT COUNT(*) as count FROM retrieval_requests WHERE DATE(requested_at) = ?").get(today);
    const completedToday = db.prepare("SELECT COUNT(*) as count FROM retrieval_requests WHERE status = 'completed' AND DATE(completed_at) = ?").get(today);
    const pendingHandovers = db.prepare("SELECT COUNT(*) as count FROM retrieval_requests WHERE status = 'ready'").get();
    
    res.json({
      success: true,
      overview: {
        activeVehicles: activeVehicles?.count || 0,
        todayRequests: todayRequests?.count || 0,
        completedToday: completedToday?.count || 0,
        pendingHandovers: pendingHandovers?.count || 0
      }
    });
  } catch (error) {
    console.error('Error getting overview:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Analytics for station dashboard
router.get('/analytics', (req, res) => {
  const db = req.app.get('db');
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const totalRevenue = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM retrieval_requests WHERE status = 'completed' AND DATE(completed_at) = ?").get(today);
    const totalTips = db.prepare("SELECT COALESCE(SUM(tip_amount), 0) as total FROM retrieval_requests WHERE status = 'completed' AND DATE(completed_at) = ?").get(today);
    const avgWaitTime = db.prepare(`
      SELECT AVG((julianday(car_ready_at) - julianday(requested_at)) * 24 * 60) as avg_minutes 
      FROM retrieval_requests 
      WHERE status = 'completed' AND DATE(completed_at) = ?
    `).get(today);
    
    res.json({
      success: true,
      analytics: {
        totalRevenue: totalRevenue?.total || 0,
        totalTips: totalTips?.total || 0,
        avgWaitTime: avgWaitTime?.avg_minutes ? Math.round(avgWaitTime.avg_minutes) : 0,
        totalTransactions: db.prepare("SELECT COUNT(*) as count FROM retrieval_requests WHERE status = 'completed' AND DATE(completed_at) = ?").get(today)?.count || 0
      }
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cash payments for station dashboard
router.get('/cash-payments', (req, res) => {
  const db = req.app.get('db');
  try {
    const payments = db.prepare(`
      SELECT r.*, v.license_plate, v.make, v.model
      FROM retrieval_requests r
      JOIN vehicles v ON r.unique_card_id = v.unique_card_id
      WHERE r.payment_method = 'cash' AND r.payment_processed = 1
      ORDER BY r.completed_at DESC
      LIMIT 50
    `).all();
    
    res.json({ success: true, payments });
  } catch (error) {
    console.error('Error getting cash payments:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Daily report for station dashboard
router.get('/daily-report', (req, res) => {
  const db = req.app.get('db');
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const summary = {
      date: today,
      totalVehicles: db.prepare("SELECT COUNT(*) as count FROM retrieval_requests WHERE DATE(requested_at) = ?").get(today)?.count || 0,
      completedRetrievals: db.prepare("SELECT COUNT(*) as count FROM retrieval_requests WHERE status = 'completed' AND DATE(completed_at) = ?").get(today)?.count || 0,
      cashPayments: db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM retrieval_requests WHERE payment_method = 'cash' AND payment_processed = 1 AND DATE(completed_at) = ?").get(today) || { count: 0, total: 0 },
      onlinePayments: db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM retrieval_requests WHERE payment_method = 'online' AND DATE(completed_at) = ?").get(today) || { count: 0, total: 0 },
      totalRevenue: db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM retrieval_requests WHERE status = 'completed' AND DATE(completed_at) = ?").get(today)?.total || 0,
      totalTips: db.prepare("SELECT COALESCE(SUM(tip_amount), 0) as total FROM retrieval_requests WHERE status = 'completed' AND DATE(completed_at) = ?").get(today)?.total || 0
    };
    
    res.json({ success: true, report: summary });
  } catch (error) {
    console.error('Error getting daily report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Station pricing endpoint (different format for station dashboard)
router.get('/station/pricing', (req, res) => {
  const db = req.app.get('db');
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    
    const baseFee = db.prepare("SELECT value FROM settings WHERE key = 'base_fee'").get();
    const priorityFee = db.prepare("SELECT value FROM settings WHERE key = 'priority_fee'").get();
    const surgeMultiplier = db.prepare("SELECT value FROM settings WHERE key = 'surge_multiplier'").get();
    const surgeEnabled = db.prepare("SELECT value FROM settings WHERE key = 'surge_enabled'").get();
    
    res.json({
      success: true,
      pricing: {
        base_valet_fee: baseFee ? parseFloat(baseFee.value) : 15,
        priority_fee: priorityFee ? parseFloat(priorityFee.value) : 10,
        surge_multiplier: surgeMultiplier ? parseFloat(surgeMultiplier.value) : 1.0,
        surge_enabled: surgeEnabled ? surgeEnabled.value === 'true' : false
      }
    });
  } catch (error) {
    console.error('Error getting station pricing:', error);
    res.json({
      success: true,
      pricing: { base_valet_fee: 15, priority_fee: 10, surge_multiplier: 1.0, surge_enabled: false }
    });
  }
});

// Update station pricing
router.post('/station/pricing', (req, res) => {
  const db = req.app.get('db');
  try {
    const { base_valet_fee, priority_fee, surge_multiplier, surge_enabled } = req.body;
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    
    if (base_valet_fee !== undefined) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('base_fee', ?, datetime('now'))").run(base_valet_fee.toString());
    }
    if (priority_fee !== undefined) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('priority_fee', ?, datetime('now'))").run(priority_fee.toString());
    }
    if (surge_multiplier !== undefined) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('surge_multiplier', ?, datetime('now'))").run(surge_multiplier.toString());
    }
    if (surge_enabled !== undefined) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('surge_enabled', ?, datetime('now'))").run(surge_enabled.toString());
    }
    
    console.log('✅ Station pricing updated');
    res.json({ success: true, message: 'Pricing updated' });
  } catch (error) {
    console.error('Error updating station pricing:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update pricing from station dashboard
router.post('/pricing/update', (req, res) => {
  const db = req.app.get('db');
  try {
    const { base_valet_fee, priority_fee, surge_multiplier, surge_enabled } = req.body;
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    
    if (base_valet_fee !== undefined) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('base_fee', ?, datetime('now'))").run(base_valet_fee.toString());
    }
    if (priority_fee !== undefined) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('priority_fee', ?, datetime('now'))").run(priority_fee.toString());
    }
    if (surge_multiplier !== undefined) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('surge_multiplier', ?, datetime('now'))").run(surge_multiplier.toString());
    }
    if (surge_enabled !== undefined) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('surge_enabled', ?, datetime('now'))").run(surge_enabled.toString());
    }
    
    console.log('✅ Pricing updated:', { base_valet_fee, priority_fee, surge_multiplier, surge_enabled });
    res.json({ success: true, message: 'Pricing updated successfully' });
  } catch (error) {
    console.error('Error updating pricing:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Process payment (online payment)
router.post('/payment/process', (req, res) => {
  const db = req.app.get('db');
  try {
    const { requestId, amount, paymentMethod, tipAmount, cardDetails } = req.body;
    
    console.log('💳 Processing payment:', { requestId, amount, paymentMethod, tipAmount });
    
    if (!requestId) {
      return res.status(400).json({ success: false, message: 'Request ID is required' });
    }
    
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
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    
    console.log(`✅ Payment processed for request ${requestId}: $${amount} + $${tipAmount} tip`);
    
    res.json({ 
      success: true, 
      message: 'Payment processed successfully',
      transactionId: `TXN-${Date.now()}`,
      amount: amount,
      tip: tipAmount,
      total: (amount || 0) + (tipAmount || 0)
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Station dashboard overview - comprehensive stats
router.get('/station/overview', (req, res) => {
  const db = req.app.get('db');
  try {
    // Count parked vehicles
    const parkedVehicles = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'parked'").get();
    
    // Count vehicles being retrieved (pending, assigned, in_progress)
    const retrieving = db.prepare(`
      SELECT COUNT(*) as count FROM retrieval_requests 
      WHERE status IN ('pending', 'assigned', 'in_progress')
    `).get();
    
    // Count available drivers (online status)
    const availableDrivers = db.prepare("SELECT COUNT(*) as count FROM drivers WHERE status = 'online'").get();
    
    // Count busy drivers (assigned to active retrievals)
    const busyDrivers = db.prepare(`
      SELECT COUNT(DISTINCT assigned_driver_id) as count FROM retrieval_requests 
      WHERE status IN ('assigned', 'in_progress') AND assigned_driver_id IS NOT NULL
    `).get();
    
    res.json({
      success: true,
      stats: {
        totalParked: parkedVehicles?.count || 0,
        totalRetrieving: retrieving?.count || 0,
        availableDrivers: availableDrivers?.count || 0,
        busyDrivers: busyDrivers?.count || 0
      }
    });
  } catch (error) {
    console.error('Error getting station overview:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all drivers
router.get('/drivers', (req, res) => {
  const db = req.app.get('db');
  try {
    // Get all drivers with their current task info
    const drivers = db.prepare(`
      SELECT 
        d.id, 
        d.fullName as full_name, 
        d.username, 
        d.phone, 
        d.email, 
        d.status,
        d.licenseNumber, 
        d.vehicleInfo, 
        d.emergencyContact, 
        d.emergencyPhone, 
        d.createdAt, 
        d.lastLogin,
        r.id as current_task_id,
        r.status as task_status,
        v.license_plate as task_vehicle_plate,
        v.make as task_vehicle_make,
        v.model as task_vehicle_model,
        v.hook_number as task_hook_number
      FROM drivers d
      LEFT JOIN retrieval_requests r ON r.assigned_driver_id = d.id 
        AND r.status IN ('assigned', 'keys_picked', 'walking', 'driving', 'ready')
      LEFT JOIN vehicles v ON r.unique_card_id = v.unique_card_id
      ORDER BY d.fullName
    `).all();
    
    // Format response with computed status
    const formattedDrivers = drivers.map(d => {
      // If driver has active task, they're busy
      let computedStatus = d.status;
      if (d.current_task_id && d.status === 'online') {
        computedStatus = 'busy';
      }
      
      return {
        id: d.id,
        full_name: d.full_name,
        username: d.username,
        phone: d.phone,
        email: d.email,
        status: computedStatus,
        licenseNumber: d.licenseNumber,
        createdAt: d.createdAt,
        lastLogin: d.lastLogin,
        current_task: d.current_task_id ? {
          id: d.current_task_id,
          status: d.task_status,
          license_plate: d.task_vehicle_plate,
          make: d.task_vehicle_make,
          model: d.task_vehicle_model,
          hook_number: d.task_hook_number
        } : null
      };
    });
    
    res.json({ success: true, drivers: formattedDrivers });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create a new driver
router.post('/drivers', (req, res) => {
  const db = req.app.get('db');
  try {
    const { fullName, username, password, phone, email } = req.body;
    
    if (!fullName || !username || !password || !phone) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    // Check if username already exists
    const existing = db.prepare('SELECT id FROM drivers WHERE username = ?').get(username);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }
    
    // Hash password
    const crypto = require('crypto');
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    
    const result = db.prepare(`
      INSERT INTO drivers (fullName, username, password, phone, email, status, createdAt)
      VALUES (?, ?, ?, ?, ?, 'offline', datetime('now'))
    `).run(fullName, username, hashedPassword, phone, email || null);
    
    res.json({ 
      success: true, 
      message: 'Driver created successfully',
      driverId: result.lastInsertRowid 
    });
  } catch (error) {
    console.error('Error creating driver:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update driver status
router.post('/drivers/:driverId/status', (req, res) => {
  const db = req.app.get('db');
  try {
    const { driverId } = req.params;
    const { status } = req.body;
    
    if (!['online', 'offline', 'busy'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Use: online, offline, or busy' });
    }
    
    // Check if driver has active task when trying to go offline
    if (status === 'offline') {
      const activeTask = db.prepare(`
        SELECT id FROM retrieval_requests 
        WHERE assigned_driver_id = ? AND status IN ('assigned', 'keys_picked', 'walking', 'driving', 'ready')
      `).get(driverId);
      
      if (activeTask) {
        return res.status(400).json({ 
          success: false, 
          message: 'Cannot go offline with active task. Complete or cancel task first.' 
        });
      }
    }
    
    db.prepare('UPDATE drivers SET status = ? WHERE id = ?').run(status, driverId);
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('driverStatusChanged', { driverId: parseInt(driverId), status });
    }
    
    console.log(`✅ Driver ${driverId} status changed to ${status}`);
    
    res.json({ success: true, message: `Driver status updated to ${status}` });
  } catch (error) {
    console.error('Error updating driver status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete a driver
router.delete('/drivers/:driverId', (req, res) => {
  const db = req.app.get('db');
  try {
    const { driverId } = req.params;
    
    // Check if driver has active assignments
    const activeAssignment = db.prepare(`
      SELECT id FROM retrieval_requests 
      WHERE assigned_driver_id = ? AND status IN ('assigned', 'in_progress')
    `).get(driverId);
    
    if (activeAssignment) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete driver with active assignments' 
      });
    }
    
    const result = db.prepare('DELETE FROM drivers WHERE id = ?').run(driverId);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    
    res.json({ success: true, message: 'Driver deleted successfully' });
  } catch (error) {
    console.error('Error deleting driver:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Driver logout
router.post('/drivers/logout', (req, res) => {
  const db = req.app.get('db');
  try {
    const { driverId } = req.body;
    
    db.prepare(`UPDATE drivers SET status = 'offline' WHERE id = ?`).run(driverId);
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('driverStatusChanged', { driverId, status: 'offline' });
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error logging out driver:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Station analytics with date range
router.get('/station/analytics', (req, res) => {
  const db = req.app.get('db');
  try {
    const { startDate, endDate } = req.query;
    
    // Default to today if no dates provided
    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];
    
    // Total check-ins in date range
    const checkIns = db.prepare(`
      SELECT COUNT(*) as count FROM vehicles 
      WHERE DATE(check_in_time) BETWEEN ? AND ?
    `).get(start, end);
    
    // Total retrievals (completed) in date range
    const retrievals = db.prepare(`
      SELECT COUNT(*) as count FROM retrieval_requests 
      WHERE status = 'completed' AND DATE(completed_at) BETWEEN ? AND ?
    `).get(start, end);
    
    // Total revenue in date range
    const revenue = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COALESCE(SUM(tip_amount), 0) as tips
      FROM retrieval_requests 
      WHERE payment_processed = 1 AND DATE(completed_at) BETWEEN ? AND ?
    `).get(start, end);
    
    // Average wait time (from request to completion)
    const waitTime = db.prepare(`
      SELECT AVG(
        (julianday(completed_at) - julianday(requested_at)) * 24 * 60
      ) as avg_minutes
      FROM retrieval_requests 
      WHERE status = 'completed' 
      AND completed_at IS NOT NULL 
      AND DATE(completed_at) BETWEEN ? AND ?
    `).get(start, end);
    
    // Active drivers (online status)
    const activeDrivers = db.prepare(`
      SELECT COUNT(*) as count FROM drivers WHERE status = 'online'
    `).get();
    
    // Completion rate
    const totalRequests = db.prepare(`
      SELECT COUNT(*) as total FROM retrieval_requests 
      WHERE DATE(requested_at) BETWEEN ? AND ?
    `).get(start, end);
    
    const completedRequests = db.prepare(`
      SELECT COUNT(*) as completed FROM retrieval_requests 
      WHERE status = 'completed' AND DATE(requested_at) BETWEEN ? AND ?
    `).get(start, end);
    
    const completionRate = totalRequests.total > 0 
      ? Math.round((completedRequests.completed / totalRequests.total) * 100) 
      : 100;
    
    // Peak hours analysis
    const hourlyData = db.prepare(`
      SELECT 
        CAST(strftime('%H', check_in_time) AS INTEGER) as hour,
        COUNT(*) as count
      FROM vehicles 
      WHERE DATE(check_in_time) BETWEEN ? AND ?
      GROUP BY hour
    `).all(start, end);
    
    // Calculate peak periods
    let morning = 0, lunch = 0, afternoon = 0, evening = 0;
    let total = 0;
    
    hourlyData.forEach(row => {
      total += row.count;
      if (row.hour >= 6 && row.hour < 11) morning += row.count;
      else if (row.hour >= 11 && row.hour < 14) lunch += row.count;
      else if (row.hour >= 14 && row.hour < 18) afternoon += row.count;
      else if (row.hour >= 18 && row.hour < 22) evening += row.count;
    });
    
    const peakHours = total > 0 ? [
      { period: 'Morning', percentage: Math.round((morning / total) * 100) },
      { period: 'Lunch', percentage: Math.round((lunch / total) * 100) },
      { period: 'Afternoon', percentage: Math.round((afternoon / total) * 100) },
      { period: 'Evening', percentage: Math.round((evening / total) * 100) }
    ] : [
      { period: 'Morning', percentage: 0 },
      { period: 'Lunch', percentage: 0 },
      { period: 'Afternoon', percentage: 0 },
      { period: 'Evening', percentage: 0 }
    ];
    
    res.json({
      success: true,
      stats: {
        totalCheckIns: checkIns?.count || 0,
        totalRetrievals: retrievals?.count || 0,
        totalRevenue: (revenue?.total || 0) + (revenue?.tips || 0),
        averageWaitTime: Math.round(waitTime?.avg_minutes || 0),
        activeDrivers: activeDrivers?.count || 0,
        completionRate: completionRate,
        peakHours: peakHours
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Station cash payments - with pending and completed separation
router.get('/station/cash-payments', (req, res) => {
  const db = req.app.get('db');
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Pending cash payments (cash payment selected but not yet processed)
    const pending = db.prepare(`
      SELECT r.*, v.license_plate, v.make as vehicle_make, v.model as vehicle_model, 
             v.color as vehicle_color, v.hook_number
      FROM retrieval_requests r
      JOIN vehicles v ON r.unique_card_id = v.unique_card_id
      WHERE r.payment_method = 'cash' AND r.payment_processed = 0
      ORDER BY r.requested_at DESC
    `).all();
    
    // Completed cash payments today
    const completed = db.prepare(`
      SELECT r.*, v.license_plate, v.make as vehicle_make, v.model as vehicle_model, 
             v.color as vehicle_color, v.hook_number
      FROM retrieval_requests r
      JOIN vehicles v ON r.unique_card_id = v.unique_card_id
      WHERE r.payment_method = 'cash' AND r.payment_processed = 1 
      AND DATE(r.completed_at) = ?
      ORDER BY r.completed_at DESC
    `).all(today);
    
    res.json({ success: true, pending, completed });
  } catch (error) {
    console.error('Error getting station cash payments:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Collect cash payment
router.post('/station/collect-cash/:requestId', (req, res) => {
  const db = req.app.get('db');
  try {
    const { requestId } = req.params;
    const { amount, collectedBy } = req.body;
    
    const result = db.prepare(`
      UPDATE retrieval_requests 
      SET payment_processed = 1, amount = ?, completed_at = datetime('now')
      WHERE id = ? AND payment_method = 'cash'
    `).run(amount || 15, requestId);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Request not found or not a cash payment' });
    }
    
    console.log(`✅ Cash collected for request ${requestId}: $${amount} by ${collectedBy}`);
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('cashCollected', { requestId, amount });
    }
    
    res.json({ success: true, message: 'Cash payment collected' });
  } catch (error) {
    console.error('Error collecting cash:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Station daily report - enhanced for day closeout
router.get('/station/daily-report', (req, res) => {
  const db = req.app.get('db');
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Total check-ins today
    const checkIns = db.prepare(`
      SELECT COUNT(*) as count FROM vehicles WHERE DATE(check_in_time) = ?
    `).get(today);
    
    // Total retrievals completed today
    const retrievals = db.prepare(`
      SELECT COUNT(*) as count FROM retrieval_requests 
      WHERE status = 'completed' AND DATE(completed_at) = ?
    `).get(today);
    
    // Still parked
    const stillParked = db.prepare(`
      SELECT COUNT(*) as count FROM vehicles WHERE status = 'parked'
    `).get();
    
    // Cash revenue
    const cashStats = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total 
      FROM retrieval_requests 
      WHERE payment_method = 'cash' AND payment_processed = 1 AND DATE(completed_at) = ?
    `).get(today);
    
    // Card/Online revenue
    const cardStats = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total 
      FROM retrieval_requests 
      WHERE payment_method = 'online' AND payment_processed = 1 AND DATE(completed_at) = ?
    `).get(today);
    
    // Total tips
    const tips = db.prepare(`
      SELECT COALESCE(SUM(tip_amount), 0) as total 
      FROM retrieval_requests 
      WHERE DATE(completed_at) = ?
    `).get(today);
    
    // Completion rate
    const totalRequests = db.prepare(`
      SELECT COUNT(*) as count FROM retrieval_requests WHERE DATE(requested_at) = ?
    `).get(today);
    
    const completionRate = totalRequests.count > 0 
      ? Math.round((retrievals.count / totalRequests.count) * 100) 
      : 100;
    
    res.json({
      success: true,
      report: {
        date: today,
        totalCheckIns: checkIns?.count || 0,
        totalRetrievals: retrievals?.count || 0,
        stillParked: stillParked?.count || 0,
        completionRate: completionRate,
        cashRevenue: cashStats?.total || 0,
        cashCount: cashStats?.count || 0,
        cardRevenue: cardStats?.total || 0,
        cardCount: cardStats?.count || 0,
        totalRevenue: (cashStats?.total || 0) + (cardStats?.total || 0),
        totalTips: tips?.total || 0
      }
    });
  } catch (error) {
    console.error('Error getting station daily report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Closeout day
router.post('/station/closeout-day', (req, res) => {
  const db = req.app.get('db');
  try {
    const today = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();
    
    // Create closeout record
    db.exec(`
      CREATE TABLE IF NOT EXISTS daily_closeouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        total_checkins INTEGER,
        total_retrievals INTEGER,
        cash_revenue REAL,
        card_revenue REAL,
        total_revenue REAL,
        total_tips REAL,
        closed_by TEXT,
        closed_at TEXT
      )
    `);
    
    // Get today's stats
    const checkIns = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE DATE(check_in_time) = ?").get(today);
    const retrievals = db.prepare("SELECT COUNT(*) as count FROM retrieval_requests WHERE status = 'completed' AND DATE(completed_at) = ?").get(today);
    const cashStats = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM retrieval_requests WHERE payment_method = 'cash' AND payment_processed = 1 AND DATE(completed_at) = ?").get(today);
    const cardStats = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM retrieval_requests WHERE payment_method = 'online' AND payment_processed = 1 AND DATE(completed_at) = ?").get(today);
    const tips = db.prepare("SELECT COALESCE(SUM(tip_amount), 0) as total FROM retrieval_requests WHERE DATE(completed_at) = ?").get(today);
    
    // Save closeout record
    db.prepare(`
      INSERT INTO daily_closeouts (date, total_checkins, total_retrievals, cash_revenue, card_revenue, total_revenue, total_tips, closed_by, closed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      today,
      checkIns?.count || 0,
      retrievals?.count || 0,
      cashStats?.total || 0,
      cardStats?.total || 0,
      (cashStats?.total || 0) + (cardStats?.total || 0),
      tips?.total || 0,
      'Station Manager',
      timestamp
    );
    
    console.log(`✅ Day closed out for ${today}`);
    
    res.json({ 
      success: true, 
      message: 'Day closed out successfully',
      closeoutId: db.prepare("SELECT last_insert_rowid() as id").get().id
    });
  } catch (error) {
    console.error('Error closing out day:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// STATION DASHBOARD ENDPOINTS
// ============================================

// GET /api/station/stats - Real-time dashboard stats
router.get('/station/stats', (req, res) => {
  const db = req.app.get('db');
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get parked vehicles count
    const parkedResult = db.prepare(`
      SELECT COUNT(*) as count FROM vehicles WHERE status = 'parked'
    `).get();
    
    // Get active drivers count (on shift)
    let activeDrivers = 0;
    try {
      activeDrivers = db.prepare(`
        SELECT COUNT(*) as count FROM drivers WHERE status IN ('available', 'busy')
      `).get()?.count || 0;
    } catch (e) {
      // Drivers table might not have status column
    }
    
    // Get pending requests count
    const pendingResult = db.prepare(`
      SELECT COUNT(*) as count FROM retrieval_requests 
      WHERE status IN ('pending', 'assigned')
    `).get();
    
    // Get today's revenue
    const revenueResult = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM retrieval_requests 
      WHERE payment_processed = 1 AND DATE(completed_at) = ?
    `).get(today);
    
    // Get today's tips
    const tipsResult = db.prepare(`
      SELECT COALESCE(SUM(tip_amount), 0) as total 
      FROM retrieval_requests 
      WHERE DATE(completed_at) = ?
    `).get(today);
    
    // Get today's retrievals count
    const retrievalsResult = db.prepare(`
      SELECT COUNT(*) as count FROM retrieval_requests 
      WHERE status = 'completed' AND DATE(completed_at) = ?
    `).get(today);
    
    // Get hooks stats
    const hookManager = req.app.get('hookManager');
    const hooksStats = hookManager ? hookManager.getStats() : { total: 50, available: 50, occupied: 0 };
    
    res.json({
      success: true,
      stats: {
        parkedVehicles: parkedResult?.count || 0,
        activeDrivers: activeDrivers,
        pendingRequests: pendingResult?.count || 0,
        todayRevenue: revenueResult?.total || 0,
        todayTips: tipsResult?.total || 0,
        todayRetrievals: retrievalsResult?.count || 0,
        hooks: hooksStats
      }
    });
  } catch (error) {
    console.error('Error getting station stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/queue - Enhanced queue with all details
router.get('/queue/detailed', (req, res) => {
  const db = req.app.get('db');
  try {
    const requests = db.prepare(`
      SELECT 
        rr.*,
        v.license_plate,
        v.make,
        v.model,
        v.color,
        v.hook_number,
        d.username as driver_username,
        d.fullName as driver_name
      FROM retrieval_requests rr
      LEFT JOIN vehicles v ON rr.unique_card_id = v.unique_card_id
      LEFT JOIN drivers d ON rr.assigned_driver_id = d.id
      WHERE rr.status IN ('pending', 'assigned', 'in_progress', 'ready')
      ORDER BY 
        rr.is_priority DESC,
        rr.created_at ASC
    `).all();
    
    res.json({
      success: true,
      requests: requests.map(r => ({
        id: r.id,
        status: r.status,
        is_priority: r.is_priority === 1,
        is_vip: r.is_priority === 1, // Map to VIP for now
        requested_at: r.created_at,
        customer_notified: r.customer_notified === 1,
        customer_name: r.customer_name,
        license_plate: r.license_plate,
        make: r.make,
        model: r.model,
        color: r.color,
        hook_number: r.hook_number,
        driver_id: r.driver_id,
        driver_name: r.driver_name,
        driver_username: r.driver_username
      }))
    });
  } catch (error) {
    console.error('Error getting detailed queue:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/queue/:requestId/assign - Assign driver to request
router.post('/queue/:requestId/assign', (req, res) => {
  const db = req.app.get('db');
  try {
    const { requestId } = req.params;
    const { driverId } = req.body;
    
    // Update request with driver
    db.prepare(`
      UPDATE retrieval_requests 
      SET driver_id = ?, status = 'assigned', assigned_at = datetime('now')
      WHERE id = ?
    `).run(driverId, requestId);
    
    // Update driver status to busy
    try {
      db.prepare(`UPDATE drivers SET status = 'busy' WHERE id = ?`).run(driverId);
    } catch (e) {
      // Driver status column might not exist
    }
    
    res.json({ success: true, message: 'Driver assigned' });
  } catch (error) {
    console.error('Error assigning driver:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/queue/:requestId/cancel - Cancel request
router.post('/queue/:requestId/cancel', (req, res) => {
  const db = req.app.get('db');
  try {
    const { requestId } = req.params;
    
    db.prepare(`
      UPDATE retrieval_requests 
      SET status = 'cancelled', cancelled_at = datetime('now')
      WHERE id = ?
    `).run(requestId);
    
    res.json({ success: true, message: 'Request cancelled' });
  } catch (error) {
    console.error('Error cancelling request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/notifications/customer/:requestId - Mark customer as notified
router.post('/notifications/customer/:requestId', (req, res) => {
  const db = req.app.get('db');
  try {
    const { requestId } = req.params;
    
    db.prepare(`
      UPDATE retrieval_requests 
      SET customer_notified = 1, customer_notified_at = datetime('now')
      WHERE id = ?
    `).run(requestId);
    
    res.json({ success: true, message: 'Customer notified' });
  } catch (error) {
    console.error('Error notifying customer:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// SHIFT MANAGEMENT ENDPOINTS
// ============================================

// GET /api/shifts/active - Get all active driver shifts
router.get('/shifts/active', (req, res) => {
  const db = req.app.get('db');
  try {
    // First ensure shifts table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS driver_shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_id INTEGER NOT NULL,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ended_at DATETIME,
        retrievals INTEGER DEFAULT 0,
        tips_earned REAL DEFAULT 0,
        FOREIGN KEY (driver_id) REFERENCES drivers(id)
      )
    `);
    
    const shifts = db.prepare(`
      SELECT 
        ds.id,
        ds.driver_id,
        ds.started_at,
        ds.retrievals,
        ds.tips_earned,
        d.username as driver_username,
        d.fullName as driver_name
      FROM driver_shifts ds
      JOIN drivers d ON ds.driver_id = d.id
      WHERE ds.ended_at IS NULL
    `).all();
    
    res.json({ success: true, shifts });
  } catch (error) {
    console.error('Error getting active shifts:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/shifts/start - Start a driver shift
router.post('/shifts/start', (req, res) => {
  const db = req.app.get('db');
  try {
    const { driverId } = req.body;
    
    // Check if driver already has an active shift
    const existing = db.prepare(`
      SELECT id FROM driver_shifts WHERE driver_id = ? AND ended_at IS NULL
    `).get(driverId);
    
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: 'Driver already has an active shift' 
      });
    }
    
    // Create new shift
    const result = db.prepare(`
      INSERT INTO driver_shifts (driver_id) VALUES (?)
    `).run(driverId);
    
    // Update driver status
    try {
      db.prepare(`UPDATE drivers SET status = 'available' WHERE id = ?`).run(driverId);
    } catch (e) {}
    
    res.json({ 
      success: true, 
      shiftId: result.lastInsertRowid,
      message: 'Shift started' 
    });
  } catch (error) {
    console.error('Error starting shift:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/shifts/end - End a driver shift
router.post('/shifts/end', (req, res) => {
  const db = req.app.get('db');
  try {
    const { shiftId, driverId } = req.body;
    
    db.prepare(`
      UPDATE driver_shifts 
      SET ended_at = datetime('now')
      WHERE id = ? OR (driver_id = ? AND ended_at IS NULL)
    `).run(shiftId, driverId);
    
    // Update driver status
    try {
      db.prepare(`UPDATE drivers SET status = 'offline' WHERE id = ?`).run(driverId);
    } catch (e) {}
    
    res.json({ success: true, message: 'Shift ended' });
  } catch (error) {
    console.error('Error ending shift:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// ANALYTICS ENDPOINTS
// ============================================

// GET /api/analytics/daily - Daily analytics
router.get('/analytics/daily', (req, res) => {
  const db = req.app.get('db');
  try {
    const { period = 'today' } = req.query;
    let dateFilter;
    
    if (period === 'today') {
      dateFilter = new Date().toISOString().split('T')[0];
    } else if (period === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = weekAgo.toISOString().split('T')[0];
    } else {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      dateFilter = monthAgo.toISOString().split('T')[0];
    }
    
    const retrievals = db.prepare(`
      SELECT COUNT(*) as count FROM retrieval_requests 
      WHERE status = 'completed' AND DATE(completed_at) >= ?
    `).get(dateFilter);
    
    const revenue = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM retrieval_requests 
      WHERE payment_processed = 1 AND DATE(completed_at) >= ?
    `).get(dateFilter);
    
    const tips = db.prepare(`
      SELECT COALESCE(SUM(tip_amount), 0) as total FROM retrieval_requests 
      WHERE DATE(completed_at) >= ?
    `).get(dateFilter);
    
    const valetFees = db.prepare(`
      SELECT COALESCE(SUM(amount - COALESCE(tip_amount, 0)), 0) as total FROM retrieval_requests 
      WHERE payment_processed = 1 AND DATE(completed_at) >= ?
    `).get(dateFilter);
    
    const cashPayments = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM retrieval_requests 
      WHERE payment_method = 'cash' AND payment_processed = 1 AND DATE(completed_at) >= ?
    `).get(dateFilter);
    
    const cardPayments = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM retrieval_requests 
      WHERE payment_method = 'online' AND payment_processed = 1 AND DATE(completed_at) >= ?
    `).get(dateFilter);
    
    res.json({
      success: true,
      totalRetrievals: retrievals?.count || 0,
      totalRevenue: revenue?.total || 0,
      totalTips: tips?.total || 0,
      valetFees: valetFees?.total || 0,
      cashPayments: cashPayments?.total || 0,
      cardPayments: cardPayments?.total || 0,
      avgWaitTime: 3.5 // Placeholder - would need actual timing data
    });
  } catch (error) {
    console.error('Error getting daily analytics:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/analytics/drivers - Driver performance
router.get('/analytics/drivers', (req, res) => {
  const db = req.app.get('db');
  try {
    const drivers = db.prepare(`
      SELECT 
        d.id,
        d.username,
        d.fullName as name,
        COUNT(rr.id) as retrievals,
        COALESCE(SUM(rr.tip_amount), 0) as tips
      FROM drivers d
      LEFT JOIN retrieval_requests rr ON rr.assigned_driver_id = d.id 
        AND rr.status = 'completed'
        AND DATE(rr.completed_at) = DATE('now')
      GROUP BY d.id
      ORDER BY retrievals DESC
    `).all();
    
    res.json({ success: true, drivers });
  } catch (error) {
    console.error('Error getting driver analytics:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// CLOSEOUT ENDPOINTS
// ============================================

// GET /api/closeout/current - Get current shift data for closeout
router.get('/closeout/current', (req, res) => {
  const db = req.app.get('db');
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const retrievals = db.prepare(`
      SELECT COUNT(*) as count FROM retrieval_requests 
      WHERE status = 'completed' AND DATE(completed_at) = ?
    `).get(today);
    
    const valetFees = db.prepare(`
      SELECT COALESCE(SUM(amount - COALESCE(tip_amount, 0)), 0) as total 
      FROM retrieval_requests 
      WHERE payment_processed = 1 AND DATE(completed_at) = ?
    `).get(today);
    
    const tips = db.prepare(`
      SELECT COALESCE(SUM(tip_amount), 0) as total 
      FROM retrieval_requests 
      WHERE DATE(completed_at) = ?
    `).get(today);
    
    const cashCollected = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM retrieval_requests 
      WHERE payment_method = 'cash' AND payment_processed = 1 AND DATE(completed_at) = ?
    `).get(today);
    
    const cardPayments = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM retrieval_requests 
      WHERE payment_method = 'online' AND payment_processed = 1 AND DATE(completed_at) = ?
    `).get(today);
    
    // Get driver breakdown
    const driverBreakdown = db.prepare(`
      SELECT 
        d.fullName as name,
        COUNT(rr.id) as retrievals,
        COALESCE(SUM(rr.tip_amount), 0) as tips
      FROM drivers d
      JOIN retrieval_requests rr ON rr.assigned_driver_id = d.id 
        AND rr.status = 'completed'
        AND DATE(rr.completed_at) = ?
      GROUP BY d.id
    `).all(today);
    
    res.json({
      success: true,
      data: {
        shiftStart: new Date(new Date().setHours(6, 0, 0, 0)).toISOString(),
        totalRetrievals: retrievals?.count || 0,
        valetFees: valetFees?.total || 0,
        tips: tips?.total || 0,
        cashCollected: cashCollected?.total || 0,
        cardPayments: cardPayments?.total || 0,
        expectedCash: cashCollected?.total || 0,
        driverBreakdown: driverBreakdown || []
      }
    });
  } catch (error) {
    console.error('Error getting closeout data:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/closeout/submit - Submit closeout
router.post('/closeout/submit', (req, res) => {
  const db = req.app.get('db');
  try {
    const { managerId, cashCounted, expectedCash, variance, notes, breakdown } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();
    
    // Ensure closeouts table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS shift_closeouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        manager_id INTEGER,
        cash_counted REAL,
        expected_cash REAL,
        variance REAL,
        notes TEXT,
        breakdown TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const result = db.prepare(`
      INSERT INTO shift_closeouts (date, manager_id, cash_counted, expected_cash, variance, notes, breakdown)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(today, managerId, cashCounted, expectedCash, variance, notes, JSON.stringify(breakdown));
    
    res.json({ 
      success: true, 
      closeoutId: result.lastInsertRowid,
      message: 'Closeout submitted successfully' 
    });
  } catch (error) {
    console.error('Error submitting closeout:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/hooks/stats/summary - Hook statistics
router.get('/hooks/stats/summary', (req, res) => {
  const db = req.app.get('db');
  const hookManager = req.app.get('hookManager');
  
  try {
    if (hookManager) {
      const stats = hookManager.getStats();
      res.json({ success: true, stats });
    } else {
      // Fallback stats from database
      const parked = db.prepare(`
        SELECT COUNT(*) as count FROM vehicles WHERE status = 'parked'
      `).get();
      
      res.json({
        success: true,
        stats: {
          total: 50,
          available: 50 - (parked?.count || 0),
          occupied: parked?.count || 0,
          reserved: 0
        }
      });
    }
  } catch (error) {
    console.error('Error getting hooks stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/hooks/heatmap - Hook usage heatmap data
router.get('/hooks/heatmap', (req, res) => {
  const db = req.app.get('db');
  try {
    // Get usage count per hook for last 30 days
    const usage = db.prepare(`
      SELECT 
        hook_number,
        COUNT(*) as usage_count
      FROM vehicles
      WHERE check_in_time >= datetime('now', '-30 days')
      GROUP BY hook_number
    `).all();
    
    const heatmap = {};
    usage.forEach(u => {
      heatmap[u.hook_number] = u.usage_count;
    });
    
    res.json({ success: true, heatmap });
  } catch (error) {
    console.error('Error getting heatmap:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/vehicles/:vehicleId/photos - Get vehicle photos
router.get('/vehicles/:vehicleId/photos', (req, res) => {
  const db = req.app.get('db');
  try {
    const { vehicleId } = req.params;
    
    // Check if photos table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='vehicle_photos'
    `).get();
    
    if (!tableExists) {
      return res.json({ success: true, photos: [] });
    }
    
    const photos = db.prepare(`
      SELECT * FROM vehicle_photos WHERE vehicle_id = ?
    `).all(vehicleId);
    
    res.json({ success: true, photos });
  } catch (error) {
    console.error('Error getting vehicle photos:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// LOST CARD VERIFICATION ENDPOINTS
// ============================================

// POST /api/lost-card/verify - Log lost card verification
router.post('/lost-card/verify', (req, res) => {
  const db = req.app.get('db');
  try {
    const {
      vehicleId,
      licensePlate,
      hookNumber,
      customerName,
      phoneNumber,
      idType,
      idNumber,
      vehicleDescription,
      additionalNotes,
      verifiedBy,
      verifiedAt
    } = req.body;

    // Ensure lost_card_verifications table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS lost_card_verifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER,
        license_plate TEXT,
        hook_number INTEGER,
        customer_name TEXT NOT NULL,
        phone_number TEXT,
        id_type TEXT,
        id_number TEXT,
        vehicle_description TEXT,
        additional_notes TEXT,
        verified_by TEXT,
        verified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        retrieval_completed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const result = db.prepare(`
      INSERT INTO lost_card_verifications (
        vehicle_id, license_plate, hook_number, customer_name, phone_number,
        id_type, id_number, vehicle_description, additional_notes,
        verified_by, verified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      vehicleId,
      licensePlate,
      hookNumber,
      customerName,
      phoneNumber,
      idType,
      idNumber,
      vehicleDescription,
      additionalNotes,
      verifiedBy,
      verifiedAt
    );

    console.log(`✅ Lost card verification logged for ${licensePlate} by ${verifiedBy}`);

    res.json({
      success: true,
      verificationId: result.lastInsertRowid,
      message: 'Verification logged successfully'
    });
  } catch (error) {
    console.error('Error logging lost card verification:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/lost-card/history - Get lost card verification history
router.get('/lost-card/history', (req, res) => {
  const db = req.app.get('db');
  try {
    // Check if table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='lost_card_verifications'
    `).get();

    if (!tableExists) {
      return res.json({ success: true, verifications: [] });
    }

    const verifications = db.prepare(`
      SELECT * FROM lost_card_verifications
      ORDER BY created_at DESC
      LIMIT 100
    `).all();

    res.json({ success: true, verifications });
  } catch (error) {
    console.error('Error getting lost card history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// SETTINGS ENDPOINTS
// ============================================

// Ensure settings table exists
const ensureSettingsTable = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

// Default settings
const DEFAULT_SETTINGS = {
  pricingModel: 'flat',
  flatRate: 15,
  hourlyRate: 5,
  hourlyMinimum: 10,
  priorityFee: 10,
  tipPolicy: 'individual',
  suggestedTips: [3, 5, 10],
  maxHooks: 50,
  retrievalTimeout: 15,
};

// GET /api/settings
router.get('/settings', (req, res) => {
  const db = req.app.get('db');
  try {
    ensureSettingsTable(db);
    
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = { ...DEFAULT_SETTINGS };
    
    rows.forEach(row => {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    });
    
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/settings
router.post('/settings', (req, res) => {
  const db = req.app.get('db');
  try {
    ensureSettingsTable(db);
    
    const settings = req.body;
    
    const upsert = db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `);
    
    Object.entries(settings).forEach(([key, value]) => {
      const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
      upsert.run(key, serialized);
    });
    
    console.log('✅ Settings updated');
    
    res.json({ success: true, message: 'Settings saved' });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/settings/pricing - Get just pricing for customer apps
router.get('/settings/pricing', (req, res) => {
  const db = req.app.get('db');
  try {
    ensureSettingsTable(db);
    
    const rows = db.prepare('SELECT key, value FROM settings WHERE key IN (?, ?, ?, ?, ?)').all(
      'pricingModel', 'flatRate', 'hourlyRate', 'hourlyMinimum', 'priorityFee'
    );
    
    const pricing = {
      pricingModel: 'flat',
      flatRate: 15,
      hourlyRate: 5,
      hourlyMinimum: 10,
      priorityFee: 10,
    };
    
    rows.forEach(row => {
      try {
        pricing[row.key] = JSON.parse(row.value);
      } catch {
        pricing[row.key] = row.value;
      }
    });
    
    res.json({ success: true, pricing });
  } catch (error) {
    console.error('Error getting pricing:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
