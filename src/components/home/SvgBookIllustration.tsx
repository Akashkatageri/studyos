import React from 'react';

// Premium 3D Book Illustration with Floating Crystals and Neon Glow
export default function SvgBookIllustration() {
  return (
    <div className="relative w-28 h-28 flex items-center justify-center select-none pointer-events-none shrink-0" id="3d-book-illustration">
      {/* Ambient Glow */}
      <div className="absolute inset-0 bg-[#7C5CFF]/20 blur-xl rounded-full scale-75 animate-pulse" />
      
      {/* Floating Elements (Crystals & Stars) */}
      <div className="absolute top-2 left-2 text-[#A78BFA] animate-bounce duration-[2.5s] text-[10px]">✦</div>
      <div className="absolute top-1/2 -right-1 text-[#00D4FF] animate-bounce duration-[3s] text-[10px]">✦</div>
      <div className="absolute -bottom-1 left-6 text-[#7C5CFF] animate-bounce duration-[2s] text-xs">✦</div>

      {/* The 3D Book Cover SVG */}
      <svg className="w-24 h-24 drop-shadow-[0_16px_32px_rgba(124,92,255,0.45)] transform -rotate-[15deg] transition-transform hover:rotate-0 duration-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Book Back Cover Depth */}
        <path d="M25 82 L75 82 L80 18 L30 18 Z" fill="#4C2CD9" opacity="0.6" />
        {/* Book Pages Side Thickness */}
        <path d="M75 82 L80 18 L83 23 L78 87 Z" fill="#F4F4F5" />
        {/* Book Bottom Pages Thickness */}
        <path d="M25 82 L75 82 L78 87 L28 87 Z" fill="#E4E4E7" />
        {/* Book Front Cover Spine Depth */}
        <path d="M15 85 L25 82 L30 18 L20 21 Z" fill="#5B36F4" />
        {/* Book Front Cover Face */}
        <path d="M25 82 L75 82 L80 18 L30 18 Z" fill="url(#bookGrad)" />
        {/* Shiny edge overlay */}
        <path d="M25 82 L75 82 L80 18" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
        {/* Glowing Spine */}
        <path d="M25 82 L30 18" stroke="#A78BFA" strokeWidth="2.5" opacity="0.8" />
        
        {/* Developer Symbol </ > on Cover */}
        <g transform="translate(42, 40) scale(0.65)" className="filter drop-shadow-[0_4px_8px_rgba(255,255,255,0.4)]">
          <path d="M10 5 L2 12 L10 19" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M22 5 L30 12 L22 19" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18 3 L14 21" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        
        {/* Definitions */}
        <defs>
          <linearGradient id="bookGrad" x1="25" y1="50" x2="80" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7C5CFF" />
            <stop offset="50%" stopColor="#5B36F4" />
            <stop offset="100%" stopColor="#4C1D95" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
