const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const fileRoutes = require('./routes/fileRoutes');
const recordRoutes = require('./routes/recordRoutes');
const downloadRoutes = require('./routes/downloadRoutes');
const { createInitialAdmin } = require('./controllers/authController');

const app = express();

// CORS configuration
const corsOptions = {
  origin: [
    'https://partymembersall.onrender.com',
    'https://partymembersbackendnew.onrender.com',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  contentSecurityPolicy: false // Disable CSP for file downloads
}));

// Body parser middleware
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/downloads', downloadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Party Members Backend API',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/login',
      files: '/api/files',
      records: '/api/records',
      downloads: '/api/downloads'
    },
    docs: 'https://github.com/yourusername/voter-management-app'
  });
});

// =============================================
// TEST EMAIL ENDPOINT - Remove after testing
// =============================================
app.get('/api/test-email', async (req, res) => {
  try {
    // Import nodemailer here or use the one from downloadController
    const nodemailer = require('nodemailer');
    
    // Create transporter (same as in downloadController)
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    console.log('📧 Testing email...');
    console.log('From:', process.env.EMAIL_USER);
    console.log('To:', process.env.ADMIN_EMAIL || 'your-test-email@gmail.com');
    
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL || 'your-test-email@gmail.com',
      subject: '✅ Render Email Test - ' + new Date().toISOString(),
      html: `
        <h2>Email is Working!</h2>
        <p>This test email was sent from your Render deployment.</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>Service:</strong> partymembersbackendnew</p>
        <p><strong>Transporter:</strong> ${process.env.EMAIL_SERVICE || 'Gmail'}</p>
        <p><strong>Email User:</strong> ${process.env.EMAIL_USER}</p>
        <hr>
        <p>If you received this, your email configuration is working correctly!</p>
        <p><em>Zero Infinity - Party Members</em></p>
      `
    });
    
    console.log('✅ Email sent! MessageID:', info.messageId);
    
    res.json({ 
      success: true, 
      message: 'Test email sent successfully!',
      messageId: info.messageId,
      accepted: info.accepted,
      to: process.env.ADMIN_EMAIL || 'your-test-email@gmail.com',
      from: process.env.EMAIL_USER
    });
  } catch (error) {
    console.error('❌ Email test failed:', error);
    console.error('Error details:', {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode
    });
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      code: error.code,
      details: error.response || 'No additional details',
      hint: 'Check if EMAIL_USER and EMAIL_PASSWORD are set correctly in Render Environment Variables'
    });
  }
});

// =============================================
// TEST EMAIL WITH SENDGRID (Alternative)
// =============================================
app.get('/api/test-sendgrid', async (req, res) => {
  try {
    const nodemailer = require('nodemailer');
    
    // Use SendGrid configuration
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.sendgrid.net',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER || 'apikey',
        pass: process.env.EMAIL_PASSWORD
      }
    });

    console.log('📧 Testing SendGrid email...');
    
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL || 'your-test-email@gmail.com',
      subject: '✅ SendGrid Test - ' + new Date().toISOString(),
      html: `
        <h2>SendGrid is Working!</h2>
        <p>This test email was sent from your Render deployment using SendGrid.</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>Service:</strong> partymembersbackendnew</p>
        <hr>
        <p>If you received this, your SendGrid configuration is working!</p>
      `
    });
    
    console.log('✅ SendGrid email sent! MessageID:', info.messageId);
    
    res.json({ 
      success: true, 
      message: 'SendGrid test email sent successfully!',
      messageId: info.messageId
    });
  } catch (error) {
    console.error('❌ SendGrid test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      hint: 'Make sure EMAIL_HOST, EMAIL_PORT, EMAIL_USER, and EMAIL_PASSWORD are set correctly'
    });
  }
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      message: 'Invalid ID format',
      field: err.path
    });
  }
  
  if (err.code === 11000) {
    return res.status(409).json({
      message: 'Duplicate entry',
      field: Object.keys(err.keyPattern)[0]
    });
  }
  
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('✅ Connected to MongoDB Atlas');
  
  // Create initial admin user
  await createInitialAdmin();
  
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 API URL: http://localhost:${PORT}/api`);
    console.log(`🌐 CORS enabled for: ${corsOptions.origin.join(', ')}`);
    console.log(`📧 Email notifications: ${process.env.EMAIL_USER ? 'Enabled' : 'Disabled'}`);
    console.log(`📧 Email service: ${process.env.EMAIL_SERVICE || 'Gmail'}`);
    console.log(`📧 Test email endpoint: /api/test-email`);
  });
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Closing server...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});

module.exports = app;
