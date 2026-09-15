import React, { useState } from 'react';
import {
  Undo2,
  Redo2,
  BarChart3,
  Keyboard,
  CheckCircle2,
  Clock,
  ScanLine,
} from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';
import { useGeminiCredential } from '../../context/GeminiCredentialContext';
import { calculateTimetableStatistics } from '../../utils/statisticsUtils';
import { ShortcutHelpModal } from '../ShortcutHelp/ShortcutHelpModal';
import { StatisticsModal } from '../Statistics/StatisticsModal';

export const EditorToolbar: React.FC = () => {
  const { state, undo, redo, canUndo, canRedo } = useTimetable();
  const { openImportModal } = useGeminiCredential();
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isShortcutOpen, setIsShortcutOpen] = useState(false);

  const stats = calculateTimetableStatistics(state);

  return (
    <>
      <div
        id="tkb-editor-toolbar"
        className="no-print mb-3 flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2 bg-white/90 backdrop-blur-xs rounded-xl border border-slate-200/80 shadow-2xs"
      >
        {/* Left Actions: History, Statistics, Help */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Undo */}
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            title="Hoàn tác (Ctrl+Z)"
            aria-label="Hoàn tác (Ctrl+Z)"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              canUndo
                ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer'
                : 'text-slate-300 cursor-not-allowed opacity-60'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hoàn tác</span>
          </button>

          {/* Redo */}
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            title="Làm lại (Ctrl+Y)"
            aria-label="Làm lại (Ctrl+Y)"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              canRedo
                ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer'
                : 'text-slate-300 cursor-not-allowed opacity-60'
            }`}
          >
            <Redo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Làm lại</span>
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          {/* Statistics Button */}
          <button
            type="button"
            onClick={() => setIsStatsOpen(true)}
            title="Xem thống kê số tiết của các môn"
            aria-label="Thống kê tiết học"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-sky-600" />
            <span>Thống kê</span>
          </button>

          {/* Shortcuts Button */}
          <button
            type="button"
            onClick={() => setIsShortcutOpen(true)}
            title="Xem danh sách phím tắt hữu ích"
            aria-label="Phím tắt"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Keyboard className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Phím tắt</span>
          </button>

          {/* AI Scan Button */}
          <button
            type="button"
            id="btn-toolbar-ai-scan"
            onClick={openImportModal}
            title="Quét thời khóa biểu từ ảnh bằng AI"
            aria-label="Quét TKB từ ảnh"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-violet-700 bg-violet-50/80 hover:bg-violet-100/90 border border-violet-200/80 transition-colors cursor-pointer"
          >
            <ScanLine className="w-3.5 h-3.5 text-violet-600" />
            <span>Quét TKB từ ảnh</span>
          </button>
        </div>

        {/* Right Status: Period count & completion */}
        <div className="flex items-center gap-2">
          {stats.isComplete ? (
            <button
              type="button"
              onClick={() => setIsStatsOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 cursor-pointer hover:bg-emerald-100/70 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-hidden transition-colors"
              title="Đã xếp đủ tất cả các tiết trong tuần. Bấm để xem chi tiết."
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Đã xếp đủ {stats.totalPeriods} tiết</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsStatsOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200/80 cursor-pointer hover:bg-slate-200/70 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-hidden transition-colors"
              title={`Còn ${stats.emptyPeriods} tiết trống. Bấm để xem chi tiết.`}
            >
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                <strong className="font-semibold text-slate-800">
                  {stats.filledPeriods}
                </strong>
                /{stats.totalPeriods} tiết
                {stats.emptyPeriods > 0 && (
                  <span className="text-slate-500 font-normal">
                    {' '}(còn {stats.emptyPeriods} trống)
                  </span>
                )}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
      <StatisticsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
      />
      <ShortcutHelpModal
        isOpen={isShortcutOpen}
        onClose={() => setIsShortcutOpen(false)}
      />
    </>
  );
};
