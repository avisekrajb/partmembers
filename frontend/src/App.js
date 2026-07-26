import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navigation from './components/Navigation';
import Home from './components/Home';
import AllData from './components/AllData';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollButtons from './components/ScrollButtons';
import DistrictPage from './components/DistrictPage';
import DownloadPage from './components/DownloadPage';
import DownloadRequest from './components/DownloadRequest';
import AdminDownloadRequests from './components/AdminDownloadRequests';
import PasswordModal from './components/PasswordModal';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(true);

  useEffect(() => {
    // Check if already authenticated in this session
    const authStatus = sessionStorage.getItem('websiteAuthenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
      setShowPasswordModal(false);
    }

    // Listen for auth success event
    const handleAuthSuccess = () => {
      setIsAuthenticated(true);
      setShowPasswordModal(false);
    };

    window.addEventListener('authSuccess', handleAuthSuccess);

    return () => {
      window.removeEventListener('authSuccess', handleAuthSuccess);
    };
  }, []);

  // Only show password modal if not authenticated
  const shouldShowPasswordModal = !isAuthenticated && showPasswordModal;

  return (
    <BrowserRouter>
      {/* Password Modal - Shows on top of everything */}
      {shouldShowPasswordModal && <PasswordModal />}
      
      <AppContent isAuthenticated={isAuthenticated} />
    </BrowserRouter>
  );
}

function AppContent({ isAuthenticated }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // If password not entered, show nothing (modal is covering everything)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="np-root">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      
      <Navigation 
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <main className="np-main">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/data" element={<AllData />} />
          <Route path="/district/:districtName" element={<DistrictPage />} />
          
          {/* Download Routes */}
          <Route path="/request-download" element={<DownloadRequest />} />
          <Route path="/download/:token" element={<DownloadPage />} />
          
          {/* Admin Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/downloads" 
            element={
              <ProtectedRoute>
                <AdminDownloadRequests />
              </ProtectedRoute>
            } 
          />
          
          {/* Auth Routes */}
          <Route 
            path="/login" 
            element={<Login />} 
          />
          
          {/* 404 Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <ScrollButtons />

      <footer className="np-footer">
        <div className="np-stripe" aria-hidden="true">
          <span className="np-stripe__seg np-bg-red" />
          <span className="np-stripe__seg np-bg-yellow" />
          <span className="np-stripe__seg np-bg-pink" />
          <span className="np-stripe__seg np-bg-sky" />
          <span className="np-stripe__seg np-bg-brown" />
        </div>
        <div className="np-footer__row">
          <div className="np-brand np-brand--footer">
            <span className="np-brand__text">
              NEW <strong>PARTY</strong>
            </span>
          </div>
          <p className="np-muted">
            © {new Date().getFullYear()} Zero Infinity. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
