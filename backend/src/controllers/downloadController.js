const DownloadRequest = require('../models/DownloadRequest');
const VoterRecord = require('../models/VoterRecord');
const File = require('../models/File');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const XLSX = require('xlsx');

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// ==================== PUBLIC ROUTES ====================

// Request download - User submits request
const requestDownload = async (req, res) => {
  try {
    const { name, email, phone, fileId } = req.body;
    
    // Validate input
    if (!name || !email || !phone) {
      return res.status(400).json({ 
        message: 'Name, email and phone are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Please enter a valid email address' 
      });
    }

    // Validate phone (minimum 10 digits)
    const phoneClean = phone.replace(/\s/g, '');
    if (phoneClean.length < 10) {
      return res.status(400).json({ 
        message: 'Please enter a valid phone number (minimum 10 digits)' 
      });
    }

    // Check if user already has a pending or approved request
    const existingRequest = await DownloadRequest.findOne({
      email: email.toLowerCase(),
      status: { $in: ['pending', 'approved'] }
    });

    if (existingRequest) {
      return res.status(400).json({ 
        message: 'You already have a pending or approved download request. Please wait for approval.' 
      });
    }

    // Create download token
    const downloadToken = crypto.randomBytes(32).toString('hex');

    const downloadRequest = new DownloadRequest({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      fileId: fileId || null,
      downloadToken,
      ipAddress: req.ip || req.connection?.remoteAddress || 'Unknown',
      userAgent: req.headers['user-agent'] || 'Unknown'
    });

    await downloadRequest.save();

    // Send email to admin (don't await - let it run in background)
    sendAdminNotification(downloadRequest).catch(err => {
      console.error('Admin notification error:', err);
    });

    res.status(201).json({
      message: 'Download request submitted successfully. You will receive an email once approved.',
      requestId: downloadRequest._id,
      downloadToken: downloadToken
    });

  } catch (error) {
    console.error('Request download error:', error);
    res.status(500).json({ 
      message: 'Failed to submit download request. Please try again.' 
    });
  }
};

// Check download status - User checks token status
const checkDownloadStatus = async (req, res) => {
  try {
    const { token } = req.params;
    
    const request = await DownloadRequest.findOne({ downloadToken: token });
    
    if (!request) {
      return res.status(404).json({ 
        valid: false,
        message: 'Invalid download token' 
      });
    }

    res.json({
      valid: true,
      status: request.status,
      approved: request.status === 'approved',
      name: request.name,
      email: request.email,
      requestDate: request.requestDate,
      approvedDate: request.approvedDate
    });

  } catch (error) {
    console.error('Check download status error:', error);
    res.status(500).json({ 
      message: 'Failed to check download status' 
    });
  }
};

