import React from 'react';

interface PluConnectedBadgeProps {
  connected: boolean;
  configured?: boolean;
  size?: 'sm' | 'md';
  labelConnected?: string;
  labelDisconnected?: string;
  labelUnconfigured?: string;
}

export const PluConnectedBadge: React.FC<PluConnectedBadgeProps> = ({
  connected,
  configured = true,
  size = 'sm',
  labelConnected = 'CONNECTED',
  labelDisconnected = 'DISCONNECTED',
  labelUnconfigured = 'BELUM DISET',
}) => {
  const dotSize = size === 'md' ? 'w-2.5 h-2.5' : 'w-2 h-2';
  const textSize = size === 'md' ? 'text-xs' : 'text-[11px]';

  if (connected) {
    return (
      <span className={`inline-flex items-center gap-2 font-bold tracking-wider uppercase text-emerald-400 shrink-0 ${textSize}`}>
        <span className={`relative flex ${dotSize}`}>
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className={`relative inline-flex rounded-full ${dotSize} bg-emerald-400 shadow-[0_0_8px_#34d399]`} />
        </span>
        <span>{labelConnected}</span>
      </span>
    );
  }

  if (configured) {
    return (
      <span className={`inline-flex items-center gap-2 font-bold tracking-wider uppercase text-rose-400 shrink-0 ${textSize}`}>
        <span className={`inline-flex rounded-full ${dotSize} bg-rose-500 shadow-[0_0_6px_#f43f5e]`} />
        <span>{labelDisconnected}</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-wider uppercase text-stone-500 shrink-0 ${textSize}`}>
      <span className={`inline-flex rounded-full ${dotSize} bg-stone-600`} />
      <span>{labelUnconfigured}</span>
    </span>
  );
};
