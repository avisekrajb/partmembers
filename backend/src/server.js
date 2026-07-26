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