// Download file - User downloads with token
const downloadFile = async (req, res) => {
  try {
    const { token } = req.params;
    
    const request = await DownloadRequest.findOne({ 
      downloadToken: token,
      status: 'approved'
    });

    if (!request) {
      return res.status(404).json({ 
        message: 'Invalid or expired download token. Please request a new download.' 
      });
    }

    // Get records
    let records;
    if (request.fileId) {
      const fileData = await VoterRecord.find({ fileId: request.fileId })
        .sort({ sn: 1 })
        .lean();
      records = fileData;
    } else {
      const allRecords = await VoterRecord.find()
        .sort({ sn: 1 })
        .lean();
      records = allRecords;
    }

    if (!records || records.length === 0) {
      return res.status(404).json({ message: 'No records found to download' });
    }

    // Create watermarked Excel file
    const workbook = XLSX.utils.book_new();
    
    // Format data with watermark
    const exportData = records.map(record => ({
      'SN': record.sn,
      'नाम, थर': record.name || '',
      'प्रदेश': record.province || '',
      'जिल्ला': record.district || '',
      'गाउँपालिका/नगरपालिका': record.municipality || '',
      'वडा नं.': record.ward || '',
      'मतदाता नम्बर': record.voterNumber || '',
      'नागरिकता नम्बर': record.citizenshipNumber || '',
      'नागरिकता जारी भएको मिति र जिल्ला': record.citizenshipIssueDetails || '',
      'बाबु/आमाको नाम': record.fatherMotherName || '',
      'पति/पत्नीको नाम': record.spouseName || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);

    // Add watermark comments to each cell
    const range = XLSX.utils.decode_range(ws['!ref']);
    const watermarkText = '🔒 WATERMARKED - Zero Infinity 🔒';

    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellAddress]) continue;
        ws[cellAddress].c = [{ 
          t: watermarkText,
          a: 'Zero Infinity System'
        }];
      }
    }

    // Add watermark as hidden text in header
    ws['!cols'] = [
      { wch: 8 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, 
      { wch: 25 }, { wch: 12 }, { wch: 18 }, { wch: 18 },
      { wch: 30 }, { wch: 20 }, { wch: 20 }
    ];

    XLSX.utils.book_append_sheet(workbook, ws, 'Voter Records');

    // Add a watermark sheet with Zero Infinity branding
    const watermarkSheet = XLSX.utils.aoa_to_sheet([
      ['🔒 ZERO INFINITY WATERMARK 🔒'],
      [''],
      ['This document is watermarked and protected by Zero Infinity'],
      ['Unauthorized distribution is strictly prohibited'],
      [''],
      ['Downloaded by: ' + request.name],
      ['Email: ' + request.email],
      ['Phone: ' + request.phone],
      ['Date: ' + new Date().toISOString()],
      [''],
      ['🔒 DO NOT SHARE - CONFIDENTIAL 🔒'],
      [''],
      ['Zero Infinity Watermark v1.0'],
      ['Protected Document - All Rights Reserved'],
      [''],
      ['Watermark ID: ' + request.downloadToken.substring(0, 16)],
      ['Request ID: ' + request._id]
    ]);
    XLSX.utils.book_append_sheet(workbook, watermarkSheet, 'Zero Infinity Watermark');

    // Update request status
    request.status = 'downloaded';
    request.downloadedDate = new Date();
    await request.save();

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Send file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=voter_records_watermarked_${Date.now()}.xlsx`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      message: 'Failed to download file. Please try again.' 
    });
  }
};

// ==================== ADMIN ROUTES ====================

// Admin: Get all download requests
const getDownloadRequests = async (req, res) => {
  try {
    const requests = await DownloadRequest.find()
      .sort({ requestDate: -1 })
      .populate('fileId', 'name rowCount');
    
    res.json(requests);
  } catch (error) {
    console.error('Get download requests error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch download requests' 
    });
  }
};

// Admin: Approve download request
const approveDownload = async (req, res) => {
  try {
    const { id } = req.params;
    
    const request = await DownloadRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Download request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ 
        message: 'Request is already processed. Current status: ' + request.status 
      });
    }

    request.status = 'approved';
    request.approvedDate = new Date();
    await request.save();

    // Send approval email to user (don't await - run in background)
    sendApprovalEmail(request).catch(err => {
      console.error('Approval email error:', err);
    });

    res.json({
      message: 'Download request approved. User has been notified.',
      downloadToken: request.downloadToken,
      request: request
    });

  } catch (error) {
    console.error('Approve download error:', error);
    res.status(500).json({ 
      message: 'Failed to approve download request' 
    });
  }
};

// Admin: Reject download request
const rejectDownload = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const request = await DownloadRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Download request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ 
        message: 'Request is already processed. Current status: ' + request.status 
      });
    }

    request.status = 'rejected';
    await request.save();

    // Send rejection email to user (don't await - run in background)
    sendRejectionEmail(request, reason).catch(err => {
      console.error('Rejection email error:', err);
    });

    res.json({ 
      message: 'Download request rejected. User has been notified.' 
    });

  } catch (error) {
    console.error('Reject download error:', error);
    res.status(500).json({ 
      message: 'Failed to reject download request' 
    });
  }
};

// ==================== EMAIL HELPERS ====================

// Send admin notification
const sendAdminNotification = async (request) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'a@gmail.com';
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: adminEmail,
      subject: '📥 New Download Request - Zero Infinity',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E63946;">New Download Request</h2>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
            <p><strong>Name:</strong> ${request.name}</p>
            <p><strong>Email:</strong> ${request.email}</p>
            <p><strong>Phone:</strong> ${request.phone}</p>
            <p><strong>Request ID:</strong> ${request._id}</p>
            <p><strong>Date:</strong> ${new Date(request.requestDate).toLocaleString()}</p>
            <p><strong>IP Address:</strong> ${request.ipAddress}</p>
            <p><strong>User Agent:</strong> ${request.userAgent}</p>
          </div>
          <div style="margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL || 'https://partymembersall.onrender.com'}/admin/downloads" 
               style="background: #E63946; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              View All Requests
            </a>
          </div>
          <hr style="margin: 20px 0;">
          <p style="color: #6c757d; font-size: 12px;">
            <em>This is an automated message from Zero Infinity - Party Members</em>
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Admin notification sent');
  } catch (error) {
    console.error('Admin notification error:', error);
  }
};

// Send approval email to user
const sendApprovalEmail = async (request) => {
  try {
    const downloadUrl = `${process.env.FRONTEND_URL || 'https://partymembersall.onrender.com'}/download/${request.downloadToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: request.email,
      subject: '✅ Download Request Approved - Zero Infinity',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #22C55E;">Your Download Request Has Been Approved</h2>
          <p>Dear <strong>${request.name}</strong>,</p>
          <p>Your request to download voter records has been approved by the administrator.</p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
            <h3>Download Link</h3>
            <a href="${downloadUrl}" 
               style="background: #22C55E; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 16px; font-weight: bold;">
              Click here to download
            </a>
            <p style="font-size: 12px; color: #6c757d; margin-top: 8px;">
              Link expires after one download
            </p>
          </div>
          <div style="margin-top: 20px; background: #FEF3C7; padding: 16px; border-radius: 8px;">
            <h4 style="color: #92400E;">⚠️ Important:</h4>
            <ul style="color: #92400E;">
              <li>This link is valid for <strong>one-time use</strong> only</li>
              <li>The file contains a <strong>Zero Infinity watermark</strong> - DO NOT SHARE</li>
              <li>Keep the data <strong>safe and confidential</strong></li>
              <li>Unauthorized distribution is <strong>prohibited</strong></li>
            </ul>
          </div>
          <p style="margin-top: 16px;">🔒 The file is protected with <strong>Zero Infinity Watermark v1.0</strong></p>
          <hr style="margin: 20px 0;">
          <p style="color: #6c757d; font-size: 12px;">
            <em>If you did not request this download, please ignore this email.</em><br>
            <em>This is an automated message from Zero Infinity - Party Members</em>
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Approval email sent to', request.email);
  } catch (error) {
    console.error('Approval email error:', error);
  }
};

// Send rejection email to user
const sendRejectionEmail = async (request, reason) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: request.email,
      subject: '❌ Download Request Rejected - Zero Infinity',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #DC2626;">Download Request Rejected</h2>
          <p>Dear <strong>${request.name}</strong>,</p>
          <p>Your request to download voter records has been rejected by the administrator.</p>
          ${reason ? `
            <div style="background: #FEE2E2; padding: 16px; border-radius: 8px;">
              <h4 style="color: #991B1B;">Reason for rejection:</h4>
              <p style="color: #991B1B;">${reason}</p>
            </div>
          ` : ''}
          <p>If you believe this is a mistake, please contact the administrator.</p>
          <div style="margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL || 'https://partymembersall.onrender.com'}/request-download" 
               style="background: #E63946; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Request Again
            </a>
          </div>
          <hr style="margin: 20px 0;">
          <p style="color: #6c757d; font-size: 12px;">
            <em>This is an automated message from Zero Infinity - Party Members</em>
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Rejection email sent to', request.email);
  } catch (error) {
    console.error('Rejection email error:', error);
  }
};

module.exports = {
  requestDownload,
  checkDownloadStatus,
  downloadFile,
  getDownloadRequests,
  approveDownload,
  rejectDownload
};
