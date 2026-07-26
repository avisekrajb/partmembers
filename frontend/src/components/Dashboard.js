import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Eye, 
  Trash2, 
  FolderUp, 
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  LogOut,
  Loader,
  Search,
  X,
  Users,
  FileText,
  AlertTriangle,
  Shield
} from 'lucide-react';
import { toast } from 'react-toastify';
import DataTable from './DataTable';
import InfinityLoader from './InfinityLoader';
import { api } from '../services/api';
import useAuth from '../hooks/useAuth';

function Dashboard() {
  const { logout, isAuthenticated } = useAuth();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewingFileId, setViewingFileId] = useState(null);
  const [viewingRecords, setViewingRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [status, setStatus] = useState(null);
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalRecords: 0,
    totalComplete: 0,
    totalMissingCitizenship: 0,
    totalMissingVoterNumber: 0
  });
  const folderInputRef = useRef(null);

  // Fetch files on mount
  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await api.getFiles();
      setFiles(response || []);
      
      let totalRecords = 0;
      let totalComplete = 0;
      let totalMissingCitizenship = 0;
      let totalMissingVoterNumber = 0;
      
      response.forEach(file => {
        totalRecords += file.rowCount || 0;
      });
      
      if (response.length > 0) {
        const recordsResponse = await api.getAllRecords({ limit: 10000 });
        const records = recordsResponse.records || [];
        
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

        records.forEach(record => {
          const voterNumber = record.voterNumber || '';
          const citizenshipNumber = record.citizenshipNumber || '';
          
          const hasCitizenship = citizenshipNumber && citizenshipNumber.trim() !== '' && citizenshipNumber.trim() !== '-' && citizenshipNumber.trim() !== '—';
          const hasVoterNumber = voterNumber && voterNumber.trim() !== '' && voterNumber.trim() !== '-' && voterNumber.trim() !== '—';
          
          const citizenshipValid = hasCitizenship && isValidNumber(citizenshipNumber) && !containsLetters(citizenshipNumber);
          const voterValid = hasVoterNumber && isValidNumber(voterNumber) && !containsLetters(voterNumber);
          
          if (!hasCitizenship || !citizenshipValid) totalMissingCitizenship++;
          if (!hasVoterNumber || !voterValid) totalMissingVoterNumber++;
          if (citizenshipValid && voterValid) totalComplete++;
        });
      }
      
      setStats({
        totalFiles: response.length,
        totalRecords,
        totalComplete,
        totalMissingCitizenship,
        totalMissingVoterNumber
      });
      
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load files');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderUpload = async (e) => {
    if (!isAuthenticated) {
      toast.error('Please login to upload files');
      return;
    }

    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const excelFiles = files.filter(f => 
      /\.(xlsx|xls)$/i.test(f.name)
    );

    if (excelFiles.length === 0) {
      toast.error('No Excel files (.xlsx or .xls) found in the selected folder');
      e.target.value = '';
      return;
    }

    setUploading(true);
    setStatus(null);

    try {
      const formData = new FormData();
      excelFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await api.uploadFiles(formData);
      
      if (response.results && response.results.length > 0) {
        toast.success(`Successfully uploaded ${response.results.length} file(s)`);
        setStatus({
          kind: 'success',
          message: `${response.results.length} spreadsheet(s) added successfully`
        });
      }

      if (response.errors && response.errors.length > 0) {
        toast.error(`${response.errors.length} file(s) failed to upload`);
        setStatus(prev => ({
          ...prev,
          message: (prev?.message || '') + ` · ${response.errors.length} failed`
        }));
      }

      await fetchFiles();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload files');
      setStatus({
        kind: 'error',
        message: error.response?.data?.message || 'Upload failed'
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleView = async (fileId) => {
    if (viewingFileId === fileId) {
      setViewingFileId(null);
      setViewingRecords([]);
      setSearchTerm('');
      setSearchResults([]);
      return;
    }

    try {
      setViewingFileId(fileId);
      const response = await api.getRecordsByFileId(fileId);
      setViewingRecords(response.records || []);
      setSearchTerm('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error viewing records:', error);
      toast.error('Failed to load records');
      setViewingFileId(null);
    }
  };

  const handleSearchInView = async (e) => {
    e.preventDefault();
    const term = searchTerm.trim();
    if (!term || term.length < 1) {
      toast.info('Please enter a search term');
      return;
    }

    setIsSearching(true);
    try {
      const response = await api.searchRecords(term);
      setSearchResults(response.records || []);
      if (response.records.length === 0) {
        toast.info('No records found matching your search');
      } else {
        toast.success(`Found ${response.records.length} records`);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleDelete = async (fileId) => {
    if (!isAuthenticated) {
      toast.error('Please login to delete files');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this file and all its records?')) {
      return;
    }

    try {
      await api.deleteFile(fileId);
      toast.success('File deleted successfully');
      
      if (viewingFileId === fileId) {
        setViewingFileId(null);
        setViewingRecords([]);
        setSearchResults([]);
      }
      
      await fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const displayRecords = searchResults.length > 0 ? searchResults : viewingRecords;

  if (loading) {
    return (
      <div className="np-page">
        <InfinityLoader 
          size={50} 
          color="#8B5CF6" 
          text="Loading dashboard..." 
        />
      </div>
    );
  }

  return (
    <div className="np-page">
      <div className="np-page__head">
        <div>
          <h2>Dashboard</h2>
          <p className="np-muted">
            {isAuthenticated ? 'Upload and manage voter data' : 'View all uploaded data (Login to upload/delete)'}
          </p>
        </div>
        {isAuthenticated && (
          <button className="np-btn np-btn--ghost" onClick={logout}>
            <LogOut size={16} /> Log out
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="np-stats-grid">
        <div className="np-stat-card">
          <div className="np-stat-card__icon np-bg-blue">
            <FileSpreadsheet size={20} />
          </div>
          <div className="np-stat-card__info">
            <span className="np-stat-card__value">{stats.totalFiles}</span>
            <span className="np-stat-card__label">Total Files</span>
          </div>
        </div>
        <div className="np-stat-card">
          <div className="np-stat-card__icon np-bg-sky">
            <Users size={20} />
          </div>
          <div className="np-stat-card__info">
            <span className="np-stat-card__value">{stats.totalRecords}</span>
            <span className="np-stat-card__label">Total Records</span>
          </div>
        </div>
        <div className="np-stat-card np-stat-card--success">
          <div className="np-stat-card__icon np-bg-green">
            <CheckCircle2 size={20} />
          </div>
          <div className="np-stat-card__info">
            <span className="np-stat-card__value">{stats.totalComplete}</span>
            <span className="np-stat-card__label">Complete Records</span>
          </div>
        </div>
        <div className="np-stat-card np-stat-card--critical">
          <div className="np-stat-card__icon np-bg-red">
            <AlertTriangle size={20} />
          </div>
          <div className="np-stat-card__info">
            <span className="np-stat-card__value">{stats.totalMissingCitizenship}</span>
            <span className="np-stat-card__label">Missing/Invalid Citizenship</span>
          </div>
        </div>
      </div>

      {/* Upload zone - Only for authenticated users */}
      {isAuthenticated ? (
        <div className="np-dropzone">
          <FolderUp size={30} />
          <div>
            <p className="np-dropzone__title">Upload a folder of spreadsheets</p>
            <p className="np-muted">Only files ending in .xlsx or .xls are read. Max file size: 100MB each.</p>
          </div>
          <button
            className="np-btn np-btn--red"
            onClick={() => folderInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader size={16} className="np-spinning" /> Uploading...
              </>
            ) : (
              <>
                <Upload size={16} /> Choose folder
              </>
            )}
          </button>
          <input
            ref={folderInputRef}
            type="file"
            accept=".xlsx,.xls"
            webkitdirectory="true"
            directory="true"
            multiple
            hidden
            onChange={handleFolderUpload}
          />
        </div>
      ) : (
        <div className="np-alert np-alert--info">
          <Shield size={18} />
          <span>Login to upload new spreadsheets. <Link to="/login" className="np-alert__link">Login here</Link></span>
        </div>
      )}

      {status && (
        <div className={`np-alert np-alert--${status.kind}`}>
          {status.kind === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{status.message}</span>
        </div>
      )}

      {/* File list */}
      <h3 className="np-subhead">Uploaded spreadsheets</h3>

      {files.length === 0 ? (
        <div className="np-empty">
          <FileSpreadsheet size={28} />
          <p>Nothing uploaded yet. {isAuthenticated ? 'Choose a folder above to get started.' : 'Login to upload files.'}</p>
        </div>
      ) : (
        <div className="np-filelist">
          {files.map((file) => (
            <div className="np-filerow" key={file.id || file._id}>
              <FileSpreadsheet size={20} className="np-filerow__icon" />
              <div className="np-filerow__meta">
                <span className="np-filerow__name">{file.name}</span>
                <span className="np-muted">
                  {file.rowCount || 0} records · 
                  added {file.uploadDate ? new Date(file.uploadDate).toLocaleDateString() : 'recently'}
                </span>
              </div>
              <button 
                className="np-btn np-btn--sky np-btn--sm" 
                onClick={() => handleView(file._id || file.id)}
              >
                <Eye size={15} /> 
                {viewingFileId === (file._id || file.id) ? 'Hide' : 'View'}
              </button>
              {isAuthenticated && (
                <button 
                  className="np-btn np-btn--outline-red np-btn--sm" 
                  onClick={() => handleDelete(file._id || file.id)}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* View panel */}
      {viewingFileId && (
        <div className="np-view-panel">
          <div className="np-view-panel__header">
            <h3 className="np-subhead">Records Preview</h3>
            
            <form onSubmit={handleSearchInView} className="np-search-form np-search-form--inline">
              <div className="np-search-input-wrapper">
                <Search size={16} className="np-search-icon" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search in these records (English/Nepali)"
                  className="np-search-input np-search-input--small"
                />
                {searchTerm && (
                  <button type="button" onClick={clearSearch} className="np-search-clear">
                    <X size={14} />
                  </button>
                )}
              </div>
              <button type="submit" className="np-btn np-btn--red np-btn--sm" disabled={isSearching}>
                {isSearching ? <Loader size={14} className="np-spinning" /> : <Search size={14} />}
                Search
              </button>
            </form>
          </div>

          {searchResults.length > 0 && (
            <div className="np-search-info">
              Found <strong>{searchResults.length}</strong> records matching "<strong>{searchTerm}</strong>"
            </div>
          )}

          <DataTable records={displayRecords} showMissing={true} />
          
          {displayRecords.length === 0 && searchTerm && (
            <div className="np-empty">
              <p>No records found matching "<strong>{searchTerm}</strong>"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Dashboard;