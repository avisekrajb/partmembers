const mongoose = require('mongoose');

const voterRecordSchema = new mongoose.Schema({
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: true
  },
  sn: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    default: ''
  },
  province: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  district: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  municipality: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  ward: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  voterNumber: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  citizenshipNumber: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  citizenshipIssueDetails: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  fatherMotherName: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  spouseName: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  // Additional metadata
  rawData: {
    type: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
voterRecordSchema.index({ fileId: 1, sn: 1 });
voterRecordSchema.index({ name: 1 });
voterRecordSchema.index({ voterNumber: 1 });
voterRecordSchema.index({ district: 1 });

module.exports = mongoose.model('VoterRecord', voterRecordSchema);