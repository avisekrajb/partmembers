const multer = require('multer');
const path = require('path');

// Configure multer for memory storage (file size up to 100MB)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];
  
  if (allowedTypes.includes(file.mimetype) || 
      file.originalname.match(/\.(xlsx|xls)$/i)) {
    cb(null, true);
  } else {
    cb(new Error('Only .xlsx and .xls files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

module.exports = upload;