import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileSpreadsheet, 
  AlertCircle, 
  Search, 
  X, 
  ChevronDown, 
  Users, 
  FileText, 
  AlertTriangle,
  Download,
  RefreshCw,
  Languages,
  CheckCircle,
  Shield
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import DataTable from './DataTable';
import RecordModal from './RecordModal';
import InfinityLoader from './InfinityLoader';
import DownloadRequest from './DownloadRequest';
import { api } from '../services/api';
import { translateSearchTerm } from '../utils/translation';
import * as XLSX from 'xlsx';

function AllData() {
  const location = useLocation();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showEnglishLabels, setShowEnglishLabels] = useState(false);
  const [showDownloadRequest, setShowDownloadRequest] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    missingCitizenship: 0,
    missingVoterNumber: 0,
    invalidCitizenship: 0,
    invalidVoterNumber: 0,
    missingBoth: 0,
    complete: 0
  });

  // Helper validation functions
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

  const isMissing = (value) => {
    return !value || value.trim() === '' || value.trim() === '-' || value.trim() === '—';
  };

  const hasCriticalIssue = (value) => {
    if (isMissing(value)) return true;
    if (containsLetters(value)) return true;
    if (!isValidNumber(value)) return true;
    return false;
  };

  // Check if user is admin
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAdmin(!!token);
  }, []);

  // Parse URL params for search
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const search = params.get('search');
    if (search) {
      setSearchTerm(search);
    }
  }, [location.search]);

  // Fetch all files
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await api.getFiles();
        setFiles(response || []);
        if (response && response.length > 0 && !activeFileId) {
          setActiveFileId(response[0].id || response[0]._id);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching files:', err);
        setError('Failed to load files');
        setLoading(false);
      }
    };
    fetchFiles();
  }, []);

  // Calculate statistics with enhanced validation
  const calculateStats = useCallback((data) => {
    let total = data.length;
    let missingCitizenship = 0;
    let missingVoterNumber = 0;
    let invalidCitizenship = 0;
    let invalidVoterNumber = 0;
    let missingBoth = 0;
    let complete = 0;

    data.forEach(record => {
      const voterNumber = record.voterNumber || '';
      const citizenshipNumber = record.citizenshipNumber || '';
      
      const hasCitizenship = citizenshipNumber && citizenshipNumber.trim() !== '' && citizenshipNumber.trim() !== '-' && citizenshipNumber.trim() !== '—';
      const hasVoterNumber = voterNumber && voterNumber.trim() !== '' && voterNumber.trim() !== '-' && voterNumber.trim() !== '—';
      
      const citizenshipValid = hasCitizenship && isValidNumber(citizenshipNumber) && !containsLetters(citizenshipNumber);
      const voterValid = hasVoterNumber && isValidNumber(voterNumber) && !containsLetters(voterNumber);
      
      if (!hasCitizenship || !citizenshipValid) missingCitizenship++;
      if (!hasVoterNumber || !voterValid) missingVoterNumber++;
      if ((!hasCitizenship || !citizenshipValid) && (!hasVoterNumber || !voterValid)) missingBoth++;
      if (citizenshipValid && voterValid) complete++;
      
      if (hasCitizenship && !citizenshipValid) invalidCitizenship++;
      if (hasVoterNumber && !voterValid) invalidVoterNumber++;
    });

    setStats({
      total,
      missingCitizenship,
      missingVoterNumber,
      invalidCitizenship,
      invalidVoterNumber,
      missingBoth,
      complete
    });
  }, []);

  // Fetch records with search
  const fetchRecords = useCallback(async (search = null) => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      if (search && search.trim().length > 0) {
        const translatedTerm = translateSearchTerm(search);
        const finalSearch = translatedTerm !== search ? translatedTerm : search;
        response = await api.searchRecords(finalSearch);
        setRecords(response.records || []);
      } else if (activeFileId) {
        response = await api.getRecordsByFileId(activeFileId);
        setRecords(response.records || []);
      } else {
        response = await api.getAllRecords();
        setRecords(response.records || []);
      }
      
      const data = response.records || [];
      calculateStats(data);
    } catch (err) {
      console.error('Error fetching records:', err);
      setError('Failed to load records. Please try again.');
      setRecords([]);
      calculateStats([]);
    } finally {
      setLoading(false);
    }
  }, [activeFileId, calculateStats]);

  // Fetch records when file or search changes
  useEffect(() => {
    if (searchTerm && searchTerm.trim().length > 0) {
      fetchRecords(searchTerm);
    } else if (activeFileId) {
      fetchRecords(null);
    } else {
      fetchRecords(null);
    }
  }, [activeFileId, searchTerm, fetchRecords]);

  const handleSearch = (e) => {
    e.preventDefault();
    const term = searchTerm.trim();
    if (term.length > 0) {
      navigate(`/data?search=${encodeURIComponent(term)}`);
      fetchRecords(term);
    } else {
      navigate('/data');
      fetchRecords(null);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    navigate('/data');
    fetchRecords(null);
  };

  const handleFileChange = (fileId) => {
    setActiveFileId(fileId);
    if (searchTerm) {
      setSearchTerm('');
      navigate('/data');
    }
  };

  const toggleMissingOnly = () => {
    setShowMissingOnly(!showMissingOnly);
  };

  const toggleLanguage = () => {
    setShowEnglishLabels(!showEnglishLabels);
  };

  const toggleDownloadRequest = () => {
    setShowDownloadRequest(!showDownloadRequest);
  };

  const handleRecordClick = (record) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const startEdit = (record) => {
    setEditingId(record._id);
    setEditData({ ...record });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleEditChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const saveEdit = async () => {
    if (!editingId) return;
    
    const voterNumber = editData.voterNumber || '';
    const citizenshipNumber = editData.citizenshipNumber || '';
    
    if (voterNumber && containsLetters(voterNumber)) {
      toast.error('Voter ID contains letters. Only numbers and signs (/, -, ., etc.) are allowed.');
      return;
    }
    
    if (citizenshipNumber && containsLetters(citizenshipNumber)) {
      toast.error('Citizenship Number contains letters. Only numbers and signs (/, -, ., etc.) are allowed.');
      return;
    }
    
    setIsSaving(true);
    try {
      const response = await api.updateRecord(editingId, editData);
      toast.success('Record updated successfully');
      
      setRecords(prev => prev.map(r => 
        r._id === editingId ? response.record : r
      ));
      
      if (selectedRecord && selectedRecord._id === editingId) {
        setSelectedRecord(response.record);
      }
      
      setEditingId(null);
      setEditData({});
      
      const updatedRecords = records.map(r => 
        r._id === editingId ? response.record : r
      );
      calculateStats(updatedRecords);
      
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error.response?.data?.message || 'Failed to update record');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.exportRecords(activeFileId);
      
      if (!response.data || response.data.length === 0) {
        toast.warning('No data to export');
        return;
      }

      const ws = XLSX.utils.json_to_sheet(response.data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Voter Records');
      
      const filename = `voter_records_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success(`Exported ${response.data.length} records successfully`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const getFilteredRecords = () => {
    if (!showMissingOnly) return records;
    return records.filter(record => {
      const voterNumber = record.voterNumber || '';
      const citizenshipNumber = record.citizenshipNumber || '';
      return hasCriticalIssue(voterNumber) || hasCriticalIssue(citizenshipNumber);
    });
  };

  const filteredRecords = getFilteredRecords();

  if (loading && files.length === 0) {
    return (
      <div className="np-page">
        <InfinityLoader 
          size={50} 
          color="#8B5CF6" 
          text="Loading data..." 
        />
      </div>
    );
  }

  return (
    <div className="np-page">
      <div className="np-page__head">
        <div>
          <h2>All Data</h2>
          <p className="np-muted">Voter records uploaded by the admin. Search in English or Nepali.</p>
        </div>
        <div className="np-page__actions">
          <button 
            className="np-btn np-btn--ghost np-btn--sm"
            onClick={toggleLanguage}
            title={showEnglishLabels ? 'Show Nepali' : 'Show English'}
          >
            <Languages size={16} />
            {showEnglishLabels ? 'नेपाली' : 'English'}
          </button>
          <button 
            className="np-btn np-btn--sky np-btn--sm"
            onClick={toggleDownloadRequest}
          >
            <Download size={16} />
            Request Download
          </button>
          <button 
            className="np-btn np-btn--sky np-btn--sm"
            onClick={handleExport}
            disabled={exporting || records.length === 0}
          >
            {exporting ? <RefreshCw size={16} className="np-spinning" /> : <Download size={16} />}
            Export XLSX
          </button>
          {files.length > 0 && !searchTerm && (
            <div className="np-select">
              <select 
                value={activeFileId || ''} 
                onChange={(e) => handleFileChange(e.target.value)}
              >
                <option value="">All Files</option>
                {files.map((file) => (
                  <option key={file.id || file._id} value={file.id || file._id}>
                    {file.name} ({file.rowCount || 0} records)
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="np-select__chev" />
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {!loading && records.length > 0 && (
        <div className="np-stats-grid">
          <div className="np-stat-card">
            <div className="np-stat-card__icon np-bg-blue">
              <Users size={20} />
            </div>
            <div className="np-stat-card__info">
              <span className="np-stat-card__value">{stats.total}</span>
              <span className="np-stat-card__label">Total Records</span>
            </div>
          </div>
          <div className="np-stat-card np-stat-card--success">
            <div className="np-stat-card__icon np-bg-green">
              <CheckCircle size={20} />
            </div>
            <div className="np-stat-card__info">
              <span className="np-stat-card__value">{stats.complete}</span>
              <span className="np-stat-card__label">Complete Records</span>
              <span className="np-stat-card__sub">
                {stats.total > 0 ? ((stats.complete / stats.total) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
          <div className="np-stat-card np-stat-card--critical">
            <div className="np-stat-card__icon np-bg-red">
              <AlertTriangle size={20} />
            </div>
            <div className="np-stat-card__info">
              <span className="np-stat-card__value">{stats.missingCitizenship}</span>
              <span className="np-stat-card__label">Missing/Invalid Citizenship</span>
              <span className="np-stat-card__sub">
                {stats.total > 0 ? ((stats.missingCitizenship / stats.total) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
          <div className="np-stat-card np-stat-card--critical">
            <div className="np-stat-card__icon np-bg-red">
              <AlertTriangle size={20} />
            </div>
            <div className="np-stat-card__info">
              <span className="np-stat-card__value">{stats.missingVoterNumber}</span>
              <span className="np-stat-card__label">Missing/Invalid Voter ID</span>
              <span className="np-stat-card__sub">
                {stats.total > 0 ? ((stats.missingVoterNumber / stats.total) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="np-search-bar">
        <form onSubmit={handleSearch} className="np-search-form">
          <div className="np-search-input-wrapper">
            <Search size={18} className="np-search-icon" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, district, municipality, voter number, etc. (English or Nepali)"
              className="np-search-input"
            />
            {searchTerm && (
              <button type="button" onClick={clearSearch} className="np-search-clear">
                <X size={16} />
              </button>
            )}
          </div>
          <button type="submit" className="np-btn np-btn--red">
            <Search size={16} /> Search
          </button>
          <button 
            type="button" 
            className={`np-btn ${showMissingOnly ? 'np-btn--red' : 'np-btn--ghost'}`}
            onClick={toggleMissingOnly}
          >
            <AlertTriangle size={16} /> 
            {showMissingOnly ? 'Show All' : 'Show Missing Only'}
          </button>
        </form>
        {searchTerm && (
          <p className="np-search-info">
            Showing results for: <strong>"{searchTerm}"</strong> 
            <span className="np-muted"> ({filteredRecords.length} results found)</span>
          </p>
        )}
        {showMissingOnly && !searchTerm && (
          <p className="np-search-info">
            <strong>Showing only records with critical issues</strong>
            <span className="np-muted"> ({filteredRecords.length} records with missing or invalid citizenship/voter ID)</span>
          </p>
        )}
      </div>

      {/* Download Request Section */}
      {showDownloadRequest && (
        <div className="np-download-section">
          <DownloadRequest fileId={activeFileId} />
          <button 
            className="np-btn np-btn--ghost np-btn--sm"
            onClick={toggleDownloadRequest}
          >
            Close
          </button>
        </div>
      )}

      {error && (
        <div className="np-alert np-alert--error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {files.length === 0 ? (
        <div className="np-empty">
          <FileSpreadsheet size={28} />
          <p>No data has been uploaded yet. Check back once the admin adds a spreadsheet.</p>
        </div>
      ) : (
        <>
          {loading ? (
            <InfinityLoader 
              size={40} 
              color="#8B5CF6" 
              text="Loading records..." 
            />
          ) : (
            <>
              <DataTable 
                records={filteredRecords} 
                showMissing={true}
                editingId={editingId}
                editData={editData}
                onEdit={startEdit}
                onEditChange={handleEditChange}
                onSave={saveEdit}
                onCancel={cancelEdit}
                isSaving={isSaving}
                isAdmin={isAdmin}
                onRowClick={handleRecordClick}
                showEnglishLabels={showEnglishLabels}
              />
              {filteredRecords.length === 0 && searchTerm && (
                <div className="np-empty">
                  <p>No records found matching "<strong>{searchTerm}</strong>"</p>
                  <p className="np-muted">Try searching with different keywords or in Nepali/English.</p>
                </div>
              )}
              {filteredRecords.length === 0 && showMissingOnly && !searchTerm && (
                <div className="np-empty">
                  <CheckCircle size={28} color="#22C55E" />
                  <p>No critical issues found!</p>
                  <p className="np-muted">All records have valid citizenship and voter ID information.</p>
                </div>
              )}
            </>
          )}
          
          {filteredRecords.length > 0 && (
            <div className="np-pagination">
              <p className="np-muted">
                Showing {filteredRecords.length} of {stats.total} records
                {showMissingOnly && ` (${stats.missingCitizenship + stats.missingVoterNumber - stats.missingBoth} records with critical issues)`}
              </p>
            </div>
          )}
        </>
      )}

      <RecordModal
        record={selectedRecord}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRecord(null);
        }}
        isAdmin={isAdmin}
        onEdit={startEdit}
        showEnglishLabels={showEnglishLabels}
      />
    </div>
  );
}

export default AllData;
