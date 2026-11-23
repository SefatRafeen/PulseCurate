import React from 'react';
import type { PlatformId } from '../types.ts';

interface PlatformIconProps {
  platform: PlatformId;
  className?: string;
}

export const PlatformIcon: React.FC<PlatformIconProps> = ({ platform, className = 'w-4 h-4' }) => {
  switch (platform) {
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
        </svg>
      );
    case 'reddit':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm5.8 11.4a1.7 1.7 0 0 1-.8 1.5c0 2.1-2.2 3.8-5 3.8s-5-1.7-5-3.8a1.7 1.7 0 0 1-.8-1.5 1.7 1.7 0 0 1 2.9-1.2 6.8 6.8 0 0 1 2.6-.7l.6-2.9a.4.4 0 0 1 .5-.3l2.1.4a1.2 1.2 0 1 1-.1.8l-1.7-.4-.5 2.4a6.7 6.7 0 0 1 2.6.7 1.7 1.7 0 0 1 2.8 1.2ZM9.5 13a1 1 0 1 0 1 1 1 1 0 0 0-1-1Zm5 0a1 1 0 1 0 1 1 1 1 0 0 0-1-1Zm-4.3 3a3.6 3.6 0 0 0 3.6 0 .4.4 0 1 0-.4-.7 2.8 2.8 0 0 1-2.8 0 .4.4 0 0 0-.4.7Z" />
        </svg>
      );
    case 'x':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77Z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12Z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.81a8.26 8.26 0 0 0 4.84 1.55V6.91a4.85 4.85 0 0 1-1.08-.22Z" />
        </svg>
      );
    case 'threads':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M19 12a7 7 0 1 0-2.5 5.4" />
          <path d="M15.5 12c0 2.5-1.5 4-3.5 4s-3.5-1.5-3.5-4 1.5-4 3.5-4c2.5 0 4 1.5 4 4v1.5c0 1.2.8 2 1.8 2s1.7-.9 1.7-2.5" />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.6 14.1c-.2.6-1.3 1.2-1.8 1.3-.5.1-1 .1-1.7-.1a14 14 0 0 1-5.8-4.8c-.9-1.1-1.4-2.3-1.5-3.1-.1-.9.4-1.5.7-1.8.2-.2.5-.3.8-.3h.6c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .6l-.5.7c-.2.2-.3.4-.1.7a8.6 8.6 0 0 0 3.7 3.2c.3.1.5.1.7-.1l.8-.9c.2-.2.4-.3.7-.2l1.8.9c.3.1.4.2.5.4.1.2.1.7-.1 1.3Z" />
        </svg>
      );
  }
};

export const PulseLogoMark: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
    <rect x="2" y="2" width="28" height="28" rx="8" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5" />
    <path
      d="M6.5 17H10.8L13.4 9.5L17 22.5L20 14.5L22.2 17H25.5"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
