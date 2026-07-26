import React from 'react';

function InfinityLoader({ size = 40, color = '#8B5CF6', text = 'Loading...' }) {
  return (
    <div className="np-infinity-loader" style={{ '--loader-size': size + 'px', '--loader-color': color }}>
      <div className="np-infinity-loader__spinner">
        <svg viewBox="0 0 100 100" className="np-infinity-loader__svg">
          <path 
            d="M50 50 C30 20, 10 20, 10 45 C10 70, 30 80, 50 50 C70 20, 90 20, 90 45 C90 70, 70 80, 50 50 Z" 
            className="np-infinity-loader__path"
          />
        </svg>
      </div>
      {text && <p className="np-infinity-loader__text">{text}</p>}
    </div>
  );
}

export default InfinityLoader;