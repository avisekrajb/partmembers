import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, User, Mail, Phone, Download, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../services/api';

function AdminDownloadRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await api.getDownloadRequests();
      setRequests(response || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load download requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setProcessing(id);
    try {
      await api.approveDownload(id);
      toast.success('Download request approved! User has been notified.');
      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Enter reason for rejection (optional):');
    setProcessing(id);
    try {
      await api.rejectDownload(id, reason || 'Not specified');
      toast.success('Download request rejected');
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    } finally {
      setProcessing(null);
    }
  };

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

  if (loading) {
    return (
      <div className="np-loading">
        <div className="np-loading__spinner"></div>
        <p>Loading download requests...</p>
      </div>
    );
  }

  return (
    <div className="np-admin-downloads">
      <div className="np-admin-downloads__header">
        <h3>Download Requests</h3>
        <button className="np-btn np-btn--ghost np-btn--sm" onClick={fetchRequests}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="np-empty">
          <Download size={28} />
          <p>No download requests yet.</p>
        </div>
      ) : (
        <div className="np-requests-list">
          {requests.map((request) => (
            <div key={request._id} className="np-request-item">
              <div className="np-request-item__info">
                <div className="np-request-item__user">
                  <User size={16} />
                  <strong>{request.name}</strong>
                </div>
                <div className="np-request-item__details">
                  <span><Mail size={14} /> {request.email}</span>
                  <span><Phone size={14} /> {request.phone}</span>
                  <span className="np-request-item__date">
                    {new Date(request.requestDate).toLocaleDateString()}
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
                    onClick={() => handleApprove(request._id)}
                    disabled={processing === request._id}
                  >
                    {processing === request._id ? 'Processing...' : 'Approve'}
                  </button>
                  <button 
                    className="np-btn np-btn--ghost np-btn--sm"
                    onClick={() => handleReject(request._id)}
                    disabled={processing === request._id}
                  >
                    Reject
                  </button>
                </div>
              )}

              {request.status === 'approved' && request.downloadToken && (
                <div className="np-request-item__token">
                  <span className="np-muted">Token: </span>
                  <code>{request.downloadToken.substring(0, 16)}...</code>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminDownloadRequests;
