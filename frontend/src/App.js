import React, { useState } from 'react';
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
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const [mobileOpen, setMobileOpen] = useState(false);

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
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/data" element={<AllData />} />
          <Route path="/district/:districtName" element={<DistrictPage />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/login" 
            element={<Login />} 
          />
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