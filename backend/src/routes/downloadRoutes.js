const express = require('express');
const router = express.Router();
const {
  requestDownload,
  getDownloadRequests,
  approveDownload,
  rejectDownload,
  downloadFile,
  checkDownloadStatus
} = require('../controllers/downloadController');
const auth = require('../middleware/auth');

// Public routes
router.post('/request', requestDownload);
router.get('/status/:token', checkDownloadStatus);
router.get('/file/:token', downloadFile);

// Admin routes
router.get('/requests', auth, getDownloadRequests);
router.post('/approve/:id', auth, approveDownload);
router.post('/reject/:id', auth, rejectDownload);

module.exports = router;
