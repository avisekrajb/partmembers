import React, { useState } from 'react';
import { FileSpreadsheet, Edit2, Save, XCircle, RefreshCw, Eye, ChevronUp, ChevronDown } from 'lucide-react';

const HEADERS_NEPALI = [
  'SN',
  'नाम, थर',
  'प्रदेश',
  'जिल्ला',
  'गाउँपालिका/नगरपालिका',
  'वडा नं.',
  'मतदाता नम्बर',
  'नागरिकता नम्बर',
  'नागरिकता जारी भएको मिति र जिल्ला',
  'बाबु/आमाको नाम',
  'पति/पत्नीको नाम',
  'Actions'
];

const HEADERS_ENGLISH = [
  'SN',
  'Name / Thar',
  'Province',
  'District',
  'Municipality',
  'Ward No.',
  'Voter Number',
  'Citizenship Number',
  'Citizenship Issue Details',
  'Father/Mother Name',
  'Spouse Name',
  'Actions'
];

const FIELD_MAPPING = {
  'नाम, थर': 'name',
  'Name / Thar': 'name',
  'प्रदेश': 'province',
  'Province': 'province',
  'जिल्ला': 'district',
  'District': 'district',
  'गाउँपालिका/नगरपालिका': 'municipality',
  'Municipality': 'municipality',
  'वडा नं.': 'ward',
  'Ward No.': 'ward',
  'मतदाता नम्बर': 'voterNumber',
  'Voter Number': 'voterNumber',
  'नागरिकता नम्बर': 'citizenshipNumber',
  'Citizenship Number': 'citizenshipNumber',
  'नागरिकता जारी भएको मिति र जिल्ला': 'citizenshipIssueDetails',
  'Citizenship Issue Details': 'citizenshipIssueDetails',
  'बाबु/आमाको नाम': 'fatherMotherName',
  'Father/Mother Name': 'fatherMotherName',
  'पति/पत्नीको नाम': 'spouseName',
  'Spouse Name': 'spouseName'
};

function DataTable({ 
  records = [], 
  showMissing = false,
  editingId = null,
  editData = {},
  onEdit = null,
  onEditChange = null,
  onSave = null,
  onCancel = null,
  isSaving = false,
  isAdmin = false,
  onRowClick = null,
  showEnglishLabels = false,
  searchTerm = ''
}) {
  const [sortField, setSortField] = useState('sn');
  const [sortDirection, setSortDirection] = useState('asc');

  // Filter records based on search term
  const getFilteredRecords = () => {
    if (!searchTerm || searchTerm.trim() === '') return records;
    
    const term = searchTerm.toLowerCase().trim();
    return records.filter(record => {
      return Object.values(record).some(value => {
        if (!value) return false;
        return String(value).toLowerCase().includes(term);
      });
    });
  };

  // Sort records
  const getSortedRecords = (filteredRecords) => {
    if (!sortField) return filteredRecords;
    
    return [...filteredRecords].sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      
      if (sortField === 'sn') {
        return sortDirection === 'asc' ? (aVal - bVal) : (bVal - aVal);
      }
      
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredRecords = getFilteredRecords();
  const sortedRecords = getSortedRecords(filteredRecords);

  if (!sortedRecords || sortedRecords.length === 0) {
    return (
      <div className="np-empty">
        <FileSpreadsheet size={28} />
        <p>No records available.</p>
        {searchTerm && <p className="np-muted">No records match your search: "{searchTerm}"</p>}
      </div>
    );
  }

  const headers = showEnglishLabels ? HEADERS_ENGLISH : HEADERS_NEPALI;

  const isMissing = (value) => {
    return !value || value.trim() === '' || value.trim() === '-' || value.trim() === '—';
  };

  const isValidNumber = (value) => {
    if (!value || value.trim() === '') return false;
    const trimmed = value.trim();
    const allowedPattern = /^[\d\s\/\-\.\(\)\,०-९]+$/;
    return allowedPattern.test(trimmed);
  };

  const containsLetters = (value) => {
    if (!value || value.trim() === '') return false;
    const letterPattern = /[a-zA-Z]/;
    return letterPattern.test(value);
  };

  const hasCriticalIssue = (value) => {
    if (isMissing(value)) return true;
    if (containsLetters(value)) return true;
    if (!isValidNumber(value)) return true;
    return false;
  };

  const hasCriticalMissing = (record) => {
    const voterNumber = record.voterNumber || '';
    const citizenshipNumber = record.citizenshipNumber || '';
    return hasCriticalIssue(voterNumber) || hasCriticalIssue(citizenshipNumber);
  };

  const isCriticalField = (fieldName) => {
    return fieldName === 'voterNumber' || fieldName === 'citizenshipNumber';
  };

  const getDisplayName = (header) => {
    if (showEnglishLabels) {
      const englishMap = {
        'नाम, थर': 'Name / Thar',
        'प्रदेश': 'Province',
        'जिल्ला': 'District',
        'गाउँपालिका/नगरपालिका': 'Municipality',
        'वडा नं.': 'Ward No.',
        'मतदाता नम्बर': 'Voter Number',
        'नागरिकता नम्बर': 'Citizenship Number',
        'नागरिकता जारी भएको मिति र जिल्ला': 'Citizenship Issue Details',
        'बाबु/आमाको नाम': 'Father/Mother Name',
        'पति/पत्नीको नाम': 'Spouse Name'
      };
      return englishMap[header] || header;
    }
    return header;
  };

  const getFieldName = (header) => {
    if (header === 'SN' || header === 'Actions') return null;
    if (FIELD_MAPPING[header]) return FIELD_MAPPING[header];
    const displayName = getDisplayName(header);
    return FIELD_MAPPING[displayName] || null;
  };

  const getSortFieldForHeader = (header) => {
    if (header === 'SN') return 'sn';
    const fieldName = getFieldName(header);
    return fieldName || null;
  };

  return (
    <div className="np-table-wrap">
      <div className="np-table-toolbar">
        <span className="np-table-count">{sortedRecords.length} records</span>
      </div>
      <table className="np-table">
        <thead>
          <tr>
            {headers.map((header) => {
              const sortFieldName = getSortFieldForHeader(header);
              const isSortable = sortFieldName !== null;
              
              return (
                <th 
                  key={header}
                  className={isSortable ? 'np-table__sortable' : ''}
                  onClick={() => isSortable && handleSort(sortFieldName)}
                >
                  {getDisplayName(header)}
                  {isSortable && sortField === sortFieldName && (
                    <span className="np-table__sort-icon">
                      {sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRecords.map((record, index) => {
            const hasCritical = hasCriticalMissing(record);
            const isEditing = editingId === record._id;
            
            return (
              <tr 
                key={record._id || index} 
                className={`
                  ${hasCritical && showMissing ? 'np-table__row--critical' : ''}
                  ${onRowClick ? 'np-table__row--clickable' : ''}
                `}
                onClick={() => onRowClick && !isEditing && onRowClick(record)}
              >
                <td className="np-table__sn">{record.sn || index + 1}</td>
                
                {headers.slice(1, -1).map((header) => {
                  const fieldName = getFieldName(header);
                  if (!fieldName) return null;
                  
                  const value = isEditing ? editData[fieldName] : record[fieldName];
                  const missing = isMissing(value);
                  const critical = isCriticalField(fieldName);
                  
                  const hasLetters = critical && containsLetters(value);
                  const isInvalid = critical && hasCriticalIssue(value);
                  
                  let cellClass = '';
                  let badgeText = '';
                  let badgeClass = '';
                  
                  if (critical && showMissing) {
                    if (missing) {
                      cellClass = 'np-table__cell--critical-missing';
                      badgeText = '⚠️ CRITICAL';
                      badgeClass = 'np-table__missing-badge--critical';
                    } else if (hasLetters) {
                      cellClass = 'np-table__cell--critical-missing';
                      badgeText = '⚠️ LETTERS';
                      badgeClass = 'np-table__missing-badge--critical';
                    } else if (!isValidNumber(value) && value && value.trim() !== '') {
                      cellClass = 'np-table__cell--critical-missing';
                      badgeText = '⚠️ INVALID';
                      badgeClass = 'np-table__missing-badge--critical';
                    }
                  } else if (missing && showMissing && !critical) {
                    cellClass = 'np-table__cell--missing';
                    badgeText = 'Missing';
                    badgeClass = 'np-table__missing-badge';
                  }
                  
                  return (
                    <td 
                      key={header}
                      className={cellClass}
                      title={critical && isInvalid ? `Critical issue: ${fieldName}` : ''}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          value={value || ''}
                          onChange={(e) => onEditChange(fieldName, e.target.value)}
                          className="np-table__edit-input"
                          placeholder={`Enter ${getDisplayName(header)}`}
                        />
                      ) : (
                        <>
                          {value || '—'}
                          {badgeText && showMissing && (
                            <span className={badgeClass}>
                              {badgeText}
                            </span>
                          )}
                        </>
                      )}
                    </td>
                  );
                })}
                
                <td>
                  {isAdmin && (
                    <>
                      {isEditing ? (
                        <div className="np-table__actions">
                          <button
                            className="np-btn np-btn--red np-btn--sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSave();
                            }}
                            disabled={isSaving}
                            title="Save"
                          >
                            {isSaving ? <RefreshCw size={14} className="np-spinning" /> : <Save size={14} />}
                          </button>
                          <button
                            className="np-btn np-btn--ghost np-btn--sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCancel();
                            }}
                            disabled={isSaving}
                            title="Cancel"
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="np-table__actions">
                          {onRowClick && (
                            <button
                              className="np-btn np-btn--sky np-btn--sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRowClick(record);
                              }}
                              title="View Details"
                            >
                              <Eye size={14} />
                            </button>
                          )}
                          <button
                            className="np-btn np-btn--ghost np-btn--sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(record);
                            }}
                            title="Edit Record"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;