import React, { useState, useEffect } from 'react';
import { Lock, Shield, AlertCircle, Eye, EyeOff } from 'lucide-react';

function PasswordModal() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

  const CORRECT_PASSWORD = '789456';
  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION = 30; // seconds

  useEffect(() => {
    // Check if already authenticated
    const isAuthenticated = sessionStorage.getItem('websiteAuthenticated');
    if (isAuthenticated === 'true') {
      document.body.style.overflow = 'auto';
      return;
    }

    // Lock body scroll
    document.body.style.overflow = 'hidden';

    // Start lock timer if locked
    let timer;
    if (isLocked && lockTimer > 0) {
      timer = setInterval(() => {
        setLockTimer(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsLocked(false);
            setAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      clearInterval(timer);
    };
  }, [isLocked, lockTimer]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (isLocked) {
      setError(`Too many failed attempts. Please wait ${lockTimer} seconds.`);
      return;
    }

    if (password === CORRECT_PASSWORD) {
      // Correct password
      sessionStorage.setItem('websiteAuthenticated', 'true');
      document.body.style.overflow = 'auto';
      // Force re-render to hide modal
      window.dispatchEvent(new Event('authSuccess'));
      setPassword('');
      setError('');
    } else {
      // Wrong password
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setError(`Incorrect password. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);

      if (newAttempts >= MAX_ATTEMPTS) {
        setIsLocked(true);
        setLockTimer(LOCK_DURATION);
        setError(`Too many failed attempts. Please wait ${LOCK_DURATION} seconds.`);
      }
      setPassword('');
    }
  };

  // Check if authenticated
  const isAuthenticated = sessionStorage.getItem('websiteAuthenticated') === 'true';

  if (isAuthenticated) {
    return null;
  }

  return (
    <>
      <style>{`
        .np-password-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
          animation: passwordFadeIn 0.5s ease;
        }

        @keyframes passwordFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .np-password-modal {
          background: #ffffff;
          border-radius: 24px;
          max-width: 420px;
          width: 100%;
          padding: 40px 36px;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.4);
          position: relative;
          overflow: hidden;
        }

        .np-password-modal::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #E63946, #FF6FA5, #3FB6E8, #8B5CF6);
        }

        .np-password-modal__header {
          text-align: center;
          margin-bottom: 32px;
        }

        .np-password-modal__icon-wrapper {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 72px;
          height: 72px;
          background: linear-gradient(135deg, #FEE2E2, #FEF3C7);
          border-radius: 50%;
          margin-bottom: 16px;
          animation: passwordPulse 2s ease-in-out infinite;
        }

        @keyframes passwordPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .np-password-modal__icon {
          color: #E63946;
        }

        .np-password-modal__title {
          font-family: var(--font-display, 'Baloo 2');
          font-size: 1.6rem;
          margin: 0 0 4px;
          color: var(--ink, #241811);
        }

        .np-password-modal__subtitle {
          color: var(--muted, #7A6F63);
          font-size: 0.9rem;
          margin: 0;
        }

        .np-password-modal__form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .np-password-modal__input-wrapper {
          position: relative;
        }

        .np-password-modal__input {
          width: 100%;
          padding: 14px 16px;
          padding-right: 48px;
          border: 2px solid var(--line, #ECE6DD);
          border-radius: 12px;
          font-size: 1rem;
          transition: all 0.3s ease;
          background: var(--paper-soft, #FBF9F6);
          font-family: var(--font-body, 'Inter');
          letter-spacing: 2px;
        }

        .np-password-modal__input:focus {
          outline: none;
          border-color: #E63946;
          box-shadow: 0 0 0 4px rgba(230, 57, 70, 0.1);
          background: #ffffff;
        }

        .np-password-modal__input::placeholder {
          letter-spacing: 0;
          color: var(--muted, #7A6F63);
        }

        .np-password-modal__input--error {
          border-color: #DC2626;
          background: #FEF2F2;
        }

        .np-password-modal__input--error:focus {
          border-color: #DC2626;
          box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.1);
        }

        .np-password-modal__toggle-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--muted, #7A6F63);
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
        }

        .np-password-modal__toggle-btn:hover {
          background: var(--paper-soft, #FBF9F6);
          color: var(--ink, #241811);
        }

        .np-password-modal__error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: #FEF2F2;
          border: 1px solid #FECACA;
          border-radius: 10px;
          color: #991B1B;
          font-size: 0.85rem;
          animation: passwordShake 0.4s ease;
        }

        @keyframes passwordShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }

        .np-password-modal__error-icon {
          flex-shrink: 0;
        }

        .np-password-modal__btn {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #E63946, #DC2626);
          color: #fff;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-family: var(--font-body, 'Inter');
        }

        .np-password-modal__btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(230, 57, 70, 0.3);
        }

        .np-password-modal__btn:active {
          transform: scale(0.98);
        }

        .np-password-modal__btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .np-password-modal__footer {
          text-align: center;
          margin-top: 16px;
          font-size: 0.75rem;
          color: var(--muted, #7A6F63);
        }

        .np-password-modal__dots {
          display: flex;
          justify-content: center;
          gap: 6px;
          margin-top: 8px;
        }

        .np-password-modal__dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--line, #ECE6DD);
          transition: all 0.3s ease;
        }

        .np-password-modal__dot--active {
          background: #E63946;
          animation: dotPulse 1.5s ease-in-out infinite;
        }

        @keyframes dotPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
        }

        .np-password-modal__lock-timer {
          text-align: center;
          font-size: 0.85rem;
          color: #DC2626;
          font-weight: 600;
          padding: 8px 14px;
          background: #FEF2F2;
          border-radius: 8px;
          border: 1px solid #FECACA;
        }

        @media (max-width: 480px) {
          .np-password-modal {
            padding: 28px 20px;
            border-radius: 20px;
          }

          .np-password-modal__title {
            font-size: 1.3rem;
          }

          .np-password-modal__icon-wrapper {
            width: 60px;
            height: 60px;
          }

          .np-password-modal__icon-wrapper svg {
            width: 28px;
            height: 28px;
          }

          .np-password-modal__input {
            padding: 12px 14px;
            padding-right: 44px;
            font-size: 0.95rem;
          }
        }
      `}</style>

      <div className="np-password-overlay">
        <div className="np-password-modal">
          <div className="np-password-modal__header">
            <div className="np-password-modal__icon-wrapper">
              <Shield size={36} className="np-password-modal__icon" />
            </div>
            <h2 className="np-password-modal__title">🔒 Protected Website</h2>
            <p className="np-password-modal__subtitle">Enter password to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="np-password-modal__form">
            <div className="np-password-modal__input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className={`np-password-modal__input ${error ? 'np-password-modal__input--error' : ''}`}
                disabled={isLocked}
                autoFocus
              />
              <button
                type="button"
                className="np-password-modal__toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && (
              <div className="np-password-modal__error">
                <AlertCircle size={16} className="np-password-modal__error-icon" />
                <span>{error}</span>
              </div>
            )}

            {isLocked && (
              <div className="np-password-modal__lock-timer">
                ⏳ Locked for {lockTimer} seconds
              </div>
            )}

            <button
              type="submit"
              className="np-password-modal__btn"
              disabled={isLocked}
            >
              <Lock size={18} />
              Unlock Website
            </button>

            <div className="np-password-modal__footer">
              <span>🔐 Secure Access</span>
              <div className="np-password-modal__dots">
                <span className="np-password-modal__dot np-password-modal__dot--active" />
                <span className="np-password-modal__dot" />
                <span className="np-password-modal__dot" />
                <span className="np-password-modal__dot" />
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default PasswordModal;
