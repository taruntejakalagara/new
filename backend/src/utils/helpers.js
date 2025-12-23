// Utility Functions
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

function generateCardId() {
    return uuidv4();
}

function calculateFee(minutes) {
    const baseRate = 15.0;
    const hourlyRate = 5.0;
    const dailyMax = 40.0;
    
    if (minutes <= 180) return baseRate;
    
    const additionalHours = Math.ceil((minutes - 180) / 60);
    const total = baseRate + (additionalHours * hourlyRate);
    
    return Math.min(total, dailyMax);
}

function calculateDuration(checkInTime) {
    const checkIn = new Date(checkInTime);
    const now = new Date();
    return Math.floor((now - checkIn) / 60000);
}

async function generateQR(cardId, baseUrl = 'http://localhost:5173') {
    try {
        const url = `${baseUrl}/vehicle/${cardId}`;
        return await QRCode.toDataURL(url, { width: 300 });
    } catch (error) {
        console.error('QR generation error:', error);
        return null;
    }
}

function formatResponse(success, data = null, message = null) {
    return {
        success,
        data,
        message,
        timestamp: new Date().toISOString()
    };
}

module.exports = {
    generateCardId,
    calculateFee,
    calculateDuration,
    generateQR,
    formatResponse
};
