/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  DayKey,
  SessionKey,
} from '../../types/timetableRecognition';
import {
  ReviewCell as ReviewCellType,
  ReviewFilterType,
} from '../../types/timetableReview';
import { useAIImageImport } from '../../context/AIImageImportContext';
import { ReviewCell } from './ReviewCell';
import { ReviewCellEditor } from './ReviewCellEditor';
import { isCellNeedsReview } from '../../services/timetableReviewService';

const DAY_LABELS: Record<DayKey, string> = {
  monday: 'Thứ 2',
  tuesday: 'Thứ 3',
  wednesday: 'Thứ 4',
  thursday: 'Thứ 5',
  friday: 'Thứ 6',
  saturday: 'Thứ 7',
  sunday: 'Chủ nhật',
  unknown: 'Chưa rõ',
};

const SESSION_LABELS: Record<SessionKey, string> = {
  morning: 'Sáng',
  afternoon: 'Chiều',
  other: 'Khác',
  unknown: 'Chưa rõ',
};

interface ReviewGridProps {
  filter: ReviewFilterType;
}

export const ReviewGrid: React.FC<ReviewGridProps> = ({ filter }) => {
  const { reviewDraft } = useAIImageImport();
  const [selectedCell, setSelectedCell] = useState<ReviewCellType | null>(null);
  const originatingCellIdRef = useRef<string | null>(null);
  const originatingElementRef = useRef<HTMLElement | null>(null);

  const handleSelectCell = (cell: ReviewCellType) => {
    originatingCellIdRef.current = cell.id;
    originatingElementRef.current = (document.activeElement as HTMLElement) ?? null;
    setSelectedCell(cell);
  };

  const handleCloseEditor = () => {
    const targetCellId = originatingCellIdRef.current;
    const targetElement = originatingElementRef.current;
    setSelectedCell(null);

    // Restore focus to originating review cell after editor unmounts
    requestAnimationFrame(() => {
      const cellEl = targetCellId ? document.getElementById(`review-cell-${targetCellId}`) : null;
      const elToFocus = cellEl || targetElement;
      if (elToFocus && typeof elToFocus.focus === 'function') {
        elToFocus.focus();
      }
    });
  };

  if (!reviewDraft) return null;

  const { days, sessions, cells } = reviewDraft;

  // Filter check
  const isCellVisible = (cell: ReviewCellType) => {
    if (filter === 'all') return true;
    if (filter === 'needs_review') return isCellNeedsReview(cell);
    if (filter === 'edited') return cell.edited;
    return true;
  };

  const matchingCellCount = Object.values(cells).filter(isCellVisible).length;

  return (
    <div className="space-y-3 w-full max-w-full min-w-0">
      {/* If current filter yields 0 cells */}
      {matchingCellCount === 0 ? (
        <div
          id="review-grid-empty-state"
          className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl space-y-1.5 w-full min-w-0"
        >
          <p className="text-xs font-bold text-slate-700">
            {filter === 'needs_review'
              ? 'Tuyệt vời! Không còn ô nào cần kiểm tra.'
              : filter === 'edited'
              ? 'Chưa có ô nào được chỉnh sửa.'
              : 'Không tìm thấy ô phù hợp.'}
          </p>
          <p className="text-[11px] text-slate-500">
            {filter === 'needs_review'
              ? 'Tất cả các ô đã được nhận dạng đầy đủ hoặc bạn đã xác nhận.'
              : 'Chọn bộ lọc "Tất cả" để xem toàn bộ bảng thời khóa biểu.'}
          </p>
        </div>
      ) : (
        /* Horizontally scrollable table container for mobile/tablet safety */
        <div
          id="review-grid-scroll-container"
          className="overflow-x-auto w-full max-w-full border border-slate-200/90 rounded-2xl bg-white shadow-2xs pb-1"
        >
          <div
            role="grid"
            aria-label="Bảng kiểm tra thời khóa biểu nhận dạng"
            className="min-w-[620px] p-3 space-y-4"
          >
            {/* Days Header */}
            <div
              role="row"
              className="grid gap-2 items-center"
              style={{
                gridTemplateColumns: `84px repeat(${days.length}, minmax(88px, 1fr))`,
              }}
            >
              <div className="text-[11px] font-bold text-slate-500 text-center uppercase tracking-wider py-1">
                Tiết / Thứ
              </div>
              {days.map((day) => (
                <div
                  key={day.dayKey}
                  role="columnheader"
                  className="py-1.5 px-2 bg-slate-100/90 border border-slate-200/80 rounded-xl text-center"
                >
                  <span className="font-bold text-xs text-slate-800 block">
                    {DAY_LABELS[day.dayKey] || day.label}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {Math.round(day.confidence * 100)}%
                  </span>
                </div>
              ))}
            </div>

            {/* Sessions & Periods */}
            {sessions.map((session) => (
              <div key={session.sessionKey} className="space-y-2">
                {/* Session Separator Badge */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-200/70 text-slate-700 text-[11px] font-extrabold uppercase tracking-wider">
                    {SESSION_LABELS[session.sessionKey] || session.label}
                  </span>
                  <div className="h-px flex-1 bg-slate-200/80" />
                </div>

                {/* Periods in this Session */}
                {session.periodNumbers.map((periodNum) => {
                  return (
                    <div
                      key={periodNum}
                      role="row"
                      className="grid gap-2 items-stretch"
                      style={{
                        gridTemplateColumns: `84px repeat(${days.length}, minmax(88px, 1fr))`,
                      }}
                    >
                      {/* Period Row Label */}
                      <div
                        role="rowheader"
                        className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200/80 rounded-xl text-center px-1"
                      >
                        <span className="text-xs font-bold text-slate-700">
                          Tiết {periodNum}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {SESSION_LABELS[session.sessionKey]}
                        </span>
                      </div>

                      {/* Cells for each Day */}
                      {days.map((day) => {
                        const cellId = `${session.sessionKey}_${periodNum}_${day.dayKey}`;
                        const cell = cells[cellId];
                        const dayLabel = DAY_LABELS[day.dayKey] || day.label;

                        if (!cell) {
                          return (
                            <div
                              key={day.dayKey}
                              className="min-h-[58px] p-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 flex items-center justify-center text-slate-300 text-xs"
                            >
                              —
                            </div>
                          );
                        }

                        const visible = isCellVisible(cell);

                        // If cell doesn't match filter, render subdued or dimmed
                        if (!visible) {
                          return (
                            <div
                              key={day.dayKey}
                              className="min-h-[58px] p-2 rounded-xl border border-slate-100 bg-slate-50/30 opacity-30 flex items-center justify-center"
                            >
                              <span className="text-slate-300 text-xs">—</span>
                            </div>
                          );
                        }

                        return (
                          <ReviewCell
                            key={day.dayKey}
                            cell={cell}
                            dayLabel={dayLabel}
                            onSelect={handleSelectCell}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cell Editor Modal/Dialog */}
      {selectedCell && (
        <ReviewCellEditor
          cell={selectedCell}
          onClose={handleCloseEditor}
        />
      )}
    </div>
  );
};
