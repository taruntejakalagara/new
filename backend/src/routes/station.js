/**
 * Station Dashboard Routes
 * Handles station operations, cash management, and reporting
 */
const express = require('express');
const router = express.Router();
const { station: stationValidators, payment: paymentValidators } = require('../middleware/validation');

/**
 * GET /api/station/overview
 * Get station dashboard overview stats
 */
router.get('/overview', (req, res) => {
  const db = req.app.get('db');
  try {
    // Count parked vehicles
    const parkedVehicles = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'parked'").get();
    
    // Count vehicles being retrieved
    const retrieving = db.prepare(`
      SELECT COUNT(*) as count FROM retrieval_requests 
      WHERE status IN ('pending', 'assigned', 'in_progress')
    `).get();

    // Count ready for handover
    const readyForHandover = db.prepare(`
      SELECT COUNT(*) as count FROM retrieval_requests 
      WHERE status = 'ready'
    `).get();
    
    // Count available drivers (online status)
    const availableDrivers = db.prepare("SELECT COUNT(*) as count FROM drivers WHERE status = 'online'").get();
    
    // Count busy drivers
    const busyDrivers = db.prepare(`
      SELECT COUNT(DISTINCT assigned_driver_id) as count FROM retrieval_requests 
      WHERE status IN ('assigned', 'in_progress') AND assigned_driver_id IS NOT NULL
    `).get();

    // Today's stats
    const today = new Date().toISOString().split('T')[0];
    const todayCheckIns = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE DATE(check_in_time) = ?").get(today);
    const todayRetrievals = db.prepare("SELECT COUNT(*) as count FROM retrieval_requests WHERE status = 'completed' AND DATE(completed_at) = ?").get(today);
    
    res.json({
      success: true,
      stats: {
        totalParked: parkedVehicles?.count || 0,
        totalRetrieving: retrieving?.count || 0,
        readyForHandover: readyForHandover?.count || 0,
        availableDrivers: availableDrivers?.count || 0,
        busyDrivers: busyDrivers?.count || 0,
        todayCheckIns: todayCheckIns?.count || 0,
        todayRetrievals: todayRetrievals?.count || 0
      }
    });
  } catch (error) {
    console.error('Error getting station overview:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/station/cash-payments
 * Get cash payments (pending and completed)
 */
router.get('/cash-payments', (req, res) => {
  const db = req.app.get('db');
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Pending cash payments
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

/**
 * POST /api/station/collect-cash/:requestId
 * Mark cash as collected for a request
 */
router.post('/collect-cash/:requestId', stationValidators.collectCash, (req, res) => {
  const db = req.app.get('db');
  try {
    const { requestId } = req.params;
    const { amount, collectedBy } = req.body;
    
    const result = db.prepare(`
      UPDATE retrieval_requests 
      SET payment_processed = 1, 
          amount = ?, 
          completed_at = COALESCE(completed_at, datetime('now'))
      WHERE id = ? AND payment_method = 'cash'
    `).run(amount || 15, requestId);
    
    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Request not found or not a cash payment' 
      });
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

/**
 * GET /api/station/daily-report
 * Get comprehensive daily report
 */
router.get('/daily-report', (req, res) => {
  const db = req.app.get('db');
  try {
    const { date } = req.query;
    const reportDate = date || new Date().toISOString().split('T')[0];
    
    // Total check-ins
    const checkIns = db.prepare(`
      SELECT COUNT(*) as count FROM vehicles WHERE DATE(check_in_time) = ?
    `).get(reportDate);
    
    // Total retrievals completed
    const retrievals = db.prepare(`
      SELECT COUNT(*) as count FROM retrieval_requests 
      WHERE status = 'completed' AND DATE(completed_at) = ?
    `).get(reportDate);
    
    // Still parked
    const stillParked = db.prepare(`
      SELECT COUNT(*) as count FROM vehicles WHERE status = 'parked'
    `).get();
    
    // Cash revenue
    const cashStats = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total 
      FROM retrieval_requests 
      WHERE payment_method = 'cash' AND payment_processed = 1 AND DATE(completed_at) = ?
    `).get(reportDate);
    
    // Card/Online revenue
    const cardStats = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total 
      FROM retrieval_requests 
      WHERE payment_method = 'online' AND payment_processed = 1 AND DATE(completed_at) = ?
    `).get(reportDate);
    
    // Total tips
    const tips = db.prepare(`
      SELECT COALESCE(SUM(tip_amount), 0) as total 
      FROM retrieval_requests 
      WHERE DATE(completed_at) = ?
    `).get(reportDate);
    
    // Completion rate
    const totalRequests = db.prepare(`
      SELECT COUNT(*) as count FROM retrieval_requests WHERE DATE(requested_at) = ?
    `).get(reportDate);
    
    const completionRate = totalRequests.count > 0 
      ? Math.round((retrievals.count / totalRequests.count) * 100) 
      : 100;

    // Average wait time
    const avgWait = db.prepare(`
      SELECT AVG(
        (julianday(car_ready_at) - julianday(requested_at)) * 24 * 60
      ) as avg_minutes
      FROM retrieval_requests 
      WHERE status = 'completed' 
      AND car_ready_at IS NOT NULL 
      AND DATE(completed_at) = ?
    `).get(reportDate);
    
    res.json({
      success: true,
      report: {
        date: reportDate,
        totalCheckIns: checkIns?.count || 0,
        totalRetrievals: retrievals?.count || 0,
        stillParked: stillParked?.count || 0,
        completionRate: completionRate,
        cashRevenue: cashStats?.total || 0,
        cashCount: cashStats?.count || 0,
        cardRevenue: cardStats?.total || 0,
        cardCount: cardStats?.count || 0,
        totalRevenue: (cashStats?.total || 0) + (cardStats?.total || 0),
        totalTips: tips?.total || 0,
        avgWaitMinutes: avgWait?.avg_minutes ? Math.round(avgWait.avg_minutes) : 0
      }
    });
  } catch (error) {
    console.error('Error getting station daily report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/station/closeout-day
 * Close out the day and create a summary record
 */
router.post('/closeout-day', stationValidators.closeout, (req, res) => {
  const db = req.app.get('db');
  try {
    const today = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();
    const { closedBy } = req.body;
    
    // Create closeout table if not exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS daily_closeouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
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
    
    // Check if already closed out
    const existing = db.prepare('SELECT id FROM daily_closeouts WHERE date = ?').get(today);
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: 'Day has already been closed out' 
      });
    }
    
    // Get today's stats
    const checkIns = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE DATE(check_in_time) = ?").get(today);
    const retrievals = db.prepare("SELECT COUNT(*) as count FROM retrieval_requests WHERE status = 'completed' AND DATE(completed_at) = ?").get(today);
    const cashStats = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM retrieval_requests WHERE payment_method = 'cash' AND payment_processed = 1 AND DATE(completed_at) = ?").get(today);
    const cardStats = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM retrieval_requests WHERE payment_method = 'online' AND payment_processed = 1 AND DATE(completed_at) = ?").get(today);
    const tips = db.prepare("SELECT COALESCE(SUM(tip_amount), 0) as total FROM retrieval_requests WHERE DATE(completed_at) = ?").get(today);
    
    // Save closeout record
    const result = db.prepare(`
      INSERT INTO daily_closeouts (
        date, total_checkins, total_retrievals, 
        cash_revenue, card_revenue, total_revenue, total_tips, 
        closed_by, closed_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      today,
      checkIns?.count || 0,
      retrievals?.count || 0,
      cashStats?.total || 0,
      cardStats?.total || 0,
      (cashStats?.total || 0) + (cardStats?.total || 0),
      tips?.total || 0,
      closedBy || 'Station Manager',
      timestamp
    );
    
    console.log(`✅ Day closed out for ${today}`);
    
    res.json({ 
      success: true, 
      message: 'Day closed out successfully',
      closeoutId: result.lastInsertRowid,
      summary: {
        date: today,
        totalCheckIns: checkIns?.count || 0,
        totalRetrievals: retrievals?.count || 0,
        totalRevenue: (cashStats?.total || 0) + (cardStats?.total || 0),
        totalTips: tips?.total || 0
      }
    });
  } catch (error) {
    console.error('Error closing out day:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/station/closeout-history
 * Get history of daily closeouts
 */
router.get('/closeout-history', (req, res) => {
  const db = req.app.get('db');
  try {
    const { limit = 30 } = req.query;
    
    // Check if table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='daily_closeouts'
    `).get();
    
    if (!tableExists) {
      return res.json({ success: true, closeouts: [] });
    }
    
    const closeouts = db.prepare(`
      SELECT * FROM daily_closeouts 
      ORDER BY date DESC 
      LIMIT ?
    `).all(parseInt(limit));
    
    res.json({ success: true, closeouts });
  } catch (error) {
    console.error('Error getting closeout history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/station/pricing
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
    
    res.json({
      success: true,
      pricing: {
        base_valet_fee: baseFee ? parseFloat(baseFee.value) : 15,
        priority_fee: priorityFee ? parseFloat(priorityFee.value) : 10,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate.value) : 5,
        surge_multiplier: surgeMultiplier ? parseFloat(surgeMultiplier.value) : 1.0,
        surge_enabled: surgeEnabled ? surgeEnabled.value === 'true' : false
      }
    });
  } catch (error) {
    console.error('Error getting station pricing:', error);
    res.json({
      success: true,
      pricing: { 
        base_valet_fee: 15, 
        priority_fee: 10, 
        hourly_rate: 5,
        surge_multiplier: 1.0, 
        surge_enabled: false 
      }
    });
  }
});

/**
 * POST /api/station/pricing
 * Update pricing configuration
 */
router.post('/pricing', paymentValidators.updatePricing, (req, res) => {
  const db = req.app.get('db');
  try {
    const { base_valet_fee, priority_fee, hourly_rate, surge_multiplier, surge_enabled } = req.body;
    
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
    
    updateSetting('base_fee', base_valet_fee);
    updateSetting('priority_fee', priority_fee);
    updateSetting('hourly_rate', hourly_rate);
    updateSetting('surge_multiplier', surge_multiplier);
    updateSetting('surge_enabled', surge_enabled);
    
    console.log('✅ Station pricing updated');
    res.json({ success: true, message: 'Pricing updated successfully' });
  } catch (error) {
    console.error('Error updating station pricing:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/station/analytics
 * Get detailed analytics with date range
 */
router.get('/analytics', stationValidators.dateRange, (req, res) => {
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
    
    // Total retrievals in date range
    const retrievals = db.prepare(`
      SELECT COUNT(*) as count FROM retrieval_requests 
      WHERE status = 'completed' AND DATE(completed_at) BETWEEN ? AND ?
    `).get(start, end);
    
    // Total revenue
    const revenue = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COALESCE(SUM(tip_amount), 0) as tips
      FROM retrieval_requests 
      WHERE payment_processed = 1 AND DATE(completed_at) BETWEEN ? AND ?
    `).get(start, end);
    
    // Average wait time
    const waitTime = db.prepare(`
      SELECT AVG(
        (julianday(completed_at) - julianday(requested_at)) * 24 * 60
      ) as avg_minutes
      FROM retrieval_requests 
      WHERE status = 'completed' 
      AND completed_at IS NOT NULL 
      AND DATE(completed_at) BETWEEN ? AND ?
    `).get(start, end);
    
    // Active drivers
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
      { period: 'Morning (6-11)', percentage: Math.round((morning / total) * 100), count: morning },
      { period: 'Lunch (11-2)', percentage: Math.round((lunch / total) * 100), count: lunch },
      { period: 'Afternoon (2-6)', percentage: Math.round((afternoon / total) * 100), count: afternoon },
      { period: 'Evening (6-10)', percentage: Math.round((evening / total) * 100), count: evening }
    ] : [];
    
    res.json({
      success: true,
      dateRange: { start, end },
      stats: {
        totalCheckIns: checkIns?.count || 0,
        totalRetrievals: retrievals?.count || 0,
        totalRevenue: (revenue?.total || 0) + (revenue?.tips || 0),
        revenueBreakdown: {
          fees: revenue?.total || 0,
          tips: revenue?.tips || 0
        },
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

module.exports = router;
