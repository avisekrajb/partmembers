import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

function ScrollButtons() {
  const [showScroll, setShowScroll] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.pageYOffset > 300) {
        setShowScroll(true);
      } else {
        setShowScroll(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  };

  return (
    <div className={`np-scroll-buttons ${showScroll ? 'np-scroll-buttons--visible' : ''}`}>
      <button 
        className="np-scroll-btn np-scroll-btn--top"
        onClick={scrollToTop}
        title="Scroll to top"
      >
        <ChevronUp size={20} />
      </button>
      <button 
        className="np-scroll-btn np-scroll-btn--bottom"
        onClick={scrollToBottom}
        title="Scroll to bottom"
      >
        <ChevronDown size={20} />
      </button>
    </div>
  );
}

export default ScrollButtons;