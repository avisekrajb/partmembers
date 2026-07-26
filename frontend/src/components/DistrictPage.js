import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  FileText, 
  AlertTriangle, 
  CheckCircle,
  MapPin,
  Download,
  Search,
  X
} from 'lucide-react';
import { toast } from 'react-toastify';
import DataTable from './DataTable';
import InfinityLoader from './InfinityLoader';
import { api } from '../services/api';
import * as XLSX from 'xlsx';

function DistrictPage() {
  const { districtName } = useParams();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    complete: 0,
    missingCitizenship: 0,
    missingVoterNumber: 0
  });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchDistrictData = async () => {
      try {
        setLoading(true);
        const decodedName = decodeURIComponent(districtName);
        
        // Fetch all records and filter by district
        const response = await api.getAllRecords({ limit: 10000 });
        const allRecords = response.records || [];
        
        // Filter records for this district (case insensitive, with normalization)
        const filteredRecords = allRecords.filter(record => {
          const recordDistrict = (record.district || '').trim();
          if (!recordDistrict) return false;
          
          // Normalize both for comparison
          const normalizedRecord = recordDistrict.toLowerCase().replace(/[^a-z0-9]/g, '');
          const normalizedSearch = decodedName.toLowerCase().replace(/[^a-z0-9]/g, '');
          
          return normalizedRecord === normalizedSearch || 
                 recordDistrict === decodedName ||
                 recordDistrict.includes(decodedName) ||
                 decodedName.includes(recordDistrict) ||
                 recordDistrict.toLowerCase().includes(decodedName.toLowerCase());
        });

        setRecords(filteredRecords);

        // Calculate stats for this district
        let total = filteredRecords.length;
        let missingCitizenship = 0;
        let missingVoterNumber = 0;
        let complete = 0;

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

        filteredRecords.forEach(record => {
          const voterNumber = record.voterNumber || '';
          const citizenshipNumber = record.citizenshipNumber || '';
          
          const hasCitizenship = citizenshipNumber && citizenshipNumber.trim() !== '' && citizenshipNumber.trim() !== '-' && citizenshipNumber.trim() !== '—';
          const hasVoterNumber = voterNumber && voterNumber.trim() !== '' && voterNumber.trim() !== '-' && voterNumber.trim() !== '—';
          
          const citizenshipValid = hasCitizenship && isValidNumber(citizenshipNumber) && !containsLetters(citizenshipNumber);
          const voterValid = hasVoterNumber && isValidNumber(voterNumber) && !containsLetters(voterNumber);
          
          if (!hasCitizenship || !citizenshipValid) missingCitizenship++;
          if (!hasVoterNumber || !voterValid) missingVoterNumber++;
          if (citizenshipValid && voterValid) complete++;
        });

        setStats({
          total,
          complete,
          missingCitizenship,
          missingVoterNumber
        });
        setError(null);
      } catch (err) {
        console.error('Error fetching district data:', err);
        setError('Failed to load district data');
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };

    if (districtName) {
      fetchDistrictData();
    }
  }, [districtName]);

  const handleSearch = (e) => {
    e.preventDefault();
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      if (records.length === 0) {
        toast.warning('No data to export');
        return;
      }

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
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'District Records');
      
      const filename = `${districtName}_records_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success(`Exported ${records.length} records successfully`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="np-page">
        <InfinityLoader 
          size={50} 
          color="#8B5CF6" 
          text={`Loading ${decodeURIComponent(districtName)} data...`} 
        />
      </div>
    );
  }

  return (
    <div className="np-page np-district-page">
      {/* Header */}
      <div className="np-district-page__header">
        <button 
          className="np-btn np-btn--ghost np-btn--sm"
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={16} /> Back to Home
        </button>
        <div className="np-district-page__title">
          <MapPin size={28} className="np-district-page__icon" />
          <h1>{decodeURIComponent(districtName)}</h1>
          <span className="np-district-page__badge">{stats.total} Members</span>
        </div>
        <div className="np-district-page__actions">
          <button 
            className="np-btn np-btn--sky np-btn--sm"
            onClick={handleExport}
            disabled={exporting || records.length === 0}
          >
            {exporting ? <span className="np-spinning">⟳</span> : <Download size={16} />}
            Export XLSX
          </button>
          <Link to="/data" className="np-btn np-btn--red np-btn--sm">
            View All Data
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {records.length > 0 && (
        <div className="np-stats-grid">
          <div className="np-stat-card np-stat-card--large">
            <div className="np-stat-card__icon np-bg-blue">
              <Users size={24} />
            </div>
            <div className="np-stat-card__info">
              <span className="np-stat-card__value">{stats.total}</span>
              <span className="np-stat-card__label">Total Members</span>
            </div>
          </div>
          <div className="np-stat-card np-stat-card--large np-stat-card--success">
            <div className="np-stat-card__icon np-bg-green">
              <CheckCircle size={24} />
            </div>
            <div className="np-stat-card__info">
              <span className="np-stat-card__value">{stats.complete}</span>
              <span className="np-stat-card__label">Complete Records</span>
              <span className="np-stat-card__sub">
                {stats.total > 0 ? ((stats.complete / stats.total) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
          <div className="np-stat-card np-stat-card--large np-stat-card--critical">
            <div className="np-stat-card__icon np-bg-red">
              <AlertTriangle size={24} />
            </div>
            <div className="np-stat-card__info">
              <span className="np-stat-card__value">{stats.missingCitizenship}</span>
              <span className="np-stat-card__label">Missing/Invalid Citizenship</span>
              <span className="np-stat-card__sub">
                {stats.total > 0 ? ((stats.missingCitizenship / stats.total) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
          <div className="np-stat-card np-stat-card--large np-stat-card--critical">
            <div className="np-stat-card__icon np-bg-red">
              <AlertTriangle size={24} />
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
              placeholder="Search within this district..."
              className="np-search-input"
            />
            {searchTerm && (
              <button type="button" onClick={clearSearch} className="np-search-clear">
                <X size={16} />
              </button>
            )}
          </div>
        </form>
      </div>

      {error && (
        <div className="np-alert np-alert--error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {records.length === 0 ? (
        <div className="np-empty">
          <FileText size={28} />
          <p>No members found in this district.</p>
          <p className="np-muted">Try checking other districts or upload data.</p>
        </div>
      ) : (
        <>
          <DataTable 
            records={records} 
            showMissing={true}
            searchTerm={searchTerm}
          />
          <div className="np-pagination">
            <p className="np-muted">
              Showing {records.length} records from {decodeURIComponent(districtName)}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default DistrictPage;