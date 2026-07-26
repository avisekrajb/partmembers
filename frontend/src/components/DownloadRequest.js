import React, { useState } from 'react';
import { Download, Mail, Phone, User, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../services/api';

function DownloadRequest({ fileId = null }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name || !email || !phone) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!email.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }

    setLoading(true);
    try {
      const response = await api.requestDownload({ name, email, phone, fileId });
      toast.success('Request submitted! Check your email for confirmation.');
      setSubmitted(true);
      setName('');
      setEmail('');
      setPhone('');
    } catch (error) {
      console.error('Request error:', error);
      toast.error(error.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="np-download-success">
        <CheckCircle size={48} className="np-download-success__icon" />
        <h3>Request Submitted!</h3>
        <p>Your download request has been sent to the admin.</p>
        <p className="np-muted">You will receive an email once approved.</p>
        <button 
          className="np-btn np-btn--ghost"
          onClick={() => setSubmitted(false)}
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  return (
    <div className="np-download-request">
      <div className="np-download-request__header">
        <Download size={24} />
        <h3>Request Download</h3>
        <p className="np-muted">Enter your details to request access to the data</p>
      </div>

      <form onSubmit={handleSubmit} className="np-download-request__form">
        <div className="np-field">
          <label>
            <User size={16} />
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
            required
            disabled={loading}
          />
        </div>

        <div className="np-field">
          <label>
            <Mail size={16} />
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            disabled={loading}
          />
        </div>

        <div className="np-field">
          <label>
            <Phone size={16} />
            Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="98XXXXXXXX"
            required
            disabled={loading}
          />
        </div>

        <button 
          type="submit" 
          className="np-btn np-btn--red np-btn--block"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader size={16} className="np-spinning" />
              Submitting...
            </>
          ) : (
            <>
              <Download size={16} />
              Request Download
            </>
          )}
        </button>

        <p className="np-download-request__note">
          <AlertCircle size={14} />
          Your request will be reviewed by the admin. You will receive a download link via email once approved.
        </p>
      </form>
    </div>
  );
}

export default DownloadRequest;
