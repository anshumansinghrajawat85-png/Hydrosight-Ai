import React from 'react';

/**
 * Unified HydroSight AI Brand Mark
 * Combines a precision water droplet, subterranean aquifer strata waves, and neural network nodes.
 * Used consistently across Header, Hero, Reports, and Floating AI Assistant.
 */
export const HydroSightLogo: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 38,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="HydroSight AI Brand Logo"
    >
      <defs>
        <linearGradient id="hsBgGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#082F49" />
          <stop offset="55%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#042F2E" />
        </linearGradient>
        <linearGradient id="hsDropGrad" x1="16" y1="8" x2="48" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
        <linearGradient id="hsWaveGrad" x1="14" y1="38" x2="50" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
      </defs>

      {/* Outer Precision Squircle Frame */}
      <rect
        x="3"
        y="3"
        width="58"
        height="58"
        rx="16"
        fill="url(#hsBgGrad)"
        stroke="url(#hsDropGrad)"
        strokeWidth="2"
      />

      {/* Inner Subtle Grid Ring */}
      <circle
        cx="32"
        cy="34"
        r="21"
        stroke="#0EA5E9"
        strokeOpacity="0.18"
        strokeWidth="1"
        strokeDasharray="3 3"
      />

      {/* Main Hydrological Droplet Silhouette */}
      <path
        d="M32 9C32 9 14 27.5 14 39.5C14 49.4411 22.0589 56.5 32 56.5C41.9411 56.5 50 49.4411 50 39.5C50 27.5 32 9 32 9Z"
        fill="url(#hsDropGrad)"
        fillOpacity="0.2"
        stroke="url(#hsDropGrad)"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />

      {/* Underground Aquifer Stratigraphy Waves inside the Lower Droplet */}
      <path
        d="M16.5 40.5C21 37.5 26.5 43.5 32 40.5C37.5 37.5 43 43.5 47.5 40.5"
        stroke="url(#hsWaveGrad)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M19.5 46.5C23.5 44.2 27.8 48.8 32 46.5C36.2 44.2 40.5 48.8 44.5 46.5"
        stroke="#2DD4BF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.85"
      />

      {/* AI Neural Intelligence Constellation in Upper Droplet */}
      <line x1="32" y1="19" x2="24.5" y2="30" stroke="#7DD3FC" strokeWidth="1.8" />
      <line x1="32" y1="19" x2="39.5" y2="30" stroke="#7DD3FC" strokeWidth="1.8" />
      <line x1="24.5" y1="30" x2="39.5" y2="30" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="2.5 2.5" />
      <line x1="24.5" y1="30" x2="32" y2="40.5" stroke="#22D3EE" strokeWidth="1.6" />
      <line x1="39.5" y1="30" x2="32" y2="40.5" stroke="#2DD4BF" strokeWidth="1.6" />

      {/* Neural Nodes */}
      <circle cx="32" cy="19" r="3.2" fill="#FFFFFF" stroke="#06B6D4" strokeWidth="1.8" />
      <circle cx="24.5" cy="30" r="2.8" fill="#38BDF8" stroke="#0F172A" strokeWidth="1.2" />
      <circle cx="39.5" cy="30" r="2.8" fill="#2DD4BF" stroke="#0F172A" strokeWidth="1.2" />
      <circle cx="32" cy="40.5" r="3" fill="#FFFFFF" stroke="#14B8A6" strokeWidth="1.6" />
    </svg>
  );
};

// Keep HydroAssistantIcon exported as an alias to HydroSightLogo so the exact same unified brand logo is used everywhere
export const HydroAssistantIcon = HydroSightLogo;
