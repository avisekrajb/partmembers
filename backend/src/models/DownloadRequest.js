const mongoose = require('mongoose');

const downloadRequestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'downloaded'],
    default: 'pending'
  },
  downloadToken: {
    type: String,
    unique: true,
    sparse: true
  },
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  approvedDate: {
    type: Date
  },
  downloadedDate: {
    type: Date
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
});

module.exports = mongoose.model('DownloadRequest', downloadRequestSchema);
