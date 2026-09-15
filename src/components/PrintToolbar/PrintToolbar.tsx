import React, { useEffect, useRef } from 'react';
import { Eye, Printer, FileText } from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';
import { usePrintSettings } from '../../context/PrintSettingsContext';

export const PrintToolbar: React.FC = () => {
  const { state } = useTimetable();
  const { isGenerated } = state;
  const {
    settings,
    setOrientation,
    openPreview,
    triggerPrint,
  } = usePrintSettings();

  const toolbarRef = useRef<HTMLDivElement>(null);

  // Keep --print-toolbar-height synchronized so sticky timetable elements stick directly below it
  useEffect(() => {
    const updateToolbarHeight = () => {
      if (toolbarRef.current) {
        const height = toolbarRef.current.offsetHeight;
        if (height > 0) {
          document.documentElement.style.setProperty('--print-toolbar-height', `${height}px`);
        }
      }
    };

    updateToolbarHeight();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && toolbarRef.current) {
      resizeObserver = new ResizeObserver(updateToolbarHeight);
      resizeObserver.observe(toolbarRef.current);
    }

    window.addEventListener('resize', updateToolbarHeight);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', updateToolbarHeight);
      document.documentElement.style.removeProperty('--print-toolbar-height');
    };
  }, []);

  if (!isGenerated) {
    return null;
  }

  const isLandscape = settings.orientation === 'landscape';

  const handlePrint = () => {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  };

  return (
    <div
      ref={toolbarRef}
      id="print-toolbar"
      className="w-full bg-white/98 backdrop-blur-md rounded-xl border border-slate-200/90 p-2.5 sm:p-3 mb-4 shadow-sm flex flex-wrap items-center justify-between gap-3 select-none no-print transition-all sticky z-20"
      style={{
        top: 'var(--app-header-height, 65px)',
      }}
    >
      {/* Left: Section Label & A4 Format */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-bold text-xs">
          <FileText className="w-3.5 h-3.5 text-sky-600" />
          <span>BẢN IN</span>
        </div>
        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
          A4
        </span>

        {/* Orientation switch */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            type="button"
            id="toolbar-orient-landscape"
            onClick={() => setOrientation('landscape')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
              isLandscape
                ? 'bg-white text-sky-700 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ngang
          </button>
          <button
            type="button"
            id="toolbar-orient-portrait"
            onClick={() => setOrientation('portrait')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
              !isLandscape
                ? 'bg-white text-sky-700 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dọc
          </button>
        </div>
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          id="btn-toolbar-preview"
          onClick={openPreview}
          className="py-1.5 px-3.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
        >
          <Eye className="w-3.5 h-3.5 text-slate-600" />
          <span>Xem bản in</span>
        </button>

        <button
          type="button"
          id="btn-toolbar-print"
          onClick={handlePrint}
          title="Mở hộp thoại in để in hoặc lưu thành PDF"
          className="py-1.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-sky-200 transition-colors cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>In / Lưu PDF</span>
        </button>
      </div>
    </div>
  );
};
