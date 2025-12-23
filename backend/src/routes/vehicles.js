/**
 * Vehicle Routes
 * Handles vehicle check-in, lookup, and status management
 */
const express = require('express');
const router = express.Router();
const { vehicle: vehicleValidators, validateId, validatePagination } = require('../middleware/validation');

/**
 * GET /api/vehicles
 * Get all currently parked vehicles
 */
router.get('/', (req, res) => {
  const db = req.app.get('db');
  try {
    const vehicles = db.prepare(`
      SELECT * FROM vehicles 
      WHERE status = 'parked' 
      ORDER BY check_in_time DESC
    `).all();
    
    res.json({ success: true, vehicles });
  } catch (error) {
    console.error('Error getting vehicles:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/vehicles/card/:cardId
 * Get vehicle by NFC card ID (for customer page)
 */
router.get('/card/:cardId', (req, res) => {
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
    
    // Get pricing from settings
    const baseFeeRow = db.prepare("SELECT value FROM settings WHERE key = 'base_fee'").get();
    const baseFee = baseFeeRow ? parseFloat(baseFeeRow.value) : 15;
    const hourlyRate = 5; // Could also be from settings
    const fee = baseFee + (Math.max(0, hours - 1) * hourlyRate);

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

/**
 * GET /api/vehicles/:id
 * Get vehicle by ID
 */
router.get('/:id', (req, res) => {
  const db = req.app.get('db');
  try {
    const { id } = req.params;
    
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id);

    if (!vehicle) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vehicle not found' 
      });
    }

    res.json({ success: true, vehicle });
  } catch (error) {
    console.error('Error getting vehicle:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/vehicles/checkin
 * Check in a new vehicle
 */
router.post('/checkin', vehicleValidators.checkin, (req, res) => {
  const hookManager = req.app.get('hookManager');
  const db = req.app.get('db');
  
  try {
    const { 
      unique_card_id, 
      license_plate, 
      make, 
      model, 
      color, 
      year, 
      parking_spot, 
      key_slot,
      customer_phone 
    } = req.body;
    
    console.log('✅ Check-in request:', { unique_card_id, license_plate, make, model, key_slot });

    // Check if card is already in use
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

    // Check if hook is already occupied
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

    // Get next sequence number
    const nextSeq = db.prepare("SELECT COALESCE(MAX(sequence_number), 0) + 1 as next FROM vehicles").get().next;

    // Insert vehicle
    const stmt = db.prepare(`
      INSERT INTO vehicles (
        unique_card_id, license_plate, make, model, color, 
        hook_number, sequence_number, customer_phone, status, check_in_time
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'parked', datetime('now'))
    `);
    
    const result = stmt.run(
      unique_card_id, 
      license_plate, 
      make || 'Unknown', 
      model || 'Unknown', 
      color || 'Unknown', 
      key_slot, 
      nextSeq,
      customer_phone || null
    );
    
    const vehicleId = result.lastInsertRowid;
    
    // Assign the hook as occupied
    if (key_slot && hookManager) {
      hookManager.assignHook(key_slot, unique_card_id);
      console.log(`✅ Hook ${key_slot} assigned to vehicle ${vehicleId}`);
    }
    
    console.log('✅ Vehicle checked in successfully:', vehicleId);

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('vehicleCheckedIn', {
        id: vehicleId,
        unique_card_id,
        license_plate,
        hook_number: key_slot
      });
    }

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
        sequence_number: nextSeq,
        status: 'parked'
      }
    });
  } catch (error) {
    console.error('❌ Error checking in vehicle:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/vehicles/:id
 * Update vehicle information
 */
router.put('/:id', (req, res) => {
  const db = req.app.get('db');
  try {
    const { id } = req.params;
    const { license_plate, make, model, color, customer_phone } = req.body;
    
    const result = db.prepare(`
      UPDATE vehicles 
      SET license_plate = COALESCE(?, license_plate),
          make = COALESCE(?, make),
          model = COALESCE(?, model),
          color = COALESCE(?, color),
          customer_phone = COALESCE(?, customer_phone)
      WHERE id = ?
    `).run(license_plate, make, model, color, customer_phone, id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    res.json({ success: true, message: 'Vehicle updated successfully' });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/vehicles/history
 * Get vehicle history (retrieved vehicles)
 */
router.get('/history', (req, res) => {
  const db = req.app.get('db');
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const vehicles = db.prepare(`
      SELECT * FROM vehicles 
      WHERE status = 'retrieved' 
      ORDER BY check_out_time DESC
      LIMIT ? OFFSET ?
    `).all(parseInt(limit), parseInt(offset));
    
    const total = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'retrieved'").get();
    
    res.json({ 
      success: true, 
      vehicles,
      total: total.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error getting vehicle history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
