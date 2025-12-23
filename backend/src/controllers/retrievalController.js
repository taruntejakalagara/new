// Retrieval Controller
const db = require('../models/database');
const { calculateFee, calculateDuration, formatResponse } = require('../utils/helpers');

// Request car retrieval
async function requestCar(req, res) {
    try {
        const { unique_card_id, vehicle_id, request_type, payment_method } = req.body;

        if (!unique_card_id && !vehicle_id) {
            return res.status(400).json(formatResponse(false, null, 'Card ID or vehicle ID required'));
        }

        let vehicle;
        if (unique_card_id) {
            vehicle = await db.get(
                "SELECT * FROM vehicles WHERE unique_card_id = ? AND status = 'parked'",
                [unique_card_id]
            );
        } else {
            vehicle = await db.get(
                "SELECT * FROM vehicles WHERE id = ? AND status = 'parked'",
                [vehicle_id]
            );
        }

        if (!vehicle) {
            return res.status(404).json(formatResponse(false, null, 'Vehicle not found or already requested'));
        }

        const duration = calculateDuration(vehicle.check_in_time);
        const amount = calculateFee(duration);
        const priority = (request_type === 'walk_in' || request_type === 'driver_initiated') ? 1 : 0;

        const result = await db.run(
            `INSERT INTO requests 
             (vehicle_id, request_type, priority, payment_method, payment_status, amount, status)
             VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            [
                vehicle.id,
                request_type || 'nfc_tap',
                priority,
                payment_method || 'pay_at_counter',
                payment_method === 'pay_now' ? 'paid' : 'pending',
                amount
            ]
        );

        await db.run("UPDATE vehicles SET status = 'requested' WHERE id = ?", [vehicle.id]);

        console.log(`✓ Request: Vehicle #${vehicle.sequence_number} (${priority ? 'PRIORITY' : 'STANDARD'})`);

        res.status(201).json(formatResponse(true, {
            request_id: result.id,
            vehicle_id: vehicle.id,
            sequence_number: vehicle.sequence_number,
            hook_number: vehicle.hook_number,
            priority,
            amount,
            duration_minutes: duration
        }, 'Request created'));

    } catch (error) {
        console.error('Request error:', error);
        res.status(500).json(formatResponse(false, null, 'Server error'));
    }
}

// Get queue
async function getQueue(req, res) {
    try {
        const requests = await db.query(
            `SELECT r.*, v.sequence_number, v.hook_number, v.license_plate, d.name as driver_name
             FROM requests r
             JOIN vehicles v ON r.vehicle_id = v.id
             LEFT JOIN drivers d ON r.driver_id = d.id
             WHERE r.status IN ('pending', 'assigned', 'in_transit', 'arrived')
             ORDER BY r.priority DESC, r.requested_at ASC`
        );

        const priority = requests.filter(r => r.priority === 1);
        const standard = requests.filter(r => r.priority === 0);

        res.json(formatResponse(true, {
            total: requests.length,
            priority_count: priority.length,
            standard_count: standard.length,
            priority_queue: priority,
            standard_queue: standard
        }));

    } catch (error) {
        console.error('Queue error:', error);
        res.status(500).json(formatResponse(false, null, 'Server error'));
    }
}

module.exports = {
    requestCar,
    getQueue
};
