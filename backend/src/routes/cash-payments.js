const express = require('express');
const { DateTime } = require('luxon');
const router = express.Router();

router.get('/cash-payments', (req, res) => {
  const db = req.app.get('db');
  
  try {
    const pending = db.prepare(`
      SELECT 
        rr.id, rr.unique_card_id, rr.amount, rr.tip_amount,
        rr.requested_at, rr.completed_at,
        v.make as vehicle_make, v.model as vehicle_model,
        v.color as vehicle_color, v.license_plate, v.hook_number,
        d.fullName as driver_name
      FROM retrieval_requests rr
      JOIN vehicles v ON rr.unique_card_id = v.unique_card_id
      LEFT JOIN drivers d ON rr.assigned_driver_id = d.id
      WHERE rr.payment_method = 'cash'
        AND rr.payment_processed = 0
        AND rr.status = 'retrieving'
      ORDER BY rr.requested_at ASC
    `).all();
    
    const completed = db.prepare(`
      SELECT 
        rr.id, rr.unique_card_id, rr.amount, rr.tip_amount,
        rr.requested_at, rr.completed_at,
        v.make as vehicle_make, v.model as vehicle_model,
        v.color as vehicle_color, v.license_plate, v.hook_number,
        d.fullName as driver_name
      FROM retrieval_requests rr
      JOIN vehicles v ON rr.unique_card_id = v.unique_card_id
      LEFT JOIN drivers d ON rr.assigned_driver_id = d.id
      WHERE rr.payment_method IN ('cash', 'pay_at_counter')
        AND rr.payment_processed = 1
        AND DATE(rr.completed_at) = DATE('now')
      ORDER BY rr.completed_at DESC
    `).all();
    
    res.json({ success: true, pending, completed });
  } catch (error) {
    console.error('Error getting cash payments:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

// Get daily report (current day stats)
router.get('/daily-report', (req, res) => {
  const db = req.app.get('db');
  
  try {
    const today = DateTime.now().setZone('America/New_York').toFormat('yyyy-MM-dd');
    
    const checkIns = db.prepare(`
      SELECT COUNT(*) as count FROM vehicles 
      WHERE DATE(check_in_time, 'localtime') = ?
    `).get(today);
    
    const retrievals = db.prepare(`
      SELECT COUNT(*) as count FROM retrieval_requests 
      WHERE DATE(completed_at, 'localtime') = ? AND status = 'completed'
    `).get(today);
    
    const stillParked = db.prepare(`
      SELECT COUNT(*) as count FROM vehicles 
      WHERE status = 'parked'
    `).get();
    
    const cashRevenue = db.prepare(`
      SELECT 
        COALESCE(SUM(amount), 0) as total,
        COALESCE(SUM(tip_amount), 0) as tips,
        COUNT(*) as count
      FROM retrieval_requests 
      WHERE DATE(completed_at, 'localtime') = ? 
        AND status = 'completed'
        AND payment_method IN ('cash', 'pay_at_counter')
        AND payment_processed = 1
    `).get(today);
    
    const cardRevenue = db.prepare(`
      SELECT 
        COALESCE(SUM(amount), 0) as total,
        COALESCE(SUM(tip_amount), 0) as tips,
        COUNT(*) as count
      FROM retrieval_requests 
      WHERE DATE(completed_at, 'localtime') = ? 
        AND status = 'completed'
        AND payment_method = 'online'
        AND payment_processed = 1
    `).get(today);
    
    const totalRevenue = (cashRevenue.total || 0) + (cardRevenue.total || 0);
    const totalTips = (cashRevenue.tips || 0) + (cardRevenue.tips || 0);
    const completionRate = checkIns.count > 0 
      ? Math.round((retrievals.count / checkIns.count) * 100) 
      : 0;
    
    res.json({
      success: true,
      report: {
        date: today,
        totalCheckIns: checkIns.count,
        totalRetrievals: retrievals.count,
        stillParked: stillParked.count,
        cashRevenue: cashRevenue.total,
        cashCount: cashRevenue.count,
        cardRevenue: cardRevenue.total,
        cardCount: cardRevenue.count,
        totalRevenue: totalRevenue,
        totalTips: totalTips,
        completionRate: completionRate
      }
    });
  } catch (error) {
    console.error('Error generating daily report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Close out the day
router.post('/closeout-day', (req, res) => {
  const db = req.app.get('db');
  
  try {
    const today = DateTime.now().setZone('America/New_York').toFormat('yyyy-MM-dd');
    const { closedBy } = req.body;
    
    const existing = db.prepare(`SELECT id FROM daily_closeouts WHERE closeout_date = ?`).get(today);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Day already closed out' });
    }
    
    const checkIns = db.prepare(`SELECT COUNT(*) as count FROM vehicles WHERE DATE(check_in_time, 'localtime') = ?`).get(today);
    const retrievals = db.prepare(`SELECT COUNT(*) as count FROM retrieval_requests WHERE DATE(completed_at, 'localtime') = ? AND status = 'completed'`).get(today);
    const stillParked = db.prepare(`SELECT COUNT(*) as count FROM vehicles WHERE status = 'parked'`).get();
    
    const cashRevenue = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COALESCE(SUM(tip_amount), 0) as tips, COUNT(*) as count
      FROM retrieval_requests 
      WHERE DATE(completed_at, 'localtime') = ? AND status = 'completed'
        AND payment_method IN ('cash', 'pay_at_counter') AND payment_processed = 1
    `).get(today);
    
    const cardRevenue = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COALESCE(SUM(tip_amount), 0) as tips, COUNT(*) as count
      FROM retrieval_requests 
      WHERE DATE(completed_at, 'localtime') = ? AND status = 'completed'
        AND payment_method = 'online' AND payment_processed = 1
    `).get(today);
    
    const totalRevenue = (cashRevenue.total || 0) + (cardRevenue.total || 0);
    const totalTips = (cashRevenue.tips || 0) + (cardRevenue.tips || 0);
    
    db.prepare(`
      INSERT INTO daily_closeouts (
        closeout_date, total_check_ins, total_retrievals, still_parked,
        cash_revenue, cash_count, card_revenue, card_count,
        total_revenue, total_tips, closed_by, closed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(today, checkIns.count, retrievals.count, stillParked.count, cashRevenue.total, cashRevenue.count, cardRevenue.total, cardRevenue.count, totalRevenue, totalTips, closedBy || 'Manager');
    
    res.json({ success: true, message: 'Day closed out successfully' });
  } catch (error) {
    console.error('Error closing out day:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
