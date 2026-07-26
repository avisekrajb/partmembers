const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Create initial admin if none exists
const createInitialAdmin = async () => {
  try {
    const adminExists = await User.findOne({ email: 'a@gmail.com' });
    if (!adminExists) {
      const admin = new User({
        email: 'a@gmail.com',
        password: '123456',
        role: 'admin'
      });
      await admin.save();
      console.log('✅ Initial admin created');
    } else {
      console.log('✅ Admin user already exists');
    }
  } catch (error) {
    console.error('Error creating admin:', error);
  }
};

// Login controller
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token with proper secret
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'your_super_secret_jwt_key_here',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
};

// Verify token controller
const verifyToken = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Token verification failed' });
  }
};

module.exports = {
  login,
  verifyToken,
  createInitialAdmin
};