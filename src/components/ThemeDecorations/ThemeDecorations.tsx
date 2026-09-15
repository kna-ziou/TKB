import React from 'react';
import { ThemeId } from '../../types/theme';

interface ThemeDecorationsProps {
  themeId: ThemeId;
  placement?: 'header' | 'container';
}

export const ThemeDecorations: React.FC<ThemeDecorationsProps> = ({
  themeId,
  placement = 'header',
}) => {
  if (themeId === 'professional' || themeId === 'simple') {
    return null;
  }

  // Header decorative layers
  if (placement === 'header') {
    switch (themeId) {
      case 'fun':
        return (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden select-none"
          >
            {/* Playful confetti dots */}
            <div className="absolute top-2 left-6 w-3 h-3 rounded-full bg-amber-300/60 animate-pulse" />
            <div className="absolute top-6 left-16 w-2 h-2 rounded-full bg-rose-300/70" />
            <div className="absolute bottom-3 left-10 w-2.5 h-2.5 rounded-full bg-yellow-300/80" />
            <div className="absolute top-3 right-8 w-3.5 h-3.5 rounded-full bg-orange-300/60" />
            <div className="absolute top-7 right-20 w-2 h-2 rounded-full bg-pink-300/70" />
            <div className="absolute bottom-2 right-12 w-3 h-3 rounded-full bg-amber-400/50" />
          </div>
        );

      case 'kawaii':
        return (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden select-none"
          >
            {/* Cute mini clouds and soft sparkles */}
            <div className="absolute top-1 left-4 text-xs opacity-60">☁️</div>
            <div className="absolute bottom-1.5 left-14 text-[10px] opacity-70">✨</div>
            <div className="absolute top-2 right-5 text-xs opacity-60">☁️</div>
            <div className="absolute bottom-1.5 right-14 text-[10px] opacity-70">✨</div>
            <div className="absolute top-4 right-28 text-[9px] opacity-50">⭐</div>
          </div>
        );

      case 'space':
        return (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden select-none"
          >
            {/* Cosmic starfield hints & rocket */}
            <div className="absolute top-2 left-6 text-sm opacity-80 animate-pulse">🚀</div>
            <div className="absolute top-5 left-20 w-1 h-1 rounded-full bg-white shadow-[0_0_4px_#fff]" />
            <div className="absolute bottom-3 left-12 w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_6px_#67e8f9]" />
            <div className="absolute top-3 right-8 text-xs opacity-80">🪐</div>
            <div className="absolute bottom-2 right-20 w-1 h-1 rounded-full bg-indigo-200 shadow-[0_0_4px_#a5b4fc]" />
            <div className="absolute top-6 right-36 w-1 h-1 rounded-full bg-cyan-200 shadow-[0_0_4px_#a5f3fc]" />
          </div>
        );

      case 'dino':
        return (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden select-none"
          >
            {/* Prehistoric nature & safari foliage */}
            <div className="absolute top-2 left-5 text-sm opacity-75">🌿</div>
            <div className="absolute bottom-2 left-16 text-xs opacity-60">🐾</div>
            <div className="absolute top-2.5 right-6 text-sm opacity-75">🌿</div>
            <div className="absolute bottom-2.5 right-16 text-xs opacity-60">🌴</div>
          </div>
        );

      case 'robot':
        return (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden select-none"
          >
            {/* Circuit tech corners & grid nodes */}
            <div className="absolute top-2 left-3 font-mono text-[10px] text-cyan-400/80 font-bold">
              [SYS.AI_03]
            </div>
            <div className="absolute bottom-2 left-3 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="font-mono text-[9px] text-cyan-400/80">ONLINE</span>
            </div>
            <div className="absolute top-2 right-3 font-mono text-[10px] text-cyan-400/80">
              ┌───┐
            </div>
            <div className="absolute bottom-2 right-3 font-mono text-[10px] text-cyan-400/80">
              └───┘
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  // Container decorative accents (at the borders or corners)
  return null;
};
