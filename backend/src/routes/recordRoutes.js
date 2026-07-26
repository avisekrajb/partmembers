const express = require('express');
const router = express.Router();
const { 
  getRecordsByFileId, 
  getAllRecords, 
  searchRecords,
  updateRecord,
  exportRecords
} = require('../controllers/recordController');
const auth = require('../middleware/auth');

// Public routes (no auth required) - Everyone can view data
router.get('/', getAllRecords);
router.get('/search', searchRecords);
router.get('/export', exportRecords);
router.get('/file/:fileId', getRecordsByFileId);

// Protected routes (admin only) - Only admin can edit/update
router.put('/:id', auth, updateRecord);

module.exports = router;