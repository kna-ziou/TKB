import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Clipboard, Trash2 } from 'lucide-react';
import { DayKey } from '../../types/timetable';
import { DAY_LABELS } from '../../utils/timetableFactory';

export interface DayContextMenuAnchor {
  day: DayKey;
  anchorRect: {
    top: number;
    bottom: number;
    left: number;
    right: number;
    width: number;
    height: number;
  };
}

interface DayContextMenuProps {
  activeDayMenu: DayContextMenuAnchor | null;
  onClose: () => void;
  onCopyDay: (day: DayKey) => void;
  onPasteDay: (day: DayKey) => void;
  canPasteDay: boolean;
  onClearDay: (day: DayKey) => void;
  isDayEmpty: boolean;
}

export const DayContextMenu: React.FC<DayContextMenuProps> = ({
  activeDayMenu,
  onClose,
  onCopyDay,
  onPasteDay,
  canPasteDay,
  onClearDay,
  isDayEmpty,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  // Calculate position anchored to the day header button
  useLayoutEffect(() => {
    if (!activeDayMenu) return;

    const { anchorRect } = activeDayMenu;
    const menuWidth = 180;
    const menuHeight = 135;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Center horizontally beneath the trigger button
    let left = anchorRect.left + anchorRect.width / 2 - menuWidth / 2;

    // Viewport horizontal edge boundaries (8px padding)
    if (left < 8) {
      left = 8;
    } else if (left + menuWidth > viewportWidth - 8) {
      left = viewportWidth - menuWidth - 8;
    }

    // Place below trigger button by default
    let top = anchorRect.bottom + 4;

    // If bottom overflows viewport, flip above the trigger button
    if (top + menuHeight > viewportHeight - 8) {
      top = Math.max(8, anchorRect.top - menuHeight - 4);
    }

    setCoords({ top, left });
  }, [activeDayMenu]);

  // Handle click outside, Escape key, arrow navigation, and window resize/scroll
  useEffect(() => {
    if (!activeDayMenu) return;

    // Focus first interactive menu item for keyboard navigation
    const timer = setTimeout(() => {
      const firstBtn = document.getElementById(`btn-copy-${activeDayMenu.day}`);
      firstBtn?.focus();
    }, 40);

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = [
          document.getElementById(`btn-copy-${activeDayMenu.day}`),
          document.getElementById(`btn-paste-${activeDayMenu.day}`),
          document.getElementById(`btn-clear-${activeDayMenu.day}`),
        ].filter((el): el is HTMLElement => Boolean(el && !el.hasAttribute('disabled')));

        if (items.length > 0) {
          const currentIndex = items.indexOf(document.activeElement as HTMLElement);
          if (e.key === 'ArrowDown') {
            const nextIndex = (currentIndex + 1) % items.length;
            items[nextIndex]?.focus();
          } else {
            const prevIndex = (currentIndex - 1 + items.length) % items.length;
            items[prevIndex]?.focus();
          }
        }
      }
    };

    const handleScrollOrResize = () => {
      onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [activeDayMenu, onClose]);

  if (!activeDayMenu || typeof document === 'undefined') return null;

  const { day } = activeDayMenu;
  const dayLabel = DAY_LABELS[day] || day;

  return createPortal(
    <div
      ref={menuRef}
      id={`day-context-menu-${day}`}
      role="menu"
      aria-label={`Thao tác ${dayLabel}`}
      style={{
        position: 'fixed',
        left: `${coords.left}px`,
        top: `${coords.top}px`,
      }}
      className="z-[100] bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 min-w-[180px] text-xs font-normal text-left text-slate-700 animate-in fade-in zoom-in-95 duration-100 no-print select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Action 1: Copy Day */}
      <button
        id={`btn-copy-${day}`}
        type="button"
        role="menuitem"
        onClick={() => {
          onClose();
          onCopyDay(day);
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 focus:bg-slate-100 focus:outline-hidden text-slate-700 transition-colors cursor-pointer text-left"
      >
        <Copy className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span>Sao chép {dayLabel}</span>
      </button>

      {/* Action 2: Paste Day */}
      <button
        id={`btn-paste-${day}`}
        type="button"
        role="menuitem"
        disabled={!canPasteDay}
        onClick={() => {
          if (!canPasteDay) return;
          onClose();
          onPasteDay(day);
        }}
        className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors focus:bg-slate-100 focus:outline-hidden ${
          canPasteDay
            ? 'hover:bg-slate-50 text-slate-700 cursor-pointer'
            : 'text-slate-300 cursor-not-allowed'
        }`}
      >
        <Clipboard className="w-3.5 h-3.5 shrink-0" />
        <span>Dán vào {dayLabel}</span>
      </button>

      <div className="h-px bg-slate-100 my-1" />

      {/* Action 3: Clear Day */}
      <button
        id={`btn-clear-${day}`}
        type="button"
        role="menuitem"
        disabled={isDayEmpty}
        onClick={() => {
          onClose();
          if (!isDayEmpty) {
            onClearDay(day);
          }
        }}
        className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors focus:outline-hidden ${
          !isDayEmpty
            ? 'text-rose-600 hover:bg-rose-50 focus:bg-rose-100 cursor-pointer'
            : 'text-slate-300 cursor-not-allowed'
        }`}
      >
        <Trash2 className="w-3.5 h-3.5 shrink-0" />
        <span>Xóa môn {dayLabel}</span>
      </button>
    </div>,
    document.body
  );
};
