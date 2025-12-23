router.post('/login', (req, res) => {
  const db = req.app.get('db');
  const { username, password } = req.body;

  console.log('=== LOGIN ATTEMPT ===');
  console.log('Username:', username);
  console.log('Password:', password);

  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username and password are required' 
    });
  }

  try {
    const hashedPassword = hashPassword(password);
    console.log('Hashed password:', hashedPassword);
    
    // First check if driver exists at all
    const driverCheck = db.prepare(`SELECT * FROM drivers WHERE username = ?`).get(username);
    console.log('Driver found:', driverCheck);
    
    const driver = db.prepare(`
      SELECT id, fullName, username, phone, email, status, licenseNumber, vehicleInfo
      FROM drivers 
      WHERE username = ? AND password = ?
    `).get(username, hashedPassword);

    console.log('Driver after password check:', driver);

    if (!driver) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    if (driver.status !== 'active') {
      return res.status(403).json({ 
        success: false, 
        message: 'Your account is inactive. Please contact the station manager.' 
      });
    }

    // Update last login
    db.prepare('UPDATE drivers SET last_login = ? WHERE id = ?')
      .run(new Date().toISOString(), driver.id);

    res.json({
      success: true,
      message: 'Login successful',
      driver
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});
