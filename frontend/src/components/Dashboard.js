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
  Shield,
  Download,
  Clock,
  User,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  RefreshCw,
  BarChart3,
  TrendingUp,
  TrendingDown,
  PieChart
} from 'lucide-react';
import { Link } from 'react-router-dom';
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
  const [activeTab, setActiveTab] = useState('files');
  const [downloadRequests, setDownloadRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [processingRequest, setProcessingRequest] = useState(null);
  const [expandedRequestId, setExpandedRequestId] = useState(null);
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalRecords: 0,
    totalComplete: 0,
    totalMissingCitizenship: 0,
    totalMissingVoterNumber: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    downloadedRequests: 0,
    totalMale: 0,
    totalFemale: 0,
    totalOther: 0
  });
  const [districtStats, setDistrictStats] = useState([]);
  const [showStats, setShowStats] = useState(false);
  const folderInputRef = useRef(null);

  // Fetch files on mount
  useEffect(() => {
    fetchFiles();
    if (isAuthenticated) {
      fetchDownloadRequests();
    }
  }, [isAuthenticated]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await api.getFiles();
      setFiles(response || []);
      
      let totalRecords = 0;
      let totalComplete = 0;
      let totalMissingCitizenship = 0;
      let totalMissingVoterNumber = 0;
      let totalMale = 0;
      let totalFemale = 0;
      let totalOther = 0;
      const districtMap = {};
      
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
          
          // Gender stats
          const gender = (record.gender || '').toLowerCase();
          if (gender === 'male' || gender === 'पुरुष') totalMale++;
          else if (gender === 'female' || gender === 'महिला') totalFemale++;
          else if (gender) totalOther++;
          
          // District stats
          if (record.district) {
            const district = record.district.trim();
            districtMap[district] = (districtMap[district] || 0) + 1;
          }
        });
      }
      
      // Sort district stats
      const sortedDistricts = Object.entries(districtMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));
      
      setDistrictStats(sortedDistricts);
      
      setStats(prev => ({
        ...prev,
        totalFiles: response.length,
        totalRecords,
        totalComplete,
        totalMissingCitizenship,
        totalMissingVoterNumber,
        totalMale,
        totalFemale,
        totalOther
      }));
      
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load files');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDownloadRequests = async () => {
    try {
      setLoadingRequests(true);
      const response = await api.getDownloadRequests();
      setDownloadRequests(response || []);
      
      // Update stats
      const pending = response.filter(r => r.status === 'pending').length;
      const approved = response.filter(r => r.status === 'approved').length;
      const rejected = response.filter(r => r.status === 'rejected').length;
      const downloaded = response.filter(r => r.status === 'downloaded').length;
      
      setStats(prev => ({
        ...prev,
        pendingRequests: pending,
        approvedRequests: approved,
        rejectedRequests: rejected,
        downloadedRequests: downloaded
      }));
      
    } catch (error) {
      console.error('Error fetching download requests:', error);
      toast.error('Failed to load download requests');
    } finally {
      setLoadingRequests(false);
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
      toast.success(`Loaded ${response.records?.length || 0} records`);
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

  const handleApproveRequest = async (id) => {
    setProcessingRequest(id);
    try {
      const response = await api.approveDownload(id);
      toast.success('✅ Download request approved! User has been notified.');
      await fetchDownloadRequests();
      
      // Show token if available
      if (response.downloadToken) {
        console.log('Download token:', response.downloadToken);
      }
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request: ' + (error.response?.data?.message || error.message));
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (id) => {
    const reason = prompt('Enter reason for rejection (optional):');
    setProcessingRequest(id);
    try {
      await api.rejectDownload(id, reason || 'Not specified');
      toast.success('Download request rejected');
      await fetchDownloadRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRefreshRequests = () => {
    fetchDownloadRequests();
    toast.info('Refreshed download requests');
  };

  const toggleRequestExpand = (id) => {
    setExpandedRequestId(expandedRequestId === id ? null : id);
  };

  const displayRecords = searchResults.length > 0 ? searchResults : viewingRecords;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="np-badge np-badge--pending"><Clock size={12} /> Pending</span>;
      case 'approved':
        return <span className="np-badge np-badge--approved"><CheckCircle size={12} /> Approved</span>;
      case 'rejected':
        return <span className="np-badge np-badge--rejected"><XCircle size={12} /> Rejected</span>;
      case 'downloaded':
        return <span className="np-badge np-badge--downloaded"><Download size={12} /> Downloaded</span>;
      default:
        return <span className="np-badge">{status}</span>;
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
        <div className="np-page__head-actions">
          {isAuthenticated && (
            <>
              <button 
                className="np-btn np-btn--ghost np-btn--sm"
                onClick={() => setShowStats(!showStats)}
              >
                <BarChart3 size={16} /> {showStats ? 'Hide Stats' : 'Show Stats'}
              </button>
              <button className="np-btn np-btn--ghost" onClick={logout}>
                <LogOut size={16} /> Log out
              </button>
            </>
          )}
        </div>
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

      {/* Additional Stats when expanded */}
      {showStats && isAuthenticated && (
        <div className="np-stats-expanded">
          <div className="np-stats-expanded__grid">
            <div className="np-stat-card np-stat-card--small">
              <div className="np-stat-card__info">
                <span className="np-stat-card__value">{stats.totalMale}</span>
                <span className="np-stat-card__label">Male</span>
              </div>
            </div>
            <div className="np-stat-card np-stat-card--small">
              <div className="np-stat-card__info">
                <span className="np-stat-card__value">{stats.totalFemale}</span>
                <span className="np-stat-card__label">Female</span>
              </div>
            </div>
            <div className="np-stat-card np-stat-card--small">
              <div className="np-stat-card__info">
                <span className="np-stat-card__value">{stats.totalOther}</span>
                <span className="np-stat-card__label">Other</span>
              </div>
            </div>
            <div className="np-stat-card np-stat-card--small">
              <div className="np-stat-card__info">
                <span className="np-stat-card__value">{stats.totalMissingVoterNumber}</span>
                <span className="np-stat-card__label">Missing Voter #</span>
              </div>
            </div>
          </div>
          
          {districtStats.length > 0 && (
            <div className="np-district-stats">
              <h4>Top Districts</h4>
              <div className="np-district-stats__list">
                {districtStats.map((district, index) => (
                  <div key={index} className="np-district-stat">
                    <span className="np-district-stat__name">{district.name}</span>
                    <div className="np-district-stat__bar">
                      <div 
                        className="np-district-stat__bar-fill" 
                        style={{ width: `${(district.count / stats.totalRecords) * 100}%` }}
                      />
                    </div>
                    <span className="np-district-stat__count">{district.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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

      {/* Tabs */}
      {isAuthenticated && (
        <div className="np-tabs">
          <button 
            className={`np-tab ${activeTab === 'files' ? 'np-tab--active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            <FileSpreadsheet size={16} />
            Files
            <span className="np-tab-badge">{stats.totalFiles}</span>
          </button>
          <button 
            className={`np-tab ${activeTab === 'requests' ? 'np-tab--active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            <Download size={16} />
            Download Requests
            {stats.pendingRequests > 0 && (
              <span className="np-tab-badge np-tab-badge--pending">{stats.pendingRequests}</span>
            )}
          </button>
        </div>
      )}

      {/* Files Tab */}
      {activeTab === 'files' && (
        <>
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
                  <button className="np-search-info__clear" onClick={clearSearch}>
                    <X size={14} /> Clear
                  </button>
                </div>
              )}

              <DataTable records={displayRecords} showMissing={true} />
              
              {displayRecords.length === 0 && searchTerm && (
                <div className="np-empty">
                  <p>No records found matching "<strong>{searchTerm}</strong>"</p>
                </div>
              )}
              
              {displayRecords.length === 0 && !searchTerm && (
                <div className="np-empty">
                  <p>No records found in this file</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Download Requests Tab */}
      {activeTab === 'requests' && isAuthenticated && (
        <div className="np-requests-section">
          <div className="np-requests-section__header">
            <h3 className="np-subhead">Download Requests</h3>
            <div className="np-requests-section__actions">
              <span className="np-requests-stats">
                <span className="np-requests-stat np-requests-stat--pending">
                  {stats.pendingRequests} Pending
                </span>
                <span className="np-requests-stat np-requests-stat--approved">
                  {stats.approvedRequests} Approved
                </span>
                <span className="np-requests-stat np-requests-stat--downloaded">
                  {stats.downloadedRequests} Downloaded
                </span>
                <span className="np-requests-stat np-requests-stat--rejected">
                  {stats.rejectedRequests} Rejected
                </span>
              </span>
              <button 
                className="np-btn np-btn--ghost np-btn--sm"
                onClick={handleRefreshRequests}
                disabled={loadingRequests}
              >
                <RefreshCw size={14} className={loadingRequests ? 'np-spinning' : ''} />
                Refresh
              </button>
            </div>
          </div>

          {loadingRequests ? (
            <InfinityLoader size={30} color="#8B5CF6" text="Loading requests..." />
          ) : downloadRequests.length === 0 ? (
            <div className="np-empty">
              <Download size={28} />
              <p>No download requests yet.</p>
              <p className="np-muted">Users will appear here when they request data downloads.</p>
            </div>
          ) : (
            <div className="np-requests-list">
              {downloadRequests.map((request) => (
                <div 
                  key={request._id} 
                  className={`np-request-item ${expandedRequestId === request._id ? 'np-request-item--expanded' : ''}`}
                >
                  <div className="np-request-item__main">
                    <div className="np-request-item__info">
                      <div className="np-request-item__user">
                        <User size={16} />
                        <strong>{request.name}</strong>
                      </div>
                      <div className="np-request-item__details">
                        <span><Mail size={14} /> {request.email}</span>
                        <span><Phone size={14} /> {request.phone}</span>
                        <span className="np-request-item__date">
                          {formatDate(request.requestDate)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="np-request-item__status">
                      {getStatusBadge(request.status)}
                    </div>

                    {request.status === 'pending' && (
                      <div className="np-request-item__actions">
                        <button 
                          className="np-btn np-btn--red np-btn--sm"
                          onClick={() => handleApproveRequest(request._id)}
                          disabled={processingRequest === request._id}
                        >
                          {processingRequest === request._id ? (
                            <><Loader size={14} className="np-spinning" /> Processing...</>
                          ) : (
                            'Approve'
                          )}
                        </button>
                        <button 
                          className="np-btn np-btn--ghost np-btn--sm"
                          onClick={() => handleRejectRequest(request._id)}
                          disabled={processingRequest === request._id}
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    <button 
                      className="np-request-item__expand"
                      onClick={() => toggleRequestExpand(request._id)}
                    >
                      {expandedRequestId === request._id ? '▲' : '▼'}
                    </button>
                  </div>

                  {/* Expanded details */}
                  {expandedRequestId === request._id && (
                    <div className="np-request-item__expanded">
                      <div className="np-request-item__expanded-grid">
                        <div>
                          <strong>Request ID:</strong>
                          <code>{request._id}</code>
                        </div>
                        <div>
                          <strong>IP Address:</strong>
                          <span>{request.ipAddress || 'Unknown'}</span>
                        </div>
                        <div>
                          <strong>User Agent:</strong>
                          <span className="np-muted">{request.userAgent || 'Unknown'}</span>
                        </div>
                        {request.fileId && (
                          <div>
                            <strong>File:</strong>
                            <span>{request.fileId.name || 'Unknown'}</span>
                          </div>
                        )}
                        {request.status === 'approved' && request.approvedDate && (
                          <div>
                            <strong>Approved Date:</strong>
                            <span>{formatDate(request.approvedDate)}</span>
                          </div>
                        )}
                        {request.status === 'downloaded' && request.downloadedDate && (
                          <div>
                            <strong>Downloaded Date:</strong>
                            <span>{formatDate(request.downloadedDate)}</span>
                          </div>
                        )}
                        {request.status === 'approved' && request.downloadToken && (
                          <div className="np-request-item__token-full">
                            <strong>Download Token:</strong>
                            <code className="np-request-item__token-code">{request.downloadToken}</code>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
