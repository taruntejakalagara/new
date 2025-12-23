// Check-in Controller
const db = require('../models/database');
const { generateCardId, generateQR, calculateFee, calculateDuration, formatResponse } = require('../utils/helpers');

// Check in a vehicle
async function checkinVehicle(req, res) {
    try {
        const { license_plate, make, model, color, customer_phone } = req.body;

        if (!license_plate) {
            return res.status(400).json(formatResponse(false, null, 'License plate required'));
        }

        // Check if already parked
        const existing = await db.get(
            "SELECT * FROM vehicles WHERE license_plate = ? AND status = 'parked'",
            [license_plate.toUpperCase()]
        );

        if (existing) {
            return res.status(400).json(formatResponse(false, null, 'Vehicle already parked'));
        }

        const cardId = generateCardId();
        const sequence = await db.getNextSequence();
        const hook = sequence;

        const result = await db.run(
            `INSERT INTO vehicles 
             (unique_card_id, sequence_number, license_plate, make, model, color, customer_phone, hook_number, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'parked')`,
            [cardId, sequence, license_plate.toUpperCase(), make, model, color, customer_phone, hook]
        );

        const qrCode = await generateQR(cardId);

        console.log(`✓ Checked in: ${license_plate} (Seq #${sequence})`);

        res.status(201).json(formatResponse(true, {
            vehicle_id: result.id,
            unique_card_id: cardId,
            sequence_number: sequence,
            hook_number: hook,
            license_plate: license_plate.toUpperCase(),
            qr_code: qrCode,
            access_url: `${process.env.CUSTOMER_WEB_URL}/vehicle/${cardId}`
        }, 'Vehicle checked in'));

    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json(formatResponse(false, null, 'Server error'));
    }
}

// Get vehicle by card ID
async function getVehicle(req, res) {
    try {
        const { cardId } = req.params;

        const vehicle = await db.get(
            'SELECT * FROM vehicles WHERE unique_card_id = ?',
            [cardId]
        );

        if (!vehicle) {
            return res.status(404).json(formatResponse(false, null, 'Vehicle not found'));
        }

        if (vehicle.status !== 'completed') {
            vehicle.duration_minutes = calculateDuration(vehicle.check_in_time);
            vehicle.current_fee = calculateFee(vehicle.duration_minutes);
        }

        res.json(formatResponse(true, vehicle));

    } catch (error) {
        console.error('Get vehicle error:', error);
        res.status(500).json(formatResponse(false, null, 'Server error'));
    }
}

// Get all vehicles
async function getAllVehicles(req, res) {
    try {
        const vehicles = await db.query(
            "SELECT * FROM vehicles WHERE status IN ('parked', 'requested', 'in_transit', 'arrived') ORDER BY sequence_number DESC"
        );

        res.json(formatResponse(true, { count: vehicles.length, vehicles }));

    } catch (error) {
        console.error('Get vehicles error:', error);
        res.status(500).json(formatResponse(false, null, 'Server error'));
    }
}

module.exports = {
    checkinVehicle,
    getVehicle,
    getAllVehicles
};
