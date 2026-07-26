import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home as HomeIcon,
  Database,
  LayoutDashboard,
  LogOut,
  Menu,
  X as CloseIcon,
  Shield,
} from 'lucide-react';
import useAuth from '../hooks/useAuth';

const NAV_ITEMS = [
  { key: 'home', label: 'Home', icon: HomeIcon, path: '/' },
  { key: 'data', label: 'All Data', icon: Database, path: '/data' },
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
];

function Navigation({ mobileOpen, setMobileOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, loading, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileOpen(false);
  };

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      <style>{`
        /* ============================================================
           NAVIGATION STYLES - Original Design
           ============================================================ */
        
        /* Header */
        .np-header {
          position: sticky;
          top: 0;
          z-index: 20;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid var(--line, #ECE6DD);
        }

        /* Stripe */
        .np-stripe {
          display: flex;
          width: 100%;
          height: 6px;
        }
        .np-stripe--thin {
          height: 4px;
        }
        .np-stripe__seg {
          flex: 1;
        }
        .np-bg-red { background: #E63946; }
        .np-bg-yellow { background: #FFC93C; }
        .np-bg-pink { background: #FF6FA5; }
        .np-bg-sky { background: #3FB6E8; }
        .np-bg-brown { background: #8B5A2B; }

        /* Header Row */
        .np-header__row {
          max-width: 1120px;
          margin: 0 auto;
          padding: 10px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        /* Brand */
        .np-brand {
          background: none;
          border: none;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 4px;
          text-decoration: none;
          color: var(--ink, #241811);
        }
        .np-brand__text {
          font-family: 'Baloo 2', 'Noto Sans Devanagari', sans-serif;
          font-size: 1.15rem;
          letter-spacing: 0.02em;
          color: var(--ink, #241811);
        }
        .np-brand__text strong {
          color: #E63946;
        }

        /* Desktop Navigation */
        .np-nav--desktop {
          display: none;
          gap: 4px;
        }
        @media (min-width: 860px) {
          .np-nav--desktop {
            display: flex;
          }
        }

        .np-nav__btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          border-radius: 10px;
          padding: 9px 16px;
          font-weight: 600;
          font-size: 0.94rem;
          color: var(--ink, #241811);
          text-decoration: none;
          transition: all 0.15s ease;
          cursor: pointer;
          font-family: 'Inter', 'Noto Sans Devanagari', sans-serif;
        }
        .np-nav__btn:hover {
          background: #FBF9F6;
          transform: translateY(-1px);
        }
        .np-nav__btn--active {
          background: #E63946;
          color: #fff;
        }
        .np-nav__btn--active:hover {
          background: #E63946;
          color: #fff;
        }

        /* Hamburger */
        .np-hamburger {
          background: none;
          border: 1px solid var(--line, #ECE6DD);
          border-radius: 8px;
          padding: 6px;
          display: flex;
          cursor: pointer;
          color: var(--ink, #241811);
        }
        @media (min-width: 860px) {
          .np-hamburger {
            display: none;
          }
        }

        /* Mobile Dropdown */
        .np-nav--mobile-drop {
          display: flex;
          flex-direction: column;
          padding: 8px 20px 14px;
          border-top: 1px solid var(--line, #ECE6DD);
          gap: 4px;
        }
        @media (min-width: 860px) {
          .np-nav--mobile-drop {
            display: none !important;
          }
        }

        /* Bottom Tab Bar */
        .np-tabbar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 30;
          display: flex;
          background: #fff;
          border-top: 1px solid var(--line, #ECE6DD);
          box-shadow: 0 -4px 14px rgba(0, 0, 0, 0.05);
        }
        @media (min-width: 860px) {
          .np-tabbar {
            display: none;
          }
        }

        .np-tabbar__btn {
          flex: 1;
          background: none;
          border: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 8px 4px 10px;
          font-size: 0.68rem;
          font-weight: 600;
          color: var(--muted, #7A6F63);
          text-decoration: none;
          font-family: 'Inter', 'Noto Sans Devanagari', sans-serif;
        }
        .np-tabbar__btn--active {
          color: #E63946;
        }
        .np-tabbar__btn:hover {
          color: #E63946;
        }

        /* Root padding for mobile */
        @media (max-width: 859px) {
          .np-root {
            padding-bottom: 64px;
          }
        }
      `}</style>

      <header className="np-header">
        <div className="np-stripe np-stripe--thin" aria-hidden="true">
          <span className="np-stripe__seg np-bg-red" />
          <span className="np-stripe__seg np-bg-yellow" />
          <span className="np-stripe__seg np-bg-pink" />
          <span className="np-stripe__seg np-bg-sky" />
          <span className="np-stripe__seg np-bg-brown" />
        </div>
        <div className="np-header__row">
          <Link to="/" className="np-brand" onClick={() => setMobileOpen(false)}>
            <span className="np-brand__text">
              NEW <strong>PARTY</strong>
            </span>
          </Link>

          <nav className="np-nav np-nav--desktop">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                to={item.path}
                className={`np-nav__btn ${isActive(item.path) ? 'np-nav__btn--active' : ''}`}
              >
                <item.icon size={17} />
                {item.label}
              </Link>
            ))}
            {!isAuthenticated && !loading ? (
              <Link
                to="/login"
                className={`np-nav__btn ${location.pathname === '/login' ? 'np-nav__btn--active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <Shield size={17} />
                Login
              </Link>
            ) : isAuthenticated ? (
              <button className="np-nav__btn" onClick={handleLogout}>
                <LogOut size={17} />
                Logout
              </button>
            ) : null}
          </nav>

          <button
            className="np-hamburger"
            aria-label="Toggle menu"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <CloseIcon size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileOpen && (
          <nav className="np-nav np-nav--mobile-drop">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                to={item.path}
                className={`np-nav__btn ${isActive(item.path) ? 'np-nav__btn--active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <item.icon size={17} />
                {item.label}
              </Link>
            ))}
            {!isAuthenticated && !loading ? (
              <Link
                to="/login"
                className={`np-nav__btn ${location.pathname === '/login' ? 'np-nav__btn--active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <Shield size={17} />
                Login
              </Link>
            ) : isAuthenticated ? (
              <button className="np-nav__btn" onClick={handleLogout}>
                <LogOut size={17} />
                Logout
              </button>
            ) : null}
          </nav>
        )}
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="np-tabbar">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.key}
            to={item.path}
            className={`np-tabbar__btn ${isActive(item.path) ? 'np-tabbar__btn--active' : ''}`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}

export default Navigation;