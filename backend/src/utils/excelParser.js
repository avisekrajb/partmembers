const XLSX = require('xlsx');

// Data columns mapping (first column "क्र.सं." is computed)
const DATA_HEADERS = [
  "name", // नाम, थर
  "province", // प्रदेश
  "district", // जिल्ला
  "municipality", // गाउँपालिका/नगरपालिका
  "ward", // वडा नं.
  "voterNumber", // मतदाता नम्बर
  "citizenshipNumber", // नागरिकता नम्बर
  "citizenshipIssueDetails", // नागरिकता जारी भएको मिति र जिल्ला
  "fatherMotherName", // बाबु/आमाको नाम
  "spouseName" // पति/पत्नीको नाम
];

// Nepali column names for validation
const NEPALI_HEADERS = [
  "नाम, थर",
  "प्रदेश",
  "जिल्ला",
  "गाउँपालिका/नगरपालिका",
  "वडा नं.",
  "मतदाता नम्बर",
  "नागरिकता नम्बर",
  "नागरिकता जारी भएको मिति र जिल्ला",
  "बाबु/आमाको नाम",
  "पति/पत्नीको नाम"
];

const parseFile = (buffer) => {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('No sheet found in the workbook');
    }

    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      blankrows: false
    });

    if (!rawData || rawData.length < 2) {
      throw new Error('File contains no data rows');
    }

    // Get header row and find column mappings
    const headerRow = rawData[0];
    const columnMap = {};

    // Map Nepali headers to English field names
    NEPALI_HEADERS.forEach((nepaliHeader, index) => {
      const englishField = DATA_HEADERS[index];
      // Find the column index that matches this header (case insensitive)
      const colIndex = headerRow.findIndex(cell => 
        String(cell).trim().toLowerCase() === nepaliHeader.toLowerCase() ||
        String(cell).trim().toLowerCase().replace(/[\s\/]/g, '') === nepaliHeader.toLowerCase().replace(/[\s\/]/g, '')
      );
      if (colIndex !== -1) {
        columnMap[englishField] = colIndex;
      }
    });

    // Also try to match by position if exact mapping fails
    if (Object.keys(columnMap).length === 0) {
      // Use position-based mapping (skip first column which is serial number)
      DATA_HEADERS.forEach((field, index) => {
        columnMap[field] = index + 1; // +1 because first column is serial number
      });
    }

    // Process data rows
    const dataRows = rawData.slice(1);
    
    // Filter out completely empty rows
    const meaningfulRows = dataRows.filter(row => 
      Array.isArray(row) && row.some(cell => String(cell).trim() !== '')
    );

    if (meaningfulRows.length === 0) {
      throw new Error('No meaningful data found in the file');
    }

    // Map rows to structured objects
    const rows = meaningfulRows.map((row, index) => {
      const record = {
        sn: index + 1 // Always generate sequential serial numbers
      };
      
      DATA_HEADERS.forEach((field) => {
        const colIndex = columnMap[field];
        if (colIndex !== undefined && colIndex < row.length) {
          const value = row[colIndex];
          record[field] = value !== undefined && value !== null ? String(value).trim() : '';
        } else {
          record[field] = '';
        }
      });

      return record;
    });

    return {
      rows,
      headers: ['sn', ...DATA_HEADERS],
      totalRows: rows.length,
      columnMap
    };
  } catch (error) {
    console.error('Excel parsing error:', error);
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
};

module.exports = {
  parseFile,
  DATA_HEADERS,
  NEPALI_HEADERS
};