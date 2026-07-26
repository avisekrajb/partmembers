import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Database, 
  LayoutDashboard, 
  Users, 
  MapPin, 
  AlertTriangle, 
  CheckCircle, 
  FileText, 
  HelpCircle, 
  ChevronRight,
  X,
  Download,
  Search,
  Shield
} from 'lucide-react';
import { toast } from 'react-toastify';
import InfinityLoader from './InfinityLoader';
import DataTable from './DataTable';
import DownloadRequest from './DownloadRequest';
import { api } from '../services/api';
import * as XLSX from 'xlsx';

// District name normalization mapping
const DISTRICT_NORMALIZATION = {
  'काठमाडौं': 'काठमाडौं',
  'काठमाडौँ': 'काठमाडौं',
  'काठमाण्डौ': 'काठमाडौं',
  'काठमाडौ': 'काठमाडौं',
  'Kathmandu': 'काठमाडौं',
  'कालिकोट': 'कालिकोट',
  'कालीकोट': 'कालिकोट',
  'Kalikot': 'कालिकोट',
  'काभ्रे': 'काभ्रे',
  'काभ्रे प.': 'काभ्रे',
  'काभ्रेपलाञ्चोक': 'काभ्रे',
  'Kavre': 'काभ्रे',
  'Kavrepalanchok': 'काभ्रे',
  'बागलुङ': 'बागलुङ',
  'बाग्लुङ्ग': 'बागलुङ',
  'Baglung': 'बागलुङ',
  'धनुषा': 'धनुषा',
  'धनुसा': 'धनुषा',
  'Dhanusha': 'धनुषा',
  'सङ्खुवासभा': 'सङ्खुवासभा',
  'संखुवासभा': 'सङ्खुवासभा',
  'Sankhuwasabha': 'सङ्खुवासभा',
  'धादिङ': 'धादिङ',
  'धादिग़': 'धादिङ',
  'Dhading': 'धादिङ',
  'गोरखा': 'गोरखा',
  'गोर्खा': 'गोरखा',
  'Gorkha': 'गोरखा',
  'पाँचथर': 'पाँचथर',
  'पञ्चथर': 'पाँचथर',
  'Panchthar': 'पाँचथर'
};

