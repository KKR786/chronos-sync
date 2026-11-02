/**
 * @license Apache-2.0
 * Tooltip Component
 * Production-grade floating tooltip powered by React Portal & viewport clamping.
 * Eliminates all container clipping, overflow bugs, and unwanted scrollbars.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

interface TooltipProps {
  title?: string;
  content: React.ReactNode;
  children?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  iconClassName?: string;
}

interface Coords {
  top: number;
  left: number;
  placement: 'top' | 'bottom';
  width: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  title,
  content,
  children,
  position = 'top',
  className = '',
  iconClassName = 'w-3.5 h-3.5 text-slate-400 hover:text-indigo-300',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = Math.min(300, window.innerWidth - 24);
    const viewportWidth = window.innerWidth;

    // Check vertical room: if near top edge (< 180px), flip to bottom
    let placement: 'top' | 'bottom' = position === 'bottom' ? 'bottom' : 'top';
    if (placement === 'top' && rect.top < 180) {
      placement = 'bottom';
    }

    // Horizontal centering relative to trigger, clamped to viewport margins
    const triggerCenter = rect.left + rect.width / 2;
    let targetLeft = triggerCenter - tooltipWidth / 2;

    // Viewport clamping (12px padding from screen edges)
    if (targetLeft < 12) {
      targetLeft = 12;
    } else if (targetLeft + tooltipWidth > viewportWidth - 12) {
      targetLeft = viewportWidth - tooltipWidth - 12;
    }

    let targetTop: number;
    if (placement === 'top') {
      targetTop = rect.top - 8;
    } else {
      targetTop = rect.bottom + 8;
    }

    setCoords({
      top: targetTop,
      left: targetLeft,
      placement,
      width: tooltipWidth,
    });
  }, [position]);

  const handleOpen = () => {
    calculatePosition();
    setIsVisible(true);
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  useEffect(() => {
    if (!isVisible) return;

    const handleScrollOrResize = () => {
      calculatePosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isVisible, calculatePosition]);

  return (
    <div
      ref={triggerRef}
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
      onFocus={handleOpen}
      onBlur={handleClose}
    >
      {children ? (
        children
      ) : (
        <button
          type="button"
          aria-label="More information"
          className="inline-flex items-center justify-center p-1 rounded-full text-slate-400 hover:text-indigo-300 hover:bg-slate-800/80 transition-colors cursor-help focus:outline-none"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isVisible) {
              handleClose();
            } else {
              handleOpen();
            }
          }}
        >
          <Info className={iconClassName} />
        </button>
      )}

      {isVisible &&
        coords &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              transform: coords.placement === 'top' ? 'translateY(-100%)' : 'none',
              zIndex: 99999,
            }}
            className="pointer-events-none p-3.5 rounded-xl bg-slate-900/98 border border-slate-700/90 shadow-2xl backdrop-blur-xl text-xs text-slate-200 transition-opacity duration-150 animate-fadeIn"
          >
            {title && (
              <div className="font-bold text-slate-100 flex items-center gap-1.5 pb-1.5 mb-2 border-b border-slate-800">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></span>
                <span className="text-xs">{title}</span>
              </div>
            )}
            <div className="leading-relaxed text-[11.5px] text-slate-300">
              {content}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
