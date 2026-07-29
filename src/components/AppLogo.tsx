import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: number | string;
  transparent?: boolean;
  showText?: boolean;
}

export default function AppLogo({ 
  className = "w-full h-full", 
  size, 
  transparent = false,
  showText = false
}: AppLogoProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 512 512" 
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      <defs>
        {/* Production Dark Canvas Gradient */}
        <linearGradient id="bgGradProd" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0B0E14" />
          <stop offset="50%" stopColor="#111622" />
          <stop offset="100%" stopColor="#07090E" />
        </linearGradient>

        {/* Vibrant Cyan to Violet Electric Accent */}
        <linearGradient id="cyanVioletGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>

        {/* Subtle Glass Wing Fills */}
        <linearGradient id="glassWingLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(56, 189, 248, 0.25)" />
          <stop offset="100%" stopColor="rgba(99, 102, 241, 0.05)" />
        </linearGradient>

        <linearGradient id="glassWingRight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(168, 85, 247, 0.25)" />
          <stop offset="100%" stopColor="rgba(99, 102, 241, 0.05)" />
        </linearGradient>

        {/* Outer Glow */}
        <filter id="coreGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="12" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Standalone Production Tile Background */}
      {!transparent && (
        <g>
          <rect width="512" height="512" rx="128" fill="url(#bgGradProd)" />
          <rect 
            width="508" 
            height="508" 
            x="2" 
            y="2" 
            rx="126" 
            fill="none" 
            stroke="rgba(255, 255, 255, 0.15)" 
            strokeWidth="3" 
          />
        </g>
      )}

      {/* Modern High-Contrast Minimalist Emblem */}
      <g transform={showText ? "translate(0, -28)" : "translate(0, 0)"}>
        {/* Soft Background Neon Core Glow */}
        <circle 
          cx="256" 
          cy="256" 
          r="110" 
          fill="url(#cyanVioletGrad)" 
          opacity="0.22" 
          filter="url(#coreGlow)" 
        />

        {/* Abstract Book / Knowledge OS Wings (Translucent Glass Fills) */}
        <path
          d="M 128,280 L 256,352 L 256,220 L 128,148 Z"
          fill="url(#glassWingLeft)"
        />
        <path
          d="M 384,280 L 256,352 L 256,220 L 384,148 Z"
          fill="url(#glassWingRight)"
        />

        {/* High-Contrast White Geometry Lines (Crisp visibility on any background) */}
        {/* Left Book Wing Outline */}
        <path
          d="M 128,148 L 256,220 L 256,352 L 128,280 Z"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="18"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Right Book Wing Outline */}
        <path
          d="M 384,148 L 256,220 L 256,352 L 384,280 Z"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="18"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Top Floating Diamond Chevron (Intellect / Focus Flame) */}
        <polygon
          points="256,88 316,140 256,192 196,140"
          fill="url(#cyanVioletGrad)"
          stroke="#FFFFFF"
          strokeWidth="10"
          strokeLinejoin="round"
        />

        {/* Central Pure White Spark Dot */}
        <circle cx="256" cy="140" r="10" fill="#FFFFFF" />

        {/* Bottom OS Tech Nodes */}
        <circle cx="128" cy="280" r="10" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="4" />
        <circle cx="384" cy="280" r="10" fill="#A855F7" stroke="#FFFFFF" strokeWidth="4" />
        <circle cx="256" cy="352" r="12" fill="#FFFFFF" />
      </g>

      {/* Optional Brand Typography */}
      {showText && (
        <g textAnchor="middle" fill="#FFFFFF" fontFamily="system-ui, -apple-system, sans-serif">
          <text 
            x="256" 
            y="435" 
            fontSize="48" 
            fontWeight="900" 
            letterSpacing="8"
            className="font-display uppercase"
          >
            Study<tspan fill="#38BDF8">OS</tspan>
          </text>
          <circle cx="392" cy="415" r="7" fill="#38BDF8" />
        </g>
      )}
    </svg>
  );
}


