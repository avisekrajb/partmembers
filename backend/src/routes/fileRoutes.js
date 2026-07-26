const express = require('express');
const router = express.Router();
const { uploadFiles, getAllFiles, deleteFile } = require('../controllers/fileController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public route - Anyone can view files
router.get('/', getAllFiles);

// Protected routes - Only admin can upload and delete
router.post('/upload', auth, upload.array('files', 20), uploadFiles);
router.delete('/:id', auth, deleteFile);

module.exports = router;