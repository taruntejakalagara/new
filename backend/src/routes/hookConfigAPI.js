// Hook Configuration and Assignment API
// Add these endpoints to your backend

const express = require('express');
const router = express.Router();

// ============================================
// SYSTEM CONFIGURATION
// ============================================

// Set Hook Limit (Station Manager/iPad)
router.post('/system/config/hooks', async (req, res) => {
  try {
    const { max_hooks, location_name } = req.body;

    if (!max_hooks || max_hooks < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid hook limit. Must be at least 1.' 
      });
    }

    // Check if configuration exists
    const existing = await db.get(
      "SELECT * FROM system_settings WHERE setting_key = 'max_hooks'"
    );

    if (existing) {
      // Update existing
      await db.run(
        "UPDATE system_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = 'max_hooks'",
        [max_hooks.toString()]
      );
    } else {
      // Insert new
      await db.run(
        "INSERT INTO system_settings (setting_key, setting_value) VALUES ('max_hooks', ?)",
        [max_hooks.toString()]
      );
    }

    // Store location name if provided
    if (location_name) {
      const locationExists = await db.get(
        "SELECT * FROM system_settings WHERE setting_key = 'location_name'"
      );

      if (locationExists) {
        await db.run(
          "UPDATE system_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = 'location_name'",
          [location_name]
        );
      } else {
        await db.run(
          "INSERT INTO system_settings (setting_key, setting_value) VALUES ('location_name', ?)",
          [location_name]
        );
      }
    }

    res.json({
      success: true,
      message: `Hook limit set to ${max_hooks}`,
      config: {
        max_hooks,
        location_name
      }
    });

  } catch (error) {
    console.error('Error setting hook config:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error setting hook configuration' 
    });
  }
});

// Get System Configuration
router.get('/system/config', async (req, res) => {
  try {
    const maxHooks = await db.get(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'max_hooks'"
    );

    const locationName = await db.get(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'location_name'"
    );

    const currentSequence = await db.get(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'current_sequence_number'"
    );

    // Get count of currently used hooks
    const usedHooks = await db.get(
      "SELECT COUNT(*) as count FROM vehicles WHERE status IN ('parked', 'requested', 'in_transit', 'arrived')"
    );

    res.json({
      success: true,
      config: {
        max_hooks: parseInt(maxHooks?.setting_value || 100),
        location_name: locationName?.setting_value || 'Valet Station',
        current_sequence: parseInt(currentSequence?.setting_value || 0),
        used_hooks: usedHooks.count || 0,
        available_hooks: parseInt(maxHooks?.setting_value || 100) - (usedHooks.count || 0)
      }
    });

  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching configuration' 
    });
  }
});

// Get Next Available Hook
router.get('/system/next-hook', async (req, res) => {
  try {
    // Get max hooks limit
    const maxHooksSetting = await db.get(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'max_hooks'"
    );
    const maxHooks = parseInt(maxHooksSetting?.setting_value || 100);

    // Get current sequence
    const sequenceSetting = await db.get(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'current_sequence_number'"
    );
    const currentSequence = parseInt(sequenceSetting?.setting_value || 0);
    
    // Calculate next sequence
    let nextSequence = currentSequence + 1;

    // Check if we need to wrap around based on max hooks
    if (nextSequence > maxHooks) {
      // Find first available hook number
      const usedHooks = await db.all(
        `SELECT hook_number FROM vehicles 
         WHERE status IN ('parked', 'requested', 'in_transit', 'arrived') 
         ORDER BY hook_number`
      );

      const usedHookNumbers = usedHooks.map(v => v.hook_number);
      
      // Find first gap in sequence
      nextSequence = 1;
      while (usedHookNumbers.includes(nextSequence) && nextSequence <= maxHooks) {
        nextSequence++;
      }

      if (nextSequence > maxHooks) {
        return res.status(400).json({
          success: false,
          message: `All ${maxHooks} hooks are currently in use. Please wait for a vehicle to be retrieved.`,
          used_hooks: usedHookNumbers.length,
          max_hooks: maxHooks
        });
      }
    }

    // Hook number matches sequence number
    const hookNumber = nextSequence;

    // Update sequence in database
    if (sequenceSetting) {
      await db.run(
        "UPDATE system_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = 'current_sequence_number'",
        [nextSequence.toString()]
      );
    } else {
      await db.run(
        "INSERT INTO system_settings (setting_key, setting_value) VALUES ('current_sequence_number', ?)",
        [nextSequence.toString()]
      );
    }

    res.json({
      success: true,
      sequence_number: nextSequence,
      hook_number: hookNumber,
      max_hooks: maxHooks,
      message: `Assigned Hook #${hookNumber} for Vehicle #${nextSequence}`
    });

  } catch (error) {
    console.error('Error getting next hook:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error assigning hook number' 
    });
  }
});

// Reset Sequence (Station Manager only - use with caution)
router.post('/system/reset-sequence', async (req, res) => {
  try {
    const { confirm } = req.body;

    if (confirm !== 'RESET') {
      return res.status(400).json({
        success: false,
        message: 'Confirmation required. Send {"confirm": "RESET"}'
      });
    }

    // Check if there are active vehicles
    const activeVehicles = await db.get(
      "SELECT COUNT(*) as count FROM vehicles WHERE status IN ('parked', 'requested', 'in_transit', 'arrived')"
    );

    if (activeVehicles.count > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot reset sequence. There are ${activeVehicles.count} active vehicles. Complete all retrievals first.`
      });
    }

    // Reset sequence to 0
    await db.run(
      "UPDATE system_settings SET setting_value = '0', updated_at = CURRENT_TIMESTAMP WHERE setting_key = 'current_sequence_number'"
    );

    res.json({
      success: true,
      message: 'Sequence reset to 0. Next vehicle will be #1'
    });

  } catch (error) {
    console.error('Error resetting sequence:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error resetting sequence' 
    });
  }
});

// Get Hook Utilization (for dashboard)
router.get('/system/hook-utilization', async (req, res) => {
  try {
    const maxHooksSetting = await db.get(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'max_hooks'"
    );
    const maxHooks = parseInt(maxHooksSetting?.setting_value || 100);

    // Get all currently used hooks
    const usedHooks = await db.all(
      `SELECT hook_number, sequence_number, license_plate, status 
       FROM vehicles 
       WHERE status IN ('parked', 'requested', 'in_transit', 'arrived') 
       ORDER BY hook_number`
    );

    const utilizationPercent = Math.round((usedHooks.length / maxHooks) * 100);

    res.json({
      success: true,
      max_hooks: maxHooks,
      used_hooks: usedHooks.length,
      available_hooks: maxHooks - usedHooks.length,
      utilization_percent: utilizationPercent,
      hook_details: usedHooks
    });

  } catch (error) {
    console.error('Error getting hook utilization:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching hook utilization' 
    });
  }
});

module.exports = router;
