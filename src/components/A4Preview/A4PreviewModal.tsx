import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Printer,
  FileText,
  Sparkles,
  Info,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';
import { usePrintSettings } from '../../context/PrintSettingsContext';
import { PrintableTimetable } from '../PrintableTimetable/PrintableTimetable';
import { calculateTimetableStatistics } from '../../utils/statisticsUtils';

export const A4PreviewModal: React.FC = () => {
  const { state, theme } = useTimetable();
  const {
    settings,
    setOrientation,
    toggleField,
    isPreviewOpen,
    closePreview,
  } = usePrintSettings();

  // Lock html and body scroll while preview modal is open to prevent background/page scrolling
  useEffect(() => {
    if (!isPreviewOpen) return;
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    // Hard lock both documentElement and body so the background document cannot scroll
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // Prevent touchmove events outside the preview scroll area on mobile / touch devices
    const handleTouchMove = (e: TouchEvent) => {
      const scrollArea = document.getElementById('a4-preview-scroll-area');
      if (!scrollArea || !scrollArea.contains(e.target as Node)) {
        e.preventDefault();
      }
    };
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isPreviewOpen]);

  // Ref to the preview scroll container to control scroll position
  const scrollAreaRef = useRef<HTMLElement | null>(null);

  // When preview opens or orientation changes, ensure horizontal scroll starts at left edge (scrollLeft = 0)
  // while preserving user's vertical scroll position where possible
  useEffect(() => {
    if (isPreviewOpen && scrollAreaRef.current) {
      scrollAreaRef.current.scrollLeft = 0;
      const raf = requestAnimationFrame(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollLeft = 0;
        }
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isPreviewOpen, settings.orientation]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPreviewOpen) {
        closePreview();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreviewOpen, closePreview]);

  if (!isPreviewOpen || typeof document === 'undefined') {
    return null;
  }

  const isLandscape = settings.orientation === 'landscape';
  const totalPeriods =
    state.config.morningPeriods +
    (state.config.afternoonEnabled ? state.config.afternoonPeriods : 0);
  const showPortraitWarning =
    !isLandscape && (totalPeriods >= 10 || state.config.activeDays.length >= 6);
  const stats = calculateTimetableStatistics(state);

  // Direct synchronous window.print() invocation with browser guard
  const handlePrint = () => {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  };

  const modalContent = (
    <div
      id="a4-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Xem trước bản in A4"
      className="fixed inset-0 z-[99999] flex flex-col h-[100dvh] min-h-[100vh] max-h-[100dvh] w-screen max-w-[100vw] overflow-hidden bg-slate-950/95 text-slate-100 select-none no-print isolate"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100dvh',
        minHeight: '100vh',
        maxHeight: '100dvh',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        overscrollBehavior: 'none',
        contain: 'paint layout size',
      }}
    >
      {/* Region A: Pinned Fixed Preview Toolbar (flex: 0 0 auto, outside scroll body, always visible) */}
      <header
        id="a4-preview-toolbar"
        className="shrink-0 w-full bg-slate-900/98 border-b border-slate-800 shadow-md shadow-black/50 text-white z-30"
        style={{
          flex: '0 0 auto',
          position: 'relative',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 30,
        }}
      >
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5 sm:gap-4">
          {/* Section 1: Title & Orientation */}
          <div className="flex items-center flex-wrap gap-2.5 sm:gap-3">
            {/* Modal Title & Paper format badge */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-400/30 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white whitespace-nowrap">
                  Xem trước bản in A4
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-sky-300 border border-slate-700 whitespace-nowrap">
                  {isLandscape ? '297 × 210 mm' : '210 × 297 mm'}
                </span>
              </div>
            </div>

            {/* Orientation controls */}
            <div className="flex items-center bg-slate-800/90 p-1 rounded-lg border border-slate-700 text-xs">
              <button
                type="button"
                id="btn-orient-landscape"
                onClick={() => setOrientation('landscape')}
                className={`py-1.5 px-2.5 sm:px-3 rounded-md font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  isLandscape
                    ? 'bg-sky-600 text-white shadow-xs font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-750'
                }`}
              >
                <div className="w-3.5 h-2.5 border border-current rounded-xs shrink-0" />
                <span>Ngang (A4)</span>
                {isLandscape && <Check className="w-3 h-3 ml-0.5 shrink-0" />}
              </button>

              <button
                type="button"
                id="btn-orient-portrait"
                onClick={() => setOrientation('portrait')}
                className={`py-1.5 px-2.5 sm:px-3 rounded-md font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  !isLandscape
                    ? 'bg-sky-600 text-white shadow-xs font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-750'
                }`}
              >
                <div className="w-2.5 h-3.5 border border-current rounded-xs shrink-0" />
                <span>Dọc (A4)</span>
                {!isLandscape && <Check className="w-3 h-3 ml-0.5 shrink-0" />}
              </button>
            </div>
          </div>

          {/* Section 2: Metadata Display Toggles & Theme Decoration */}
          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
            {[
              { key: 'showSchoolName' as const, label: 'Tên trường' },
              { key: 'showClassName' as const, label: 'Lớp học' },
              { key: 'showStudentName' as const, label: 'Tên học sinh' },
              { key: 'showSchoolYear' as const, label: 'Năm học' },
            ].map((item) => (
              <label
                key={item.key}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
                  settings[item.key]
                    ? 'bg-sky-950/40 border-sky-500/50 text-sky-200'
                    : 'bg-slate-800/70 border-slate-755 text-slate-400 hover:text-slate-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={Boolean(settings[item.key])}
                  onChange={() => toggleField(item.key)}
                  className="w-3.5 h-3.5 rounded text-sky-600 bg-slate-700 border-slate-600 focus:ring-sky-500 cursor-pointer"
                />
                <span>{item.label}</span>
              </label>
            ))}

            {/* Theme Decoration Toggle */}
            <label
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
                settings.showDecorations
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                  : 'bg-slate-800/70 border-slate-755 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <input
                type="checkbox"
                checked={settings.showDecorations}
                onChange={() => toggleField('showDecorations')}
                className="w-3.5 h-3.5 rounded text-sky-600 bg-slate-700 border-slate-600 focus:ring-sky-500 cursor-pointer"
              />
              <span>Họa tiết theme</span>
            </label>
          </div>

          {/* Section 3: Print Action & Close */}
          <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
            <button
              id="btn-modal-print"
              type="button"
              onClick={handlePrint}
              title="Mở hộp thoại in để in hoặc lưu thành PDF"
              className="py-1.5 px-3.5 sm:px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-sky-600/30 flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>In / Lưu PDF</span>
            </button>

            <button
              id="btn-close-preview"
              type="button"
              onClick={closePreview}
              aria-label="Đóng xem trước"
              title="Đóng xem trước (ESC)"
              className="py-1.5 px-2.5 sm:px-3 rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold">Đóng</span>
            </button>
          </div>
        </div>

        {/* Warning Notification Banner for Portrait mode with high period/day density */}
        {showPortraitWarning && (
          <div className="w-full border-t border-slate-800/80 bg-amber-500/10 px-3 sm:px-6 py-1.5">
            <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-amber-200 leading-snug">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                Nội dung nhiều tiết trên A4 dọc có thể chật. Khuyến nghị chuyển sang <strong>A4 ngang</strong> để có bố cục đẹp nhất.
              </span>
            </div>
          </div>
        )}
      </header>

      {/* Region B: Dedicated Scrollable Preview Body (flex: 1 1 auto, min-height: 0, overflow: auto) */}
      <main
        ref={scrollAreaRef}
        id="a4-preview-scroll-area"
        className="w-full overflow-y-auto overflow-x-auto overscroll-contain"
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          overflow: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Sizing & Alignment Wrapper:
            Ensures when sheet is wider than viewport, content starts at reachable left edge (x=0)
            and scrolls normally, while remaining centered on desktop when enough width exists. */}
        <div
          id="a4-preview-alignment-wrapper"
          className="min-w-full w-max flex flex-col items-center p-4 sm:p-8"
          style={{
            minWidth: 'max-content',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {/* Empty cells info pill if any */}
          {stats.emptyPeriods > 0 && (
            <div className="mb-4 py-1 px-3 rounded-full bg-slate-900/80 border border-slate-800 text-slate-400 text-xs flex items-center gap-1.5 shrink-0">
              <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>
                Thời khóa biểu có <strong>{stats.emptyPeriods} tiết trống</strong>. Các ô trống sẽ xuất hiện trang nhã trên bản in.
              </span>
            </div>
          )}

          {/* Authentic Physical A4 Ratio Paper Container */}
          <div
            id="a4-paper-sheet-preview"
            className={`bg-white text-slate-900 rounded-sm shadow-2xl shadow-black/80 border border-slate-200 transition-all duration-300 overflow-hidden flex flex-col shrink-0 ${
              isLandscape
                ? 'w-full max-w-[890px] min-w-[560px] aspect-[297/210]'
                : 'w-full max-w-[620px] min-w-[440px] aspect-[210/297]'
            }`}
          >
            <PrintableTimetable
              state={state}
              theme={theme}
              printSettings={settings}
              id="modal-timetable-sheet-preview"
              className="h-full"
            />
          </div>

          {/* Gentle background graphics reminder */}
          <div className="mt-6 mb-4 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5 max-w-xl shrink-0">
            <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>
              Để giữ đầy đủ màu môn học và họa tiết, hãy tích chọn <strong>&ldquo;Background graphics&rdquo; (Đồ họa nền)</strong> trong hộp thoại in nếu trình duyệt yêu cầu.
            </span>
          </div>
        </div>
      </main>
    </div>
  );

  return createPortal(modalContent, document.body);
};
