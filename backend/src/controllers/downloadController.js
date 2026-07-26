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

// Request download
const requestDownload = async (req, res) => {
  try {
    const { name, email, phone, fileId } = req.body;
    
    if (!name || !email || !phone) {
      return res.status(400).json({ message: 'Name, email and phone are required' });
    }

    // Check if user already has a pending request
    const existingRequest = await DownloadRequest.findOne({
      email: email.toLowerCase(),
      status: { $in: ['pending', 'approved'] }
    });

    if (existingRequest) {
      return res.status(400).json({ 
        message: 'You already have a pending or approved download request' 
      });
    }

    // Create download token
    const downloadToken = crypto.randomBytes(32).toString('hex');

    const downloadRequest = new DownloadRequest({
      name,
      email: email.toLowerCase(),
      phone,
      fileId: fileId || null,
      downloadToken,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    await downloadRequest.save();

    // Send email to admin
    await sendAdminNotification(downloadRequest);

    res.status(201).json({
      message: 'Download request submitted successfully. You will receive an email once approved.',
      requestId: downloadRequest._id
    });

  } catch (error) {
    console.error('Request download error:', error);
    res.status(500).json({ message: 'Failed to submit download request' });
  }
};

// Admin: Get all download requests
const getDownloadRequests = async (req, res) => {
  try {
    const requests = await DownloadRequest.find()
      .sort({ requestDate: -1 })
      .populate('fileId', 'name rowCount');
    
    res.json(requests);
  } catch (error) {
    console.error('Get download requests error:', error);
    res.status(500).json({ message: 'Failed to fetch download requests' });
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
      return res.status(400).json({ message: 'Request is already processed' });
    }

    request.status = 'approved';
    request.approvedDate = new Date();
    await request.save();

    // Send approval email to user
    await sendApprovalEmail(request);

    res.json({
      message: 'Download request approved',
      downloadToken: request.downloadToken
    });

  } catch (error) {
    console.error('Approve download error:', error);
    res.status(500).json({ message: 'Failed to approve download request' });
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

    request.status = 'rejected';
    await request.save();

    // Send rejection email to user
    await sendRejectionEmail(request, reason);

    res.json({ message: 'Download request rejected' });

  } catch (error) {
    console.error('Reject download error:', error);
    res.status(500).json({ message: 'Failed to reject download request' });
  }
};

// Download file with watermark
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
        // Add comment to each cell
        ws[cellAddress].c = [{ 
          t: watermarkText,
          a: 'System'
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

    // Add a watermark sheet
    const watermarkSheet = XLSX.utils.aoa_to_sheet([
      ['🔒 ZERO INFINITY WATERMARK 🔒'],
      ['This document is watermarked and protected'],
      ['Downloaded by: ' + request.name],
      ['Email: ' + request.email],
      ['Date: ' + new Date().toISOString()],
      [''],
      ['🔒 DO NOT SHARE - CONFIDENTIAL 🔒'],
      [''],
      ['Zero Infinity Watermark v1.0'],
      ['Unauthorized distribution is prohibited']
    ]);
    XLSX.utils.book_append_sheet(workbook, watermarkSheet, 'Watermark');

    // Update request status
    request.status = 'downloaded';
    request.downloadedDate = new Date();
    await request.save();

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Send file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=voter_records_watermarked_${Date.now()}.xlsx`);
    res.send(buffer);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Failed to download file' });
  }
};

// Check download token status
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
      email: request.email
    });

  } catch (error) {
    console.error('Check download status error:', error);
    res.status(500).json({ message: 'Failed to check download status' });
  }
};

// Helper: Send admin notification
const sendAdminNotification = async (request) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'a@gmail.com';
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: adminEmail,
      subject: '📥 New Download Request',
      html: `
        <h2>New Download Request</h2>
        <p><strong>Name:</strong> ${request.name}</p>
        <p><strong>Email:</strong> ${request.email}</p>
        <p><strong>Phone:</strong> ${request.phone}</p>
        <p><strong>Request ID:</strong> ${request._id}</p>
        <p><strong>Date:</strong> ${new Date(request.requestDate).toLocaleString()}</p>
        <p><strong>IP Address:</strong> ${request.ipAddress}</p>
        <hr>
        <p>To approve this request, go to the admin dashboard.</p>
        <p>Or use the API: POST /api/downloads/approve/${request._id}</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Admin notification sent');
  } catch (error) {
    console.error('Admin notification error:', error);
  }
};

// Helper: Send approval email
const sendApprovalEmail = async (request) => {
  try {
    const downloadUrl = `${process.env.FRONTEND_URL}/download/${request.downloadToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: request.email,
      subject: '✅ Download Request Approved - Zero Infinity',
      html: `
        <h2>Your Download Request Has Been Approved</h2>
        <p>Dear <strong>${request.name}</strong>,</p>
        <p>Your request to download voter records has been approved.</p>
        <p><strong>Download Link:</strong></p>
        <p><a href="${downloadUrl}" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Click here to download</a></p>
        <p><strong>Important:</strong></p>
        <ul>
          <li>This link is valid for one-time use only</li>
          <li>The file contains a watermark - DO NOT SHARE</li>
          <li>Keep the data safe and confidential</li>
          <li>Zero Infinity Watermark v1.0</li>
        </ul>
        <p>🔒 The file is watermarked with Zero Infinity protection.</p>
        <p>If you did not request this download, please ignore this email.</p>
        <hr>
        <p><em>This is an automated message from Party Members - Zero Infinity</em></p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Approval email sent to', request.email);
  } catch (error) {
    console.error('Approval email error:', error);
  }
};

// Helper: Send rejection email
const sendRejectionEmail = async (request, reason) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: request.email,
      subject: '❌ Download Request Rejected',
      html: `
        <h2>Download Request Rejected</h2>
        <p>Dear <strong>${request.name}</strong>,</p>
        <p>Your request to download voter records has been rejected.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>If you believe this is a mistake, please contact the administrator.</p>
        <hr>
        <p><em>This is an automated message from Party Members - Zero Infinity</em></p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Rejection email sent to', request.email);
  } catch (error) {
    console.error('Rejection email error:', error);
  }
};

module.exports = {
  requestDownload,
  getDownloadRequests,
  approveDownload,
  rejectDownload,
  downloadFile,
  checkDownloadStatus
};
