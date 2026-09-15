import React, { useState } from 'react';
import {
  Calendar,
  Sparkles,
  Sun,
  Sunset,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';
import { ActiveCellTarget, DayKey, SessionType } from '../../types/timetable';
import { DAY_LABELS } from '../../utils/timetableFactory';
import { APP_VERSION } from '../../utils/persistenceUtils';
import { useHorizontalScrollSync } from '../../hooks/useHorizontalScrollSync';
import { CellContextMenu, ContextMenuPosition } from '../CellContextMenu/CellContextMenu';
import {
  DayContextMenu,
  DayContextMenuAnchor,
} from '../DayContextMenu/DayContextMenu';
import { ClearDayConfirmModal } from '../ConfirmModals/ClearDayConfirmModal';
import { ClearSessionConfirmModal } from '../ConfirmModals/ClearSessionConfirmModal';
import { TimetableCell } from '../TimetableCell/TimetableCell';
import { TimetableHeader } from '../TimetableHeader/TimetableHeader';

export const TimetableGrid: React.FC = () => {
  const {
    state,
    theme,
    generateTimetable,
    clipboard,
    copyDay,
    pasteDayToTarget,
    clearDay,
    clearSession,
  } = useTimetable();
  const { config, isGenerated } = state;
  const { tokens } = theme;

  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null);
  const [activeDayMenu, setActiveDayMenu] = useState<DayContextMenuAnchor | null>(null);
  const [clearDayTarget, setClearDayTarget] = useState<DayKey | null>(null);
  const [clearSessionTarget, setClearSessionTarget] = useState<SessionType | null>(null);

  const activeDays = config.activeDays;
  const morningCount = config.morningPeriods;
  const afternoonCount = config.afternoonPeriods;
  const showAfternoon = config.afternoonEnabled;

  const {
    headerRef,
    topScrollRef,
    bodyRef,
    headerHeight,
    contentScrollWidth,
    hasOverflow,
    handleBodyScroll,
    handleTopScroll,
    handleHeaderTouchStart,
    handleHeaderTouchMove,
    handleHeaderTouchEnd,
    handleTopTouchStart,
    handleTopTouchMove,
    handleTopTouchEnd,
  } = useHorizontalScrollSync({
    minContentWidth: 620,
    dependencies: [activeDays, morningCount, afternoonCount, showAfternoon],
  });

  // Empty state if user has not yet generated timetable
  if (!isGenerated) {
    return (
      <div
        id="timetable-empty-state"
        className="flex-1 min-h-[460px] bg-white rounded-2xl border border-dashed border-slate-300 p-6 sm:p-10 flex flex-col items-center justify-center text-center shadow-xs"
      >
        <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4 shadow-xs">
          <Calendar className="w-7 h-7" />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1.5">
          Bắt đầu tạo thời khóa biểu
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
          Thực hiện 4 bước thiết lập đơn giản ở cột bên trái để hiển thị bảng biểu:
        </p>

        {/* 4 Guiding Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full text-left mb-6">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              1
            </span>
            <div className="text-xs">
              <span className="font-semibold text-slate-800">Điền thông tin</span>
              <p className="text-slate-500 text-[11px] mt-0.5">Trường, lớp, học sinh, năm học</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              2
            </span>
            <div className="text-xs">
              <span className="font-semibold text-slate-800">Cấu hình ngày & tiết</span>
              <p className="text-slate-500 text-[11px] mt-0.5">Thứ 2 - Thứ 7, số tiết sáng & chiều</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              3
            </span>
            <div className="text-xs">
              <span className="font-semibold text-slate-800">Chọn phong cách</span>
              <p className="text-slate-500 text-[11px] mt-0.5">Giao diện màu sắc & font chữ</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              4
            </span>
            <div className="text-xs">
              <span className="font-semibold text-slate-800">Nhấn &ldquo;Tạo bảng biểu&rdquo;</span>
              <p className="text-slate-500 text-[11px] mt-0.5">Tạo lưới và sẵn sàng nhập môn</p>
            </div>
          </div>
        </div>

        <button
          id="btn-empty-generate"
          type="button"
          onClick={generateTimetable}
          className="py-2.5 px-6 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Tạo bảng biểu ngay</span>
        </button>
      </div>
    );
  }

  const handleCellContextMenu = (e: React.MouseEvent, cell: ActiveCellTarget) => {
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      cell,
    });
  };

  const isDayEmpty = (day: DayKey): boolean => {
    const d = state.schedule[day];
    if (!d) return true;
    const hasMorning = (d.morning?.periods || []).some((p) => p.subjectId);
    const hasAfternoon = (d.afternoon?.periods || []).some((p) => p.subjectId);
    return !hasMorning && !hasAfternoon;
  };

  const isSessionEmpty = (session: SessionType): boolean => {
    return activeDays.every((day) => {
      const periods = state.schedule[day]?.[session]?.periods || [];
      return periods.every((p) => !p.subjectId);
    });
  };

  const stickyDayHeaderTop = 'calc(var(--app-header-height, 65px) + var(--print-toolbar-height, 52px))';
  const stickyTopScrollbarTop = `calc(var(--app-header-height, 65px) + var(--print-toolbar-height, 52px) + ${headerHeight}px)`;

  return (
    <div
      id="timetable-container"
      data-theme={theme.id}
      className={`flex-1 ${tokens.timetableBackground} ${tokens.timetableBorder} ${tokens.timetableRadius} ${tokens.timetableShadow} flex flex-col overflow-visible w-full max-w-full min-w-0 transition-colors duration-200`}
    >
      {/* Timetable Header Card */}
      <TimetableHeader />

      {/* Sticky Day Header */}
      <div
        ref={headerRef}
        id="main-timetable-day-header"
        onTouchStart={handleHeaderTouchStart}
        onTouchMove={handleHeaderTouchMove}
        onTouchEnd={handleHeaderTouchEnd}
        className={`sticky z-15 ${tokens.tableHeaderBg} border-b ${tokens.gridBorder} overflow-x-hidden overflow-y-hidden select-none w-full max-w-full min-w-0 shadow-2xs`}
        style={{
          top: stickyDayHeaderTop,
        }}
      >
        <table className="w-full table-fixed border-collapse text-sm min-w-[620px]">
          <colgroup>
            <col className="w-16 sm:w-20" />
            {activeDays.map((day) => (
              <col key={`col-hdr-${day}`} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th
                className={`w-16 sm:w-20 h-12 border-r text-[10px] uppercase font-bold text-center ${tokens.periodColText} ${tokens.gridBorder}`}
              >
                Tiết
              </th>
              {activeDays.map((day) => {
                const isMenuOpen = activeDayMenu?.day === day;

                return (
                  <th
                    key={`header-${day}`}
                    className={`border-r h-12 text-sm font-bold text-center relative group ${tokens.tableHeaderText} ${tokens.gridBorder}`}
                  >
                    <div className="flex items-center justify-center gap-1 px-1">
                      <span>{DAY_LABELS[day]}</span>
                      {/* Day Action Menu Trigger */}
                      <button
                        type="button"
                        id={`btn-day-menu-${day}`}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (activeDayMenu?.day === day) {
                            setActiveDayMenu(null);
                          } else {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setActiveDayMenu({
                              day,
                              anchorRect: {
                                top: rect.top,
                                bottom: rect.bottom,
                                left: rect.left,
                                right: rect.right,
                                width: rect.width,
                                height: rect.height,
                              },
                            });
                          }
                        }}
                        title={`Thao tác với ${DAY_LABELS[day]}`}
                        aria-label={`Thao tác với ${DAY_LABELS[day]}`}
                        className={`p-0.5 rounded-md hover:bg-black/10 transition-all cursor-pointer text-slate-500 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-hidden ${
                          isMenuOpen
                            ? 'opacity-100 bg-black/10 text-slate-800'
                            : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
                        }`}
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
        </table>
      </div>

      {/* Top Horizontal Scrollbar Proxy (Synchronized with Timetable Body) */}
      <div
        ref={topScrollRef}
        id="main-timetable-top-scrollbar"
        onScroll={handleTopScroll}
        onTouchStart={handleTopTouchStart}
        onTouchMove={handleTopTouchMove}
        onTouchEnd={handleTopTouchEnd}
        className="sticky z-14 bg-slate-50/95 border-b border-slate-200 overflow-x-auto select-none w-full max-w-full min-w-0 overscroll-x-contain h-3 sm:h-3.5 no-print [&::-webkit-scrollbar]:h-2 sm:[&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full [scrollbar-width:thin] [scrollbar-color:#cbd5e1_#f1f5f9]"
        style={{
          top: stickyTopScrollbarTop,
          display: hasOverflow ? 'block' : 'none',
        }}
        aria-hidden="true"
        tabIndex={-1}
      >
        <div
          style={{
            width: `${contentScrollWidth}px`,
            minWidth: '620px',
            height: '1px',
          }}
          className="pointer-events-none"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {/* Timetable Grid Scroll Viewport (Bottom scrollbar hidden; controlled via top scrollbar) */}
      <div
        ref={bodyRef}
        id="main-timetable-scroll-viewport"
        onScroll={handleBodyScroll}
        className="flex-1 overflow-x-auto bg-transparent overscroll-x-contain w-full max-w-full min-w-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]"
      >
        <table
          id="timetable-table"
          className="w-full table-fixed border-collapse text-sm min-w-[620px]"
        >
          <colgroup>
            <col className="w-16 sm:w-20" />
            {activeDays.map((day) => (
              <col key={`col-body-${day}`} />
            ))}
          </colgroup>
          <thead className="sr-only">
            <tr>
              <th scope="col">Tiết</th>
              {activeDays.map((day) => (
                <th key={`sr-col-${day}`} scope="col">
                  {DAY_LABELS[day]}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* MORNING SESSION HEADER */}
            <tr className={tokens.morningBackground}>
              <td
                colSpan={activeDays.length + 1}
                className={`py-1.5 px-4 text-[10px] font-bold tracking-wider border-b uppercase ${tokens.morningText} ${tokens.gridBorder}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sun className={`w-3.5 h-3.5 ${tokens.morningIconColor}`} />
                    <span>Buổi sáng</span>
                  </div>

                  {!isSessionEmpty('morning') && (
                    <button
                      type="button"
                      onClick={() => setClearSessionTarget('morning')}
                      title="Xóa toàn bộ môn buổi sáng"
                      className="text-[10px] font-medium text-slate-500 hover:text-rose-600 hover:underline transition-colors flex items-center gap-1 cursor-pointer lowercase"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Xóa buổi sáng</span>
                    </button>
                  )}
                </div>
              </td>
            </tr>

            {/* MORNING ROWS */}
            {Array.from({ length: morningCount }).map((_, periodIdx) => (
              <tr key={`row-morning-${periodIdx}`} className="h-[52px]">
                <td
                  className={`border-r border-b text-center text-xs font-bold ${tokens.periodColBg} ${tokens.periodColText} ${tokens.gridBorder}`}
                >
                  {periodIdx + 1}
                </td>
                {activeDays.map((day) => (
                  <td
                    key={`cell-${day}-morning-${periodIdx}`}
                    className={`border-r border-b p-0 relative ${tokens.gridBorder}`}
                  >
                    <TimetableCell
                      day={day}
                      session="morning"
                      periodIndex={periodIdx}
                      onContextMenu={handleCellContextMenu}
                    />
                  </td>
                ))}
              </tr>
            ))}

            {/* AFTERNOON SESSION HEADER (IF ENABLED) */}
            {showAfternoon && (
              <>
                <tr className={tokens.afternoonBackground}>
                  <td
                    colSpan={activeDays.length + 1}
                    className={`py-1.5 px-4 text-[10px] font-bold tracking-wider border-b uppercase ${tokens.afternoonText} ${tokens.gridBorder}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sunset
                          className={`w-3.5 h-3.5 ${tokens.afternoonIconColor}`}
                        />
                        <span>Buổi chiều</span>
                      </div>

                      {!isSessionEmpty('afternoon') && (
                        <button
                          type="button"
                          onClick={() => setClearSessionTarget('afternoon')}
                          title="Xóa toàn bộ môn buổi chiều"
                          className="text-[10px] font-medium text-slate-500 hover:text-rose-600 hover:underline transition-colors flex items-center gap-1 cursor-pointer lowercase"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Xóa buổi chiều</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>

                {/* AFTERNOON ROWS */}
                {Array.from({ length: afternoonCount }).map((_, periodIdx) => (
                  <tr key={`row-afternoon-${periodIdx}`} className="h-[52px]">
                    <td
                      className={`border-r border-b text-center text-xs font-bold ${tokens.periodColBg} ${tokens.periodColText} ${tokens.gridBorder}`}
                    >
                      {periodIdx + 1}
                    </td>
                    {activeDays.map((day) => (
                      <td
                        key={`cell-${day}-afternoon-${periodIdx}`}
                        className={`border-r border-b p-0 relative ${tokens.gridBorder}`}
                      >
                        <TimetableCell
                          day={day}
                          session="afternoon"
                          periodIndex={periodIdx}
                          onContextMenu={handleCellContextMenu}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer of Table */}
      <div
        className={`p-3 sm:p-4 ${tokens.footerBackground} text-[11px] ${tokens.footerText} flex flex-wrap justify-between items-center border-t ${tokens.footerBorder} gap-2`}
      >
        <span>* Bấm vào ô để chọn môn, dùng phím mũi tên và Ctrl+C/V để nhập nhanh.</span>
        <span className="font-mono uppercase text-[10px]">TKB Designer v{APP_VERSION}</span>
      </div>

      {/* Portaled Context Menu for Day Header */}
      <DayContextMenu
        activeDayMenu={activeDayMenu}
        onClose={() => {
          if (activeDayMenu) {
            const dayKey = activeDayMenu.day;
            setActiveDayMenu(null);
            requestAnimationFrame(() => {
              document.getElementById(`btn-day-menu-${dayKey}`)?.focus();
            });
          } else {
            setActiveDayMenu(null);
          }
        }}
        onCopyDay={(day) => copyDay(day)}
        onPasteDay={(day) => pasteDayToTarget(day)}
        canPasteDay={clipboard?.type === 'day'}
        onClearDay={(day) => setClearDayTarget(day)}
        isDayEmpty={activeDayMenu ? isDayEmpty(activeDayMenu.day) : true}
      />

      {/* Context Menu for Cell */}
      <CellContextMenu
        position={contextMenu}
        onClose={() => setContextMenu(null)}
      />

      {/* Clear Day Confirm Modal */}
      <ClearDayConfirmModal
        day={clearDayTarget}
        isOpen={Boolean(clearDayTarget)}
        onClose={() => setClearDayTarget(null)}
        onConfirm={(day) => clearDay(day)}
      />

      {/* Clear Session Confirm Modal */}
      <ClearSessionConfirmModal
        session={clearSessionTarget}
        isOpen={Boolean(clearSessionTarget)}
        onClose={() => setClearSessionTarget(null)}
        onConfirm={(session) => clearSession(session)}
      />
    </div>
  );
};
