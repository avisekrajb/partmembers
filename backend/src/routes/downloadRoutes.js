const express = require('express');
const router = express.Router();
const {
  requestDownload,
  getDownloadRequests,
  approveDownload,
  rejectDownload,
  downloadFile,
  checkDownloadStatus,
  testEmailConfig
} = require('../controllers/downloadController');
const auth = require('../middleware/auth');

// ==================== PUBLIC ROUTES ====================

// User submits a download request
router.post('/request', requestDownload);

// Check download token status
router.get('/status/:token', checkDownloadStatus);

// Download file with token (watermarked Excel)
router.get('/file/:token', downloadFile);

// ==================== ADMIN ROUTES ====================

// Get all download requests (admin only)
router.get('/requests', auth, getDownloadRequests);

// Approve a download request (admin only)
router.post('/approve/:id', auth, approveDownload);

// Reject a download request (admin only)
router.post('/reject/:id', auth, rejectDownload);

// ==================== TEST ROUTES (Development only) ====================

// Test email configuration (admin only)
router.get('/test-email', auth, async (req, res) => {
  try {
    const result = await testEmailConfig();
    res.json(result);
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Test user email (admin only)
router.post('/test-user-email', auth, async (req, res) => {
  try {
    const { email, name, token } = req.body;
    const { sendApprovalEmail } = require('../controllers/downloadController');
    
    const result = await sendApprovalEmail({
      name: name || 'Test User',
      email: email || 'engineerrajbanshi@gmail.com',
      downloadToken: token || 'test-token-123456789'
    });
    
    res.json(result);
  } catch (error) {
    console.error('Test user email error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;
