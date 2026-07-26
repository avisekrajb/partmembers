import React, { useState } from 'react';
import { Download, Mail, Phone, User, CheckCircle, AlertCircle, Loader, Shield, Lock } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../services/api';

function DownloadRequest({ fileId = null, onApproval = null, onClose = null }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState(null);
  const [error, setError] = useState('');

  const validateForm = () => {
    if (!name || !name.trim()) {
      setError('Please enter your full name');
      return false;
    }

    if (!email || !email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address');
      return false;
    }

    const phoneClean = phone.replace(/\s/g, '');
    if (!phoneClean || phoneClean.length < 10) {
      setError('Please enter a valid phone number (minimum 10 digits)');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.requestDownload({ 
        name: name.trim(), 
        email: email.trim().toLowerCase(), 
        phone: phone.trim(), 
        fileId 
      });
      
      toast.success('Download request submitted successfully!');
      setRequestId(response.requestId);
      setSubmitted(true);
      
      // If onApproval is provided and we have a token
      if (onApproval && response.downloadToken) {
        onApproval(response.downloadToken);
      }
      
      // Clear form
      setName('');
      setEmail('');
      setPhone('');
      
    } catch (error) {
      console.error('Request error:', error);
      
      // Handle different error types
      let errorMsg = 'Failed to submit request. Please try again.';
      
      if (error.message) {
        errorMsg = error.message;
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.response?.data?.errors) {
        const errors = Object.values(error.response.data.errors).join(', ');
        errorMsg = `Validation error: ${errors}`;
      }
      
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="np-download-success">
        <div className="np-download-success__icon-wrapper">
          <CheckCircle size={48} className="np-download-success__icon" />
        </div>
        <h3>Request Submitted!</h3>
        <p>Your download request has been sent to the admin for review.</p>
        <div className="np-download-success__info">
          <Shield size={16} />
          <span>Request ID: <strong>{requestId || 'Processing...'}</strong></span>
        </div>
        <div className="np-download-success__steps">
          <div className="np-download-success__step">
            <span className="np-download-success__step-number">1</span>
            <span>Request submitted to admin</span>
          </div>
          <div className="np-download-success__step">
            <span className="np-download-success__step-number">2</span>
            <span>Admin reviews your request</span>
          </div>
          <div className="np-download-success__step">
            <span className="np-download-success__step-number">3</span>
            <span>You receive approval email with download link</span>
          </div>
        </div>
        <p className="np-muted np-download-success__note">
          <Lock size={14} />
          Your data will be watermarked for security. Do not share.
        </p>
        {onClose && (
          <button 
            className="np-btn np-btn--ghost"
            onClick={onClose}
          >
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="np-download-request">
      <div className="np-download-request__header">
        <div className="np-download-request__icon-wrapper">
          <Download size={28} />
        </div>
        <h3>Request Data Download</h3>
        <p className="np-muted">Enter your details to request access to the voter data</p>
        <div className="np-download-request__security">
          <Shield size={14} />
          <span>Data is watermarked and tracked</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="np-download-request__form">
        <div className="np-field">
          <label>
            <User size={16} />
            Full Name <span className="np-field__required">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
            required
            disabled={loading}
            className={error && !name ? 'np-field__error' : ''}
          />
        </div>

        <div className="np-field">
          <label>
            <Mail size={16} />
            Email Address <span className="np-field__required">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            disabled={loading}
            className={error && !email ? 'np-field__error' : ''}
          />
        </div>

        <div className="np-field">
          <label>
            <Phone size={16} />
            Phone Number <span className="np-field__required">*</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="98XXXXXXXX"
            required
            disabled={loading}
            className={error && !phone ? 'np-field__error' : ''}
          />
        </div>

        {error && (
          <div className="np-alert np-alert--error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <button 
          type="submit" 
          className="np-btn np-btn--red np-btn--block"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader size={16} className="np-spinning" />
              Submitting Request...
            </>
          ) : (
            <>
              <Download size={16} />
              Request Download
            </>
          )}
        </button>

        <div className="np-download-request__footer">
          <p className="np-download-request__note">
            <AlertCircle size={14} />
            Your request will be reviewed by the admin. You will receive a download link via email once approved.
          </p>
          <div className="np-download-request__features">
            <span>🔒 Watermarked</span>
            <span>📧 Email notification</span>
            <span>⏱️ One-time download</span>
          </div>
        </div>
      </form>
    </div>
  );
}

export default DownloadRequest;
