/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  Filter,
  Sun,
  Moon,
  RotateCcw,
} from 'lucide-react';
import {
  CellApplyChange,
  TimetableApplyPlan,
} from '../../types/timetableApply';
import { DayKey, SessionType } from '../../types/timetable';
import { ApplyGridCell } from './ApplyGridCell';
import { DAY_LABELS } from '../../utils/timetableFactory';
import { useAIImageImport } from '../../context/AIImageImportContext';

interface ApplyGridProps {
  plan: TimetableApplyPlan;
}

type FilterMode = 'all' | 'changes' | 'conflicts' | 'add' | 'replace' | 'skip';

const ORDERED_DAYS: DayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export const ApplyGrid: React.FC<ApplyGridProps> = ({ plan }) => {
  const { applyOverrides, resetApplyOverrides } = useAIImageImport();
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const dayHeaderContainerRef = React.useRef<HTMLDivElement>(null);
  const cellBodyContainerRef = React.useRef<HTMLDivElement>(null);
  const topScrollContainerRef = React.useRef<HTMLDivElement>(null);

  const [hasOverflow, setHasOverflow] = useState<boolean>(false);
  const [contentScrollWidth, setContentScrollWidth] = useState<number>(640);
  const [dayHeaderHeight, setDayHeaderHeight] = useState<number>(42);

  const activeScrollSourceRef = React.useRef<'top' | 'body' | null>(null);
  const syncRafRef = React.useRef<number | null>(null);

  // Synchronize horizontal scrolling from cell body to day header and top scrollbar
  const handleCellBodyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const newScrollLeft = e.currentTarget.scrollLeft;

    // Day header always follows cell body immediately
    if (dayHeaderContainerRef.current && dayHeaderContainerRef.current.scrollLeft !== newScrollLeft) {
      dayHeaderContainerRef.current.scrollLeft = newScrollLeft;
    }

    // Guard against feedback loop when scroll was initiated by top scrollbar
    if (activeScrollSourceRef.current === 'top') return;
    activeScrollSourceRef.current = 'body';

    if (topScrollContainerRef.current && topScrollContainerRef.current.scrollLeft !== newScrollLeft) {
      topScrollContainerRef.current.scrollLeft = newScrollLeft;
    }

    if (syncRafRef.current) cancelAnimationFrame(syncRafRef.current);
    syncRafRef.current = requestAnimationFrame(() => {
      activeScrollSourceRef.current = null;
    });
  };

  // Synchronize horizontal scrolling from top scrollbar to cell body and day header
  const handleTopScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const newScrollLeft = e.currentTarget.scrollLeft;

    // Guard against feedback loop when scroll was initiated by cell body
    if (activeScrollSourceRef.current === 'body') return;
    activeScrollSourceRef.current = 'top';

    if (cellBodyContainerRef.current && cellBodyContainerRef.current.scrollLeft !== newScrollLeft) {
      cellBodyContainerRef.current.scrollLeft = newScrollLeft;
    }
    if (dayHeaderContainerRef.current && dayHeaderContainerRef.current.scrollLeft !== newScrollLeft) {
      dayHeaderContainerRef.current.scrollLeft = newScrollLeft;
    }

    if (syncRafRef.current) cancelAnimationFrame(syncRafRef.current);
    syncRafRef.current = requestAnimationFrame(() => {
      activeScrollSourceRef.current = null;
    });
  };

  // Touch drag forwarding from header to cell body and top scrollbar for seamless mobile swipe
  const touchStartXRef = React.useRef<number | null>(null);
  const touchStartScrollLeftRef = React.useRef<number>(0);

  const handleHeaderTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1 && cellBodyContainerRef.current) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartScrollLeftRef.current = cellBodyContainerRef.current.scrollLeft;
    }
  };

  const handleHeaderTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current !== null && cellBodyContainerRef.current && e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - touchStartXRef.current;
      const newLeft = touchStartScrollLeftRef.current - deltaX;
      cellBodyContainerRef.current.scrollLeft = newLeft;
      if (dayHeaderContainerRef.current) {
        dayHeaderContainerRef.current.scrollLeft = newLeft;
      }
      if (topScrollContainerRef.current) {
        topScrollContainerRef.current.scrollLeft = newLeft;
      }
    }
  };

  const handleHeaderTouchEnd = () => {
    touchStartXRef.current = null;
  };

  // Touch drag on top scrollbar for touch devices
  const topTouchStartXRef = React.useRef<number | null>(null);
  const topTouchStartScrollLeftRef = React.useRef<number>(0);

  const handleTopTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1 && cellBodyContainerRef.current) {
      topTouchStartXRef.current = e.touches[0].clientX;
      topTouchStartScrollLeftRef.current = cellBodyContainerRef.current.scrollLeft;
    }
  };

  const handleTopTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (topTouchStartXRef.current !== null && cellBodyContainerRef.current && e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - topTouchStartXRef.current;
      const newLeft = topTouchStartScrollLeftRef.current - deltaX;
      cellBodyContainerRef.current.scrollLeft = newLeft;
      if (dayHeaderContainerRef.current) {
        dayHeaderContainerRef.current.scrollLeft = newLeft;
      }
      if (topScrollContainerRef.current) {
        topScrollContainerRef.current.scrollLeft = newLeft;
      }
    }
  };

  const handleTopTouchEnd = () => {
    topTouchStartXRef.current = null;
  };

  const overridesCount = Object.keys(applyOverrides).length;

  // Build lookup map for fast cell access
  const cellMap = useMemo(() => {
    const map = new Map<string, CellApplyChange>();
    for (const change of plan.cellChanges) {
      map.set(`${change.session}_${change.periodNumber}_${change.dayKey}`, change);
    }
    return map;
  }, [plan.cellChanges]);

  // Derive target days and max periods
  const targetDays = useMemo(() => {
    const active = new Set(plan.cellChanges.map((c) => c.dayKey));
    return ORDERED_DAYS.filter((d) => active.has(d));
  }, [plan.cellChanges]);

  const maxMorningPeriod = useMemo(() => {
    let max = 0;
    for (const c of plan.cellChanges) {
      if (c.session === 'morning' && c.periodNumber > max) max = c.periodNumber;
    }
    return max;
  }, [plan.cellChanges]);

  const maxAfternoonPeriod = useMemo(() => {
    let max = 0;
    for (const c of plan.cellChanges) {
      if (c.session === 'afternoon' && c.periodNumber > max) max = c.periodNumber;
    }
    return max;
  }, [plan.cellChanges]);

  const morningPeriodsList = Array.from({ length: maxMorningPeriod }, (_, i) => i + 1);
  const afternoonPeriodsList = Array.from({ length: maxAfternoonPeriod }, (_, i) => i + 1);

  // Re-sync horizontal scroll position & measure overflow on resize / orientation change
  React.useEffect(() => {
    const bodyEl = cellBodyContainerRef.current;
    const headerEl = dayHeaderContainerRef.current;
    if (!bodyEl) return;

    const updateMeasurements = () => {
      // 1. Measure header height dynamically for sticky offset
      if (headerEl) {
        const hh = headerEl.offsetHeight;
        if (hh > 0) {
          setDayHeaderHeight(hh);
        }
      }

      // 2. Measure scroll width and overflow
      const scrollW = bodyEl.scrollWidth;
      const clientW = bodyEl.clientWidth;
      setContentScrollWidth(scrollW);
      // Overflow exists when scrollWidth exceeds clientWidth by more than 2px (subpixel buffer)
      const isOverflowing = scrollW > clientW + 2;
      setHasOverflow(isOverflowing);

      // 3. Keep day header and top scrollbar in sync
      const currentScrollLeft = bodyEl.scrollLeft;
      if (dayHeaderContainerRef.current) {
        dayHeaderContainerRef.current.scrollLeft = currentScrollLeft;
      }
      if (topScrollContainerRef.current) {
        topScrollContainerRef.current.scrollLeft = currentScrollLeft;
      }
    };

    updateMeasurements();

    const ro = new ResizeObserver(() => {
      updateMeasurements();
    });

    ro.observe(bodyEl);
    if (headerEl) {
      ro.observe(headerEl);
    }

    window.addEventListener('resize', updateMeasurements);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateMeasurements);
      if (syncRafRef.current) {
        cancelAnimationFrame(syncRafRef.current);
      }
    };
  }, [targetDays.length, plan.cellChanges]);

  const isCellMatchingFilter = (cell?: CellApplyChange): boolean => {
    if (!cell) return true;
    switch (filterMode) {
      case 'changes':
        return (
          cell.classification === 'add' ||
          cell.classification === 'replace' ||
          cell.classification === 'clear_conflict'
        );
      case 'conflicts':
        return cell.isConflict;
      case 'add':
        return cell.classification === 'add';
      case 'replace':
        return cell.classification === 'replace';
      case 'skip':
        return cell.classification === 'skip';
      case 'all':
      default:
        return true;
    }
  };

  return (
    <div id="apply-grid-container" className="space-y-3 w-full max-w-full min-w-0">
      {/* Grid Filter Bar & Reset Overrides */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full max-w-full min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap text-xs min-w-0 max-w-full">
          <span className="text-slate-400 flex items-center gap-1 font-semibold mr-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> Lọc:
          </span>

          <button
            type="button"
            id="filter-all"
            onClick={() => setFilterMode('all')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
              filterMode === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả
          </button>

          <button
            type="button"
            id="filter-changes"
            onClick={() => setFilterMode('changes')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
              filterMode === 'changes'
                ? 'bg-violet-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Có thay đổi
          </button>

          <button
            type="button"
            id="filter-conflicts"
            onClick={() => setFilterMode('conflicts')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
              filterMode === 'conflicts'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
            }`}
          >
            Xung đột ({plan.summary.conflicts})
          </button>

          <button
            type="button"
            id="filter-add"
            onClick={() => setFilterMode('add')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
              filterMode === 'add'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            Thêm mới ({plan.summary.cellsAdded})
          </button>

          <button
            type="button"
            id="filter-replace"
            onClick={() => setFilterMode('replace')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
              filterMode === 'replace'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/60'
            }`}
          >
            Thay thế ({plan.summary.cellsReplaced})
          </button>
        </div>

        {/* Reset manual cell overrides */}
        {overridesCount > 0 && (
          <button
            type="button"
            id="btn-reset-overrides"
            onClick={resetApplyOverrides}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Đặt lại {overridesCount} tùy chỉnh thủ công</span>
          </button>
        )}
      </div>

      {/* Grid Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs w-full max-w-full min-w-0">
        {/* Sticky Header Row: Days */}
        <div
          ref={dayHeaderContainerRef}
          id="apply-grid-day-header"
          onTouchStart={handleHeaderTouchStart}
          onTouchMove={handleHeaderTouchMove}
          onTouchEnd={handleHeaderTouchEnd}
          className="sticky z-10 bg-white border-b border-slate-200 rounded-t-2xl overflow-hidden shadow-2xs select-none w-full max-w-full min-w-0"
          style={{ top: 'var(--apply-status-bar-height, 54px)' }}
        >
          <div className="min-w-[640px] px-3 py-2.5">
            <div
              className="grid gap-2 text-center"
              style={{
                gridTemplateColumns: `50px repeat(${targetDays.length}, minmax(0, 1fr))`,
              }}
            >
              <div className="text-[11px] font-bold text-slate-400 py-1 flex items-center justify-center">
                Tiết
              </div>
              {targetDays.map((day) => (
                <div
                  key={day}
                  className="py-1.5 px-2 rounded-xl bg-slate-100/90 text-slate-800 font-bold text-xs"
                >
                  {DAY_LABELS[day] || day}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Horizontal Scrollbar Proxy (Synchronized with Cell Body) */}
        <div
          ref={topScrollContainerRef}
          id="apply-grid-top-scrollbar"
          onScroll={handleTopScroll}
          onTouchStart={handleTopTouchStart}
          onTouchMove={handleTopTouchMove}
          onTouchEnd={handleTopTouchEnd}
          className="sticky z-10 bg-slate-50/95 border-b border-slate-200 overflow-x-auto select-none w-full max-w-full min-w-0 overscroll-x-contain h-3 sm:h-3.5 [&::-webkit-scrollbar]:h-2 sm:[&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full [scrollbar-width:thin] [scrollbar-color:#cbd5e1_#f1f5f9]"
          style={{
            top: `calc(var(--apply-status-bar-height, 54px) + ${dayHeaderHeight}px)`,
            display: hasOverflow ? 'block' : 'none',
          }}
          aria-hidden="true"
          tabIndex={-1}
        >
          <div
            style={{
              width: `${contentScrollWidth}px`,
              minWidth: '640px',
              height: '1px',
            }}
            className="pointer-events-none"
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>

        {/* Scrollable Cell Body (Visible bottom scrollbar hidden; controlled via top scrollbar) */}
        <div
          ref={cellBodyContainerRef}
          id="apply-grid-cell-body"
          onScroll={handleCellBodyScroll}
          className="overflow-x-auto rounded-b-2xl overscroll-x-contain w-full max-w-full min-w-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]"
        >
          <div className="min-w-[640px] px-3 pt-3 pb-3 space-y-4">
            {/* Morning Session */}
            {maxMorningPeriod > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 px-1">
                  <Sun className="w-3.5 h-3.5" />
                  <span>Buổi sáng ({maxMorningPeriod} tiết)</span>
                </div>

                <div className="space-y-2">
                  {morningPeriodsList.map((period) => (
                    <div
                      key={`morning-${period}`}
                      className="grid gap-2"
                      style={{
                        gridTemplateColumns: `50px repeat(${targetDays.length}, minmax(0, 1fr))`,
                      }}
                    >
                      <div className="flex items-center justify-center font-mono font-bold text-slate-500 text-xs bg-slate-50 rounded-xl">
                        {period}
                      </div>

                      {targetDays.map((day) => {
                        const cell = cellMap.get(`morning_${period}_${day}`);
                        if (!cell) {
                          return <div key={`empty-morning-${period}-${day}`} className="bg-slate-50/30 rounded-xl border border-dashed border-slate-200/50" />;
                        }
                        const matchesFilter = isCellMatchingFilter(cell);

                        return (
                          <div
                            key={cell.cellId}
                            className={matchesFilter ? 'opacity-100' : 'opacity-25 grayscale'}
                          >
                            <ApplyGridCell change={cell} />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Afternoon Session */}
            {maxAfternoonPeriod > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 px-1">
                  <Moon className="w-3.5 h-3.5" />
                  <span>Buổi chiều ({maxAfternoonPeriod} tiết)</span>
                </div>

                <div className="space-y-2">
                  {afternoonPeriodsList.map((period) => (
                    <div
                      key={`afternoon-${period}`}
                      className="grid gap-2"
                      style={{
                        gridTemplateColumns: `50px repeat(${targetDays.length}, minmax(0, 1fr))`,
                      }}
                    >
                      <div className="flex items-center justify-center font-mono font-bold text-slate-500 text-xs bg-slate-50 rounded-xl">
                        {period}
                      </div>

                      {targetDays.map((day) => {
                        const cell = cellMap.get(`afternoon_${period}_${day}`);
                        if (!cell) {
                          return <div key={`empty-afternoon-${period}-${day}`} className="bg-slate-50/30 rounded-xl border border-dashed border-slate-200/50" />;
                        }
                        const matchesFilter = isCellMatchingFilter(cell);

                        return (
                          <div
                            key={cell.cellId}
                            className={matchesFilter ? 'opacity-100' : 'opacity-25 grayscale'}
                          >
                            <ApplyGridCell change={cell} />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
