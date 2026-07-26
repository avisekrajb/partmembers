const File = require('../models/File');
const VoterRecord = require('../models/VoterRecord');
const excelParser = require('../utils/excelParser');

// Upload and process files
const uploadFiles = async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        console.log(`Processing file: ${file.originalname}`);
        
        // Parse Excel file
        const { rows, headers, columnMap } = await excelParser.parseFile(file.buffer);
        
        if (!rows || rows.length === 0) {
          errors.push({ fileName: file.originalname, error: 'No data found in file' });
          continue;
        }

        console.log(`Found ${rows.length} rows in ${file.originalname}`);

        // Create file record
        const fileRecord = new File({
          name: file.originalname,
          originalName: file.originalname,
          size: file.size,
          rowCount: rows.length,
          uploadedBy: req.user.id,
          status: 'processing'
        });
        await fileRecord.save();

        // Process and save voter records
        const records = [];
        let validCount = 0;
        let invalidCount = 0;

        for (const row of rows) {
          try {
            // Ensure all required fields exist with defaults
            const record = {
              fileId: fileRecord._id,
              sn: row.sn || 0,
              name: row.name || '',
              province: row.province || '',
              district: row.district || '',
              municipality: row.municipality || '',
              ward: row.ward || '',
              voterNumber: row.voterNumber || '',
              citizenshipNumber: row.citizenshipNumber || '',
              citizenshipIssueDetails: row.citizenshipIssueDetails || '',
              fatherMotherName: row.fatherMotherName || '',
              spouseName: row.spouseName || '',
              rawData: row
            };
            
            records.push(record);
            validCount++;
          } catch (rowError) {
            console.error('Error processing row:', rowError);
            invalidCount++;
          }
        }

        // Bulk insert for better performance
        if (records.length > 0) {
          await VoterRecord.insertMany(records);
          console.log(`Inserted ${records.length} records successfully`);
        }

        // Update file status
        fileRecord.status = 'completed';
        fileRecord.rowCount = records.length;
        await fileRecord.save();

        results.push({
          fileId: fileRecord._id,
          fileName: file.originalname,
          rowCount: records.length,
          validCount,
          invalidCount
        });

      } catch (error) {
        console.error(`Error processing ${file.originalname}:`, error);
        errors.push({ 
          fileName: file.originalname, 
          error: error.message 
        });
      }
    }

    res.json({
      message: 'Files processed successfully',
      results,
      errors,
      totalFiles: files.length,
      successful: results.length,
      failed: errors.length
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      message: 'File upload failed',
      error: error.message 
    });
  }
};

// Get all files
const getAllFiles = async (req, res) => {
  try {
    const files = await File.find()
      .sort({ uploadDate: -1 })
      .populate('uploadedBy', 'email')
      .select('-__v');
    
    res.json(files);
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ message: 'Failed to fetch files' });
  }
};

// Delete file and associated records
const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;
    
    const file = await File.findById(id);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Delete all associated records
    await VoterRecord.deleteMany({ fileId: id });
    
    // Delete file record
    await file.deleteOne();

    res.json({ message: 'File and associated records deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'Failed to delete file' });
  }
};

module.exports = {
  uploadFiles,
  getAllFiles,
  deleteFile
};