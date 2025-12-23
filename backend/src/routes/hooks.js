const express = require('express');
const router = express.Router();

router.get('/next', (req, res) => {
  const hookManager = req.app.get('hookManager');
  try {
    const nextHook = hookManager.getNextAvailableHook();
    if (!nextHook) {
      return res.status(404).json({ success: false, message: 'No hooks available' });
    }
    res.json({ success: true, hookNumber: nextHook });
  } catch (error) {
    console.error('Get next hook error:', error);
    res.status(500).json({ success: false, message: 'Failed to get next hook' });
  }
});

router.get('/status', (req, res) => {
  const hookManager = req.app.get('hookManager');
  try {
    const hooks = hookManager.getHookStatus();
    const available = hookManager.getAvailableHooksCount();
    res.json({ success: true, hooks, available, total: 50 });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get hooks status' });
  }
});

router.post('/assign', (req, res) => {
  const hookManager = req.app.get('hookManager');
  const { hookNumber, vehicleId } = req.body;
  if (!hookNumber || !vehicleId) {
    return res.status(400).json({ success: false, message: 'Hook number and vehicle ID required' });
  }
  try {
    const result = hookManager.assignHook(hookNumber, vehicleId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to assign hook' });
  }
});

router.post('/release/:hookNumber', (req, res) => {
  const hookManager = req.app.get('hookManager');
  try {
    const result = hookManager.releaseHook(parseInt(req.params.hookNumber));
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to release hook' });
  }
});

module.exports = router;
