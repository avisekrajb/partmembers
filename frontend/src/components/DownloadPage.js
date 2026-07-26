import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, CheckCircle, AlertCircle, Loader, Lock } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../services/api';

function DownloadPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking');
  const [message, setMessage] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await api.checkDownloadStatus(token);
        if (response.valid && response.status === 'approved') {
          setStatus('ready');
          setMessage('Your download is ready. Click the button below to download.');
        } else if (response.status === 'downloaded') {
          setStatus('used');
          setMessage('This download link has already been used. Please request a new one.');
        } else if (response.status === 'pending') {
          setStatus('pending');
          setMessage('Your request is still pending approval. You will receive an email once approved.');
        } else if (response.status === 'rejected') {
          setStatus('rejected');
          setMessage('Your download request was rejected. Please contact the administrator.');
        } else {
          setStatus('invalid');
          setMessage('Invalid download token. Please request a new download.');
        }
      } catch (error) {
        console.error('Status check error:', error);
        setStatus('invalid');
        setMessage('Invalid or expired download link. Please request a new download.');
      }
    };

    checkStatus();
  }, [token]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Download the file
      const response = await api.downloadFile(token);
      
      // Create blob and download
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voter_records_watermarked_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Download started!');
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const getStatusContent = () => {
    switch (status) {
      case 'ready':
        return (
          <div className="np-download-page__ready">
            <CheckCircle size={48} className="np-text-green" />
            <h2>Download Ready</h2>
            <p>{message}</p>
            <button 
              className="np-btn np-btn--red"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <>
                  <Loader size={16} className="np-spinning" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Download Now
                </>
              )}
            </button>
            <p className="np-muted np-download-page__note">
              <Lock size={14} />
              File contains Zero Infinity Watermark. Do not share.
            </p>
          </div>
        );
      
      case 'pending':
        return (
          <div className="np-download-page__pending">
            <Clock size={48} className="np-text-yellow" />
            <h2>Pending Approval</h2>
            <p>{message}</p>
            <button 
              className="np-btn np-btn--ghost"
              onClick={() => navigate('/')}
            >
              Return Home
            </button>
          </div>
        );
      
      case 'used':
      case 'invalid':
        return (
          <div className="np-download-page__invalid">
            <AlertCircle size={48} className="np-text-red" />
            <h2>Invalid Link</h2>
            <p>{message}</p>
            <button 
              className="np-btn np-btn--red"
              onClick={() => navigate('/')}
            >
              Request New Download
            </button>
          </div>
        );
      
      case 'rejected':
        return (
          <div className="np-download-page__rejected">
            <XCircle size={48} className="np-text-red" />
            <h2>Request Rejected</h2>
            <p>{message}</p>
            <button 
              className="np-btn np-btn--ghost"
              onClick={() => navigate('/')}
            >
              Contact Administrator
            </button>
          </div>
        );
      
      default:
        return (
          <div className="np-download-page__checking">
            <Loader size={48} className="np-spinning" />
            <h2>Checking...</h2>
            <p>Verifying your download link...</p>
          </div>
        );
    }
  };

  return (
    <div className="np-page np-download-page">
      <div className="np-download-page__container">
        {getStatusContent()}
      </div>
    </div>
  );
}

export default DownloadPage;
