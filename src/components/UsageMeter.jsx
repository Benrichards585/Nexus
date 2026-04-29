import React from 'react';
import { Zap, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';

/**
 * Token budget meter shown in the header.
 *
 * Displays how many tokens the user has left for the day.
 * Colour-coded: green → yellow at 50% used → red at 80% used.
 * Only rendered when the org proxy is active (that's what we're billing against).
 */
export default function UsageMeter() {
  const { tokensRemaining, tokensUsedToday, DAILY_TOKEN_LIMIT, aiEnabled, proxyAvailable, canMakeAIRequest } = useApp();

  // Only show when using the org proxy — personal key usage isn't tracked here
  if (!aiEnabled || !proxyAvailable) return null;

  const usedPercent = (tokensUsedToday / DAILY_TOKEN_LIMIT) * 100;

  const formatTokens = (n) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  };

  // Colour logic
  let pillBg, textColor, iconColor;
  if (!canMakeAIRequest) {
    // Budget exhausted
    pillBg = 'rgba(239,68,68,0.15)';
    textColor = '#f87171';
    iconColor = '#f87171';
  } else if (usedPercent >= 80) {
    // Running low
    pillBg = 'rgba(234,179,8,0.15)';
    textColor = '#fbbf24';
    iconColor = '#fbbf24';
  } else {
    // Plenty left
    pillBg = 'rgba(74,222,128,0.12)';
    textColor = '#4ade80';
    iconColor = '#4ade80';
  }

  return (
    <div
      className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full mr-1"
      style={{ background: pillBg }}
      title={`${tokensUsedToday.toLocaleString()} / ${DAILY_TOKEN_LIMIT.toLocaleString()} tokens used today`}
    >
      {canMakeAIRequest
        ? <Zap size={11} style={{ color: iconColor }} />
        : <AlertTriangle size={11} style={{ color: iconColor }} />
      }
      <span className="text-[10px] font-medium" style={{ color: textColor }}>
        {canMakeAIRequest
          ? `${formatTokens(tokensRemaining)} tokens left`
          : 'Daily limit reached'
        }
      </span>
    </div>
  );
}
