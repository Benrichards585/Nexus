import React from 'react';

// Cognizant logo component — renders the actual PNG logo
// variant: 'white' (for dark backgrounds like the header) or 'dark' (for light backgrounds like the sidebar)
export default function CognizantLogo({ variant = 'white', height = 20, className = '' }) {
  const src = variant === 'white'
    ? `${process.env.PUBLIC_URL}/assets/cognizant-logo-white.png`
    : `${process.env.PUBLIC_URL}/assets/cognizant-logo-dark.png`;

  return (
    <img
      src={src}
      alt="Cognizant"
      style={{
        height: `${height}px`,
        width: 'auto',
        objectFit: 'contain',
        display: 'block',
        // The white logo has a navy background that matches our header
        ...(variant === 'white' ? { borderRadius: '2px' } : {}),
      }}
      className={className}
    />
  );
}