function Home() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    complete: 0,
    missingCitizenship: 0,
    missingVoterNumber: 0,
    districtStats: [],
    unknownCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [districtRecords, setDistrictRecords] = useState([]);
  const [modalSearch, setModalSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [showDownloadRequest, setShowDownloadRequest] = useState(false);

  const normalizeDistrict = (name) => {
    if (!name || name.trim() === '') return null;
    const trimmed = name.trim();
    if (DISTRICT_NORMALIZATION[trimmed]) {
      return DISTRICT_NORMALIZATION[trimmed];
    }
    const lowerKey = trimmed.toLowerCase();
    for (const [key, value] of Object.entries(DISTRICT_NORMALIZATION)) {
      if (key.toLowerCase() === lowerKey) {
        return value;
      }
    }
    return trimmed;
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await api.getAllRecords({ limit: 10000 });
        const records = response.records || [];
        
        let total = records.length;
        let missingCitizenship = 0;
        let missingVoterNumber = 0;
        let complete = 0;
        const districtMap = {};
        let unknownCount = 0;

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
          
          if (!hasCitizenship || !citizenshipValid) missingCitizenship++;
          if (!hasVoterNumber || !voterValid) missingVoterNumber++;
          if (citizenshipValid && voterValid) complete++;
          
          let district = record.district || '';
          district = district.trim();
          
          const normalizedDistrict = normalizeDistrict(district);
          
          if (!normalizedDistrict || normalizedDistrict === '' || normalizedDistrict === '-' || normalizedDistrict === '—') {
            district = 'Unknown';
            unknownCount++;
          } else {
            district = normalizedDistrict;
          }
          
          if (!districtMap[district]) {
            districtMap[district] = {
              name: district,
              total: 0,
              complete: 0,
              missingCitizenship: 0,
              missingVoterNumber: 0,
              records: []
            };
          }
          districtMap[district].total++;
          if (!hasCitizenship || !citizenshipValid) districtMap[district].missingCitizenship++;
          if (!hasVoterNumber || !voterValid) districtMap[district].missingVoterNumber++;
          if (citizenshipValid && voterValid) districtMap[district].complete++;
          districtMap[district].records.push(record);
        });

        const districtStats = Object.values(districtMap)
          .sort((a, b) => b.total - a.total);

        setStats({
          total,
          complete,
          missingCitizenship,
          missingVoterNumber,
          districtStats,
          unknownCount
        });
        setError(null);
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('Failed to load statistics. Please check your connection.');
        setStats({
          total: 0,
          complete: 0,
          missingCitizenship: 0,
          missingVoterNumber: 0,
          districtStats: [],
          unknownCount: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleDistrictClick = (district) => {
    setSelectedDistrict(district);
    setDistrictRecords(district.records || []);
    setModalSearch('');
    setIsModalOpen(true);
    setShowDownloadRequest(false);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedDistrict(null);
    setDistrictRecords([]);
    setModalSearch('');
    setShowDownloadRequest(false);
    document.body.style.overflow = 'auto';
  };

  const handleOpenDownloadRequest = () => {
    setShowDownloadRequest(!showDownloadRequest);
  };

  const handleExport = async () => {
    if (districtRecords.length === 0) {
      toast.warning('No data to export');
      return;
    }

    setExporting(true);
    try {
      const exportData = districtRecords.map(record => ({
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
      
      const filename = `${selectedDistrict.name}_records_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success(`Exported ${districtRecords.length} records successfully`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const getFilteredModalRecords = () => {
    if (!modalSearch || modalSearch.trim() === '') return districtRecords;
    const term = modalSearch.toLowerCase().trim();
    return districtRecords.filter(record => {
      return Object.values(record).some(value => {
        if (!value) return false;
        return String(value).toLowerCase().includes(term);
      });
    });
  };

  const filteredModalRecords = getFilteredModalRecords();

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isModalOpen) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isModalOpen]);

  if (loading) {
    return (
      <div className="np-page">
        <InfinityLoader 
          size={50} 
          color="#8B5CF6" 
          text="Loading statistics..." 
        />
      </div>
    );
  }

  return (
    <div className="np-page np-home">
      <section className="np-hero">
        <div className="np-hero__mark">
          <h1 className="np-hero__title">
            NEW <span className="np-hero__title-accent">PARTY</span>
          </h1>
        </div>
        <p className="np-eyebrow">जनताको आवाज · जनताको दल</p>
        <p className="np-hero__tagline">
          A ward-by-ward record of the people we serve — every name, every
          vote, every voice, kept in one place and open for anyone to check.
        </p>
        <div className="np-hero__cta">
          <Link to="/data" className="np-btn np-btn--red">
            <Database size={18} /> View All Data
          </Link>
          <Link to="/dashboard" className="np-btn np-btn--ghost">
            <LayoutDashboard size={18} /> Admin Dashboard
          </Link>
          <Link to="/request-download" className="np-btn np-btn--sky">
            <Download size={18} /> Request Download
          </Link>
        </div>
      </section>

      {!error && stats.total > 0 && (
        <section className="np-stats-section">
          <h2 className="np-section-title">Overall Statistics</h2>
          
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
                  {(stats.total > 0 ? ((stats.complete / stats.total) * 100).toFixed(1) : 0)}% of total
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
                  {(stats.total > 0 ? ((stats.missingCitizenship / stats.total) * 100).toFixed(1) : 0)}% of total
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
                  {(stats.total > 0 ? ((stats.missingVoterNumber / stats.total) * 100).toFixed(1) : 0)}% of total
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {!error && stats.districtStats.length > 0 && (
        <section className="np-district-section">
          <h2 className="np-section-title">
            <MapPin size={20} /> District-wise Members
            {stats.unknownCount > 0 && (
              <span className="np-section-badge">
                <HelpCircle size={16} />
                {stats.unknownCount} unknown
              </span>
            )}
          </h2>
          
          <div className="np-district-grid">
            {stats.districtStats.map((district) => (
              <div 
                key={district.name} 
                className={`np-district-card ${district.name === 'Unknown' ? 'np-district-card--unknown' : ''} np-district-card--clickable`}
                onClick={() => handleDistrictClick(district)}
              >
                <div className="np-district-card__header">
                  <h3>
                    {district.name === 'Unknown' ? (
                      <span className="np-district-card__unknown-label">
                        <HelpCircle size={16} /> Unknown District
                      </span>
                    ) : (
                      district.name
                    )}
                  </h3>
                  <div className="np-district-card__header-right">
                    <span className="np-district-card__total">{district.total} members</span>
                    <ChevronRight size={16} className="np-district-card__arrow" />
                  </div>
                </div>
                <div className="np-district-card__stats">
                  <div className="np-district-card__stat">
                    <span className="np-district-card__stat-label">Complete</span>
                    <span className="np-district-card__stat-value np-text-green">
                      {district.complete}
                    </span>
                  </div>
                  <div className="np-district-card__stat">
                    <span className="np-district-card__stat-label">Missing Citizenship</span>
                    <span className="np-district-card__stat-value np-text-red">
                      {district.missingCitizenship}
                    </span>
                  </div>
                  <div className="np-district-card__stat">
                    <span className="np-district-card__stat-label">Missing Voter ID</span>
                    <span className="np-district-card__stat-value np-text-red">
                      {district.missingVoterNumber}
                    </span>
                  </div>
                </div>
                <div className="np-district-card__progress">
                  <div 
                    className="np-district-card__progress-bar"
                    style={{
                      width: `${district.total > 0 ? ((district.complete / district.total) * 100) : 0}%`,
                      background: district.complete === district.total ? '#22C55E' : 
                                 district.name === 'Unknown' ? '#8B5CF6' : '#EAB308'
                    }}
                  />
                </div>
                <div className="np-district-card__completion">
                  {district.total > 0 ? ((district.complete / district.total) * 100).toFixed(0) : 0}% Complete
                  {district.name === 'Unknown' && (
                    <span className="np-district-card__unknown-hint">
                      (District not specified)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {error && (
        <div className="np-alert np-alert--error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* District Modal */}
      {isModalOpen && selectedDistrict && (
        <>
          <style>{`
            .np-modal-overlay {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0, 0, 0, 0.5);
              backdrop-filter: blur(8px);
              display: flex;
              align-items: flex-end;
              justify-content: center;
              z-index: 1000;
              padding: 0;
              animation: overlayFadeIn 0.3s ease;
              cursor: pointer;
            }

            @keyframes overlayFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }

            .np-modal {
              background: #ffffff;
              border-radius: 24px 24px 0 0;
              max-width: 900px;
              width: 100%;
              max-height: 92vh;
              display: flex;
              flex-direction: column;
              animation: slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1);
              cursor: default;
              box-shadow: 0 -20px 60px rgba(0, 0, 0, 0.15);
            }

            @keyframes slideUp {
              from { transform: translateY(100%); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }

            @media (min-width: 768px) {
              .np-modal-overlay {
                align-items: center;
                padding: 20px;
              }
              .np-modal {
                border-radius: 24px;
                max-height: 90vh;
                animation: modalZoomIn 0.3s cubic-bezier(0.22, 1, 0.36, 1);
              }
              @keyframes modalZoomIn {
                from { transform: scale(0.9); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
              }
            }

            @media (max-width: 767px) {
              .np-modal-overlay {
                align-items: flex-end;
              }
              .np-modal {
                border-radius: 24px 24px 0 0;
                max-height: 92vh;
              }
            }

            .np-modal__header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 16px 24px;
              border-bottom: 1px solid var(--line, #ECE6DD);
              position: sticky;
              top: 0;
              background: #fff;
              border-radius: 24px 24px 0 0;
              z-index: 10;
              flex-shrink: 0;
              flex-wrap: wrap;
              gap: 10px;
            }

            .np-modal__title-group {
              display: flex;
              align-items: center;
              gap: 12px;
              flex: 1;
              min-width: 0;
            }

            .np-modal__icon {
              color: var(--sky, #3FB6E8);
              flex-shrink: 0;
            }

            .np-modal__title {
              font-family: var(--font-display, 'Baloo 2');
              font-size: 1.3rem;
              margin: 0;
              color: var(--ink, #241811);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .np-modal__badge {
              background: var(--sky, #3FB6E8);
              color: #fff;
              padding: 2px 12px;
              border-radius: 20px;
              font-size: 0.7rem;
              font-weight: 600;
              flex-shrink: 0;
            }

            .np-modal__actions {
              display: flex;
              gap: 8px;
              align-items: center;
              flex-shrink: 0;
            }

            .np-modal__close-btn {
              background: var(--paper-soft, #FBF9F6);
              border: none;
              padding: 8px;
              border-radius: 50%;
              cursor: pointer;
              color: var(--muted, #7A6F63);
              transition: all 0.2s ease;
              display: flex;
              align-items: center;
              justify-content: center;
              width: 36px;
              height: 36px;
            }

            .np-modal__close-btn:hover {
              background: #FEE2E2;
              color: #DC2626;
              transform: rotate(90deg);
            }

            .np-modal__body {
              padding: 16px 24px 24px;
              overflow-y: auto;
              flex: 1;
              -webkit-overflow-scrolling: touch;
            }

            .np-modal-search {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 16px;
              flex-wrap: wrap;
            }

            .np-modal-search .np-search-input-wrapper {
              flex: 1;
              min-width: 180px;
            }

            .np-modal-search-count {
              font-size: 0.8rem;
              color: var(--muted, #7A6F63);
              white-space: nowrap;
              font-weight: 500;
            }

            .np-modal-table-wrap {
              overflow: auto;
              -webkit-overflow-scrolling: touch;
            }

            .np-modal-table-wrap .np-table-wrap {
              border: none;
              border-radius: 0;
            }
          `}</style>

          <div className="np-modal-overlay" onClick={closeModal}>
            <div className="np-modal" onClick={(e) => e.stopPropagation()}>
              <div className="np-modal__header">
                <div className="np-modal__title-group">
                  <MapPin size={24} className="np-modal__icon" />
                  <h3 className="np-modal__title">{selectedDistrict.name}</h3>
                  <span className="np-modal__badge">{districtRecords.length} Members</span>
                </div>
                <div className="np-modal__actions">
                  <button 
                    className="np-btn np-btn--sky np-btn--sm"
                    onClick={handleOpenDownloadRequest}
                  >
                    <Download size={16} />
                    Request
                  </button>
                  <button 
                    className="np-btn np-btn--sky np-btn--sm"
                    onClick={handleExport}
                    disabled={exporting || districtRecords.length === 0}
                  >
                    {exporting ? <span className="np-spinning">⟳</span> : <Download size={16} />}
                    Export
                  </button>
                  <button className="np-modal__close-btn" onClick={closeModal}>
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="np-modal__body">
                {showDownloadRequest ? (
                  <DownloadRequest fileId={selectedDistrict._id} />
                ) : (
                  <>
                    <div className="np-modal-search">
                      <div className="np-search-input-wrapper">
                        <Search size={16} className="np-search-icon" />
                        <input
                          type="text"
                          value={modalSearch}
                          onChange={(e) => setModalSearch(e.target.value)}
                          placeholder="Search within this district..."
                          className="np-search-input np-search-input--small"
                        />
                        {modalSearch && (
                          <button 
                            type="button" 
                            onClick={() => setModalSearch('')} 
                            className="np-search-clear"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <span className="np-modal-search-count">
                        {filteredModalRecords.length} records
                      </span>
                    </div>

                    {filteredModalRecords.length === 0 ? (
                      <div className="np-empty">
                        <FileText size={28} />
                        <p>No records found in this district.</p>
                        {modalSearch && <p className="np-muted">No results for "{modalSearch}"</p>}
                      </div>
                    ) : (
                      <div className="np-modal-table-wrap">
                        <DataTable 
                          records={filteredModalRecords} 
                          showMissing={true}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Home;
