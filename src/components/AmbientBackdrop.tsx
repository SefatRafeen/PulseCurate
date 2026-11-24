import React from 'react';

/**
 * AmbientDynamicBackdrop
 * Renders slow-drifting, organic radial ambient light orbs behind the UI.
 * The orb colors bind directly to --bg-mesh-1, --bg-mesh-2, and --pc-accent-soft,
 * creating vivid optical depth and rich chromatic glass refraction across all 18 themes.
 */
export const AmbientBackdrop: React.FC = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none"
      aria-hidden="true"
    >
      {/* Primary drifting orb - top left / center */}
      <div className="ambient-orb ambient-orb-1" />

      {/* Secondary drifting orb - center right */}
      <div className="ambient-orb ambient-orb-2" />

      {/* Tertiary drifting orb - bottom center */}
      <div className="ambient-orb ambient-orb-3" />

      {/* Vignette & depth gradience layer */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--pc-bg)]/25 to-[var(--pc-bg)]/75" />
    </div>
  );
};
