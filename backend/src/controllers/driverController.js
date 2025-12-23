// Driver Controller
const db = require('../models/database');
const { formatResponse, calculateDuration } = require('../utils/helpers');

// Get all drivers
async function getDrivers(req, res) {
    try {
        const drivers = await db.query('SELECT * FROM drivers ORDER BY name');
        res.json(formatResponse(true, { count: drivers.length, drivers }));
    } catch (error) {
        console.error('Get drivers error:', error);
        res.status(500).json(formatResponse(false, null, 'Server error'));
    }
}

// Update driver status
async function updateDriverStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;

        await db.run('UPDATE drivers SET status = ? WHERE id = ?', [status, id]);
        
        console.log(`✓ Driver #${id} → ${status}`);
        res.json(formatResponse(true, { driver_id: id, status }));

    } catch (error) {
        console.error('Update driver error:', error);
        res.status(500).json(formatResponse(false, null, 'Server error'));
    }
}

// Accept request
async function acceptRequest(req, res) {
    try {
        const { driverId, requestId } = req.params;

        await db.run(
            "UPDATE requests SET driver_id = ?, status = 'assigned', assigned_at = CURRENT_TIMESTAMP WHERE id = ?",
            [driverId, requestId]
        );

        const request = await db.get(
            `SELECT r.*, v.sequence_number, v.hook_number 
             FROM requests r 
             JOIN vehicles v ON r.vehicle_id = v.id 
             WHERE r.id = ?`,
            [requestId]
        );

        console.log(`✓ Driver #${driverId} accepted Request #${requestId}`);

        res.json(formatResponse(true, request));

    } catch (error) {
        console.error('Accept request error:', error);
        res.status(500).json(formatResponse(false, null, 'Server error'));
    }
}

// Update request status
async function updateRequestStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (status === 'completed') {
            const request = await db.get('SELECT * FROM requests WHERE id = ?', [id]);
            const vehicle = await db.get('SELECT * FROM vehicles WHERE id = ?', [request.vehicle_id]);
            const duration = calculateDuration(vehicle.check_in_time);

            await db.run(
                "UPDATE requests SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?",
                [status, id]
            );

            await db.run(
                "UPDATE vehicles SET status = 'completed', check_out_time = CURRENT_TIMESTAMP WHERE id = ?",
                [request.vehicle_id]
            );

            await db.run(
                "INSERT INTO transactions (vehicle_id, driver_id, amount, payment_method, duration_minutes) VALUES (?, ?, ?, ?, ?)",
                [request.vehicle_id, request.driver_id, request.amount, request.payment_method, duration]
            );

            console.log(`✓ Completed: Vehicle #${vehicle.sequence_number}, ${duration} min, $${request.amount}`);

        } else {
            await db.run("UPDATE requests SET status = ? WHERE id = ?", [status, id]);
            await db.run("UPDATE vehicles SET status = ? WHERE id IN (SELECT vehicle_id FROM requests WHERE id = ?)", [status, id]);
        }

        res.json(formatResponse(true, { request_id: id, status }));

    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json(formatResponse(false, null, 'Server error'));
    }
}

module.exports = {
    getDrivers,
    updateDriverStatus,
    acceptRequest,
    updateRequestStatus
};
