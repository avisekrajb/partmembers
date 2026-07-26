const VoterRecord = require('../models/VoterRecord');
const File = require('../models/File');

// Helper function to escape regex
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Get records by file ID
const getRecordsByFileId = async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // Verify file exists
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    const records = await VoterRecord.find({ fileId })
      .sort({ sn: 1 })
      .lean();

    res.json({
      file: {
        id: file._id,
        name: file.name,
        rowCount: file.rowCount
      },
      records,
      total: records.length
    });
  } catch (error) {
    console.error('Get records by file error:', error);
    res.status(500).json({ message: 'Failed to fetch records' });
  }
};

// Get all records (for public view)
const getAllRecords = async (req, res) => {
  try {
    const { limit = 1000, skip = 0, fileId, search } = req.query;
    
    const filter = {};
    if (fileId) filter.fileId = fileId;
    
    // Add search functionality
    if (search && search.trim().length > 0) {
      const searchTerm = search.trim();
      filter.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { name: { $regex: escapeRegex(searchTerm), $options: 'i' } },
        { district: { $regex: searchTerm, $options: 'i' } },
        { district: { $regex: escapeRegex(searchTerm), $options: 'i' } },
        { municipality: { $regex: searchTerm, $options: 'i' } },
        { municipality: { $regex: escapeRegex(searchTerm), $options: 'i' } },
        { voterNumber: { $regex: searchTerm, $options: 'i' } },
        { citizenshipNumber: { $regex: searchTerm, $options: 'i' } },
        { fatherMotherName: { $regex: searchTerm, $options: 'i' } },
        { fatherMotherName: { $regex: escapeRegex(searchTerm), $options: 'i' } },
        { spouseName: { $regex: searchTerm, $options: 'i' } },
        { spouseName: { $regex: escapeRegex(searchTerm), $options: 'i' } },
        { province: { $regex: searchTerm, $options: 'i' } },
        { ward: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    const [records, totalCount] = await Promise.all([
      VoterRecord.find(filter)
        .sort({ sn: 1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .populate('fileId', 'name')
        .lean(),
      VoterRecord.countDocuments(filter)
    ]);

    res.json({
      records,
      total: totalCount,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        skip: parseInt(skip),
        ...(search && { search: search.trim() })
      }
    });
  } catch (error) {
    console.error('Get all records error:', error);
    res.status(500).json({ message: 'Failed to fetch records' });
  }
};

// Search records with transliteration support
const searchRecords = async (req, res) => {
  try {
    const { q, field, limit = 500 } = req.query;
    
    if (!q || q.length < 1) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const searchQuery = q.trim();
    const searchableFields = ['name', 'district', 'municipality', 'voterNumber', 'citizenshipNumber', 
                             'fatherMotherName', 'spouseName', 'province', 'ward'];
    const searchField = field && searchableFields.includes(field) ? field : null;
    
    // Build search conditions
    const conditions = [];
    
    // Direct match
    if (searchField) {
      conditions.push({
        [searchField]: { $regex: searchQuery, $options: 'i' }
      });
    } else {
      // Search across multiple fields
      searchableFields.forEach(f => {
        conditions.push({
          [f]: { $regex: searchQuery, $options: 'i' }
        });
      });
    }
    
    // Try transliteration if the package is available
    try {
      const { transliterate } = require('indic-transliteration');
      
      // Try to transliterate the search query
      const devanagariToLatin = transliterate(searchQuery, 'devanagari', 'iast');
      const latinToDevanagari = transliterate(searchQuery, 'iast', 'devanagari');
      
      // Add transliterated search conditions
      if (devanagariToLatin && devanagariToLatin !== searchQuery) {
        if (searchField) {
          conditions.push({
            [searchField]: { $regex: devanagariToLatin, $options: 'i' }
          });
        } else {
          searchableFields.forEach(f => {
            conditions.push({
              [f]: { $regex: devanagariToLatin, $options: 'i' }
            });
          });
        }
      }
      
      if (latinToDevanagari && latinToDevanagari !== searchQuery) {
        if (searchField) {
          conditions.push({
            [searchField]: { $regex: latinToDevanagari, $options: 'i' }
          });
        } else {
          searchableFields.forEach(f => {
            conditions.push({
              [f]: { $regex: latinToDevanagari, $options: 'i' }
            });
          });
        }
      }
    } catch (transError) {
      // Transliteration package not available, continue with direct search
      console.log('Transliteration package not available, using direct search');
    }

    const records = await VoterRecord.find({
      $or: conditions
    })
    .limit(parseInt(limit))
    .populate('fileId', 'name')
    .sort({ sn: 1 })
    .lean();

    res.json({
      records,
      total: records.length,
      searchField: searchField || 'all',
      query: searchQuery
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Search failed' });
  }
};

// Update a single record
const updateRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Remove fields that shouldn't be updated
    delete updates._id;
    delete updates.fileId;
    delete updates.createdAt;
    delete updates.sn;
    delete updates.__v;
    
    // Validate required fields
    if (!updates.name || updates.name.trim() === '') {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    const record = await VoterRecord.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }
    
    res.json({ 
      message: 'Record updated successfully',
      record 
    });
  } catch (error) {
    console.error('Update record error:', error);
    res.status(500).json({ message: 'Failed to update record' });
  }
};

// Export records as Excel
const exportRecords = async (req, res) => {
  try {
    const { fileId } = req.query;
    const filter = {};
    if (fileId) filter.fileId = fileId;
    
    const records = await VoterRecord.find(filter)
      .sort({ sn: 1 })
      .lean();
    
    if (!records || records.length === 0) {
      return res.status(404).json({ message: 'No records found to export' });
    }
    
    // Format data for export
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
    
    res.json({
      data: exportData,
      total: exportData.length
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Failed to export records' });
  }
};

module.exports = {
  getRecordsByFileId,
  getAllRecords,
  searchRecords,
  updateRecord,
  exportRecords
};