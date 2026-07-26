import React, { useState } from 'react';
import { X, Edit2, Save, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../services/api';

function RecordModal({ record, isOpen, onClose, isAdmin, onEdit, showEnglishLabels = false }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !record) return null;

  // Helper functions for validation
  const isValidNumber = (value) => {
    if (!value || value.trim() === '') return false;
    const trimmed = value.trim();
    // Allow: digits, spaces, /, -, ., (, ), comma, Nepali digits
    const allowedPattern = /^[\d\s\/\-\.\(\)\,०-९]+$/;
    return allowedPattern.test(trimmed);
  };

  const containsLetters = (value) => {
    if (!value || value.trim() === '') return false;
    const letterPattern = /[a-zA-Z]/;
    return letterPattern.test(value);
  };

  const isMissing = (value) => {
    return !value || value.trim() === '' || value.trim() === '-' || value.trim() === '—';
  };

  const hasCriticalIssue = (value) => {
    if (isMissing(value)) return true;
    if (containsLetters(value)) return true;
    if (!isValidNumber(value)) return true;
    return false;
  };

  const getCriticalMessage = (value, fieldName) => {
    if (isMissing(value)) {
      return fieldName === 'voterNumber' ? 'Voter ID is Missing' : 'Citizenship Number is Missing';
    }
    if (containsLetters(value)) {
      return `${fieldName === 'voterNumber' ? 'Voter ID' : 'Citizenship Number'} contains letters (A-Z, a-z). Only numbers and signs (/, -, ., etc.) are allowed.`;
    }
    if (!isValidNumber(value)) {
      return `${fieldName === 'voterNumber' ? 'Voter ID' : 'Citizenship Number'} has invalid format. Only numbers and signs (/, -, ., etc.) are allowed.`;
    }
    return 'Invalid format';
  };

  const FIELD_LABELS = showEnglishLabels ? {
    name: 'Name / Thar',
    province: 'Province',
    district: 'District',
    municipality: 'Municipality / Rural Municipality',
    ward: 'Ward No.',
    voterNumber: 'Voter Number',
    citizenshipNumber: 'Citizenship Number',
    citizenshipIssueDetails: 'Citizenship Issue Details',
    fatherMotherName: 'Father/Mother Name',
    spouseName: 'Spouse Name'
  } : {
    name: 'नाम, थर',
    province: 'प्रदेश',
    district: 'जिल्ला',
    municipality: 'गाउँपालिका/नगरपालिका',
    ward: 'वडा नं.',
    voterNumber: 'मतदाता नम्बर',
    citizenshipNumber: 'नागरिकता नम्बर',
    citizenshipIssueDetails: 'नागरिकता जारी भएको मिति र जिल्ला',
    fatherMotherName: 'बाबु/आमाको नाम',
    spouseName: 'पति/पत्नीको नाम'
  };

  const isCriticalField = (fieldName) => {
    return fieldName === 'voterNumber' || fieldName === 'citizenshipNumber';
  };

  const startEdit = () => {
    setEditData({ ...record });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditData({});
  };

  const handleEditChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const saveEdit = async () => {
    setIsSaving(true);
    try {
      // Validate critical fields before saving
      const voterNumber = editData.voterNumber || '';
      const citizenshipNumber = editData.citizenshipNumber || '';
      
      if (voterNumber && containsLetters(voterNumber)) {
        toast.error('Voter ID contains letters. Only numbers and signs (/, -, ., etc.) are allowed.');
        setIsSaving(false);
        return;
      }
      
      if (citizenshipNumber && containsLetters(citizenshipNumber)) {
        toast.error('Citizenship Number contains letters. Only numbers and signs (/, -, ., etc.) are allowed.');
        setIsSaving(false);
        return;
      }

      const response = await api.updateRecord(record._id, editData);
      toast.success('Record updated successfully');
      
      if (onEdit) {
        onEdit(response.record);
      }
      
      setIsEditing(false);
      setEditData({});
      
      onClose();
      setTimeout(() => {
        if (typeof onEdit === 'function') {
          onEdit(response.record);
        }
      }, 100);
      
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error.response?.data?.message || 'Failed to update record');
    } finally {
      setIsSaving(false);
    }
  };

  const displayRecord = isEditing ? editData : record;

  return (
    <div className="np-modal-overlay" onClick={onClose}>
      <div className="np-modal" onClick={(e) => e.stopPropagation()}>
        <div className="np-modal__header">
          <h3>{showEnglishLabels ? 'Record Details' : 'विवरण'}</h3>
          <div className="np-modal__actions">
            {isAdmin && !isEditing && (
              <button className="np-btn np-btn--sky np-btn--sm" onClick={startEdit}>
                <Edit2 size={16} /> {showEnglishLabels ? 'Edit' : 'सम्पादन'}
              </button>
            )}
            {isEditing && (
              <>
                <button 
                  className="np-btn np-btn--red np-btn--sm" 
                  onClick={saveEdit}
                  disabled={isSaving}
                >
                  {isSaving ? <RefreshCw size={16} className="np-spinning" /> : <Save size={16} />}
                  {showEnglishLabels ? 'Save' : 'सुरक्षित'}
                </button>
                <button 
                  className="np-btn np-btn--ghost np-btn--sm" 
                  onClick={cancelEdit}
                  disabled={isSaving}
                >
                  <XCircle size={16} /> {showEnglishLabels ? 'Cancel' : 'रद्द'}
                </button>
              </>
            )}
            <button className="np-modal__close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="np-modal__body">
          {/* Critical Warning Banner */}
          {(isCriticalField('voterNumber') && hasCriticalIssue(record.voterNumber)) || 
           (isCriticalField('citizenshipNumber') && hasCriticalIssue(record.citizenshipNumber)) ? (
            <div className="np-modal__critical-banner">
              <AlertTriangle size={20} />
              <div>
                <strong>⚠️ Critical Issues Found</strong>
                <div className="np-modal__critical-details">
                  {hasCriticalIssue(record.voterNumber) && (
                    <div>• Voter ID: {getCriticalMessage(record.voterNumber, 'voterNumber')}</div>
                  )}
                  {hasCriticalIssue(record.citizenshipNumber) && (
                    <div>• Citizenship: {getCriticalMessage(record.citizenshipNumber, 'citizenshipNumber')}</div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div className="np-modal__fields">
            {Object.entries(FIELD_LABELS).map(([field, label]) => {
              const value = displayRecord[field] || '';
              const missing = isMissing(value);
              const critical = isCriticalField(field);
              const hasLetters = critical && containsLetters(value);
              const isValid = critical && !missing && !hasLetters && isValidNumber(value);
              const criticalIssue = critical && hasCriticalIssue(value);
              
              // Determine field status
              let fieldStatus = '';
              let statusText = '';
              if (critical && missing) {
                fieldStatus = 'critical-missing';
                statusText = showEnglishLabels ? '⚠️ CRITICAL: Missing' : '⚠️ आवश्यक: छुटेको';
              } else if (critical && hasLetters) {
                fieldStatus = 'critical-invalid';
                statusText = showEnglishLabels ? '⚠️ CRITICAL: Contains Letters' : '⚠️ आवश्यक: अक्षर भएको';
              } else if (critical && !isValid) {
                fieldStatus = 'critical-invalid';
                statusText = showEnglishLabels ? '⚠️ CRITICAL: Invalid Format' : '⚠️ आवश्यक: गलत ढाँचा';
              } else if (missing && !critical) {
                fieldStatus = 'missing';
                statusText = showEnglishLabels ? 'Missing' : 'छुटेको';
              } else if (critical && isValid) {
                fieldStatus = 'valid';
                statusText = showEnglishLabels ? '✅ Valid' : '✅ सही';
              }
              
              return (
                <div key={field} className="np-modal__field">
                  <label>
                    {label}
                    {critical && <span className="np-modal__required">*</span>}
                  </label>
                  {isEditing ? (
                    <div>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => handleEditChange(field, e.target.value)}
                        className={`np-modal__input ${fieldStatus === 'critical-missing' || fieldStatus === 'critical-invalid' ? 'np-modal__input--critical' : ''} ${fieldStatus === 'missing' ? 'np-modal__input--missing' : ''}`}
                        placeholder={showEnglishLabels ? `Enter ${label}` : `${label} प्रविष्ट गर्नुहोस्`}
                      />
                      {critical && value && fieldStatus === 'critical-invalid' && (
                        <div className="np-modal__field-error">
                          {showEnglishLabels ? 'Only numbers and signs (/, -, ., etc.) allowed' : 'केवल संख्या र चिन्हहरू (/, -, ., आदि) मात्र अनुमति छ'}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`np-modal__value ${fieldStatus === 'critical-missing' ? 'np-modal__value--critical-missing' : ''} ${fieldStatus === 'critical-invalid' ? 'np-modal__value--critical-invalid' : ''} ${fieldStatus === 'missing' ? 'np-modal__value--missing' : ''} ${fieldStatus === 'valid' ? 'np-modal__value--valid' : ''}`}>
                      {value || '—'}
                      {statusText && (
                        <span className={`np-modal__badge ${fieldStatus === 'critical-missing' || fieldStatus === 'critical-invalid' ? 'np-modal__badge--critical' : ''} ${fieldStatus === 'missing' ? 'np-modal__badge--missing' : ''} ${fieldStatus === 'valid' ? 'np-modal__badge--valid' : ''}`}>
                          {statusText}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Record Metadata */}
          <div className="np-modal__metadata">
            <div className="np-modal__metadata-item">
              <span className="np-modal__metadata-label">{showEnglishLabels ? 'Record ID' : 'रेकर्ड आईडी'}:</span>
              <span className="np-modal__metadata-value">{record._id}</span>
            </div>
            <div className="np-modal__metadata-item">
              <span className="np-modal__metadata-label">{showEnglishLabels ? 'Serial Number' : 'क्र.सं.'}:</span>
              <span className="np-modal__metadata-value">{record.sn}</span>
            </div>
            <div className="np-modal__metadata-item">
              <span className="np-modal__metadata-label">{showEnglishLabels ? 'Created' : 'सिर्जना गरिएको'}:</span>
              <span className="np-modal__metadata-value">{new Date(record.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecordModal;