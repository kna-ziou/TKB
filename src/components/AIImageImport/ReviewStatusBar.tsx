/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft, CheckCircle2, AlertTriangle, Pencil } from 'lucide-react';
import { useAIImageImport } from '../../context/AIImageImportContext';

export const ReviewStatusBar: React.FC = () => {
  const { reviewDraft, closeReviewWorkspace } = useAIImageImport();

  if (!reviewDraft) return null;

  const totalCells = Object.keys(reviewDraft.cells).length;
  const recognizedCount = Object.values(reviewDraft.cells).filter(
    (c) => c.current.status === 'recognized'
  ).length;
  const emptyCount = Object.values(reviewDraft.cells).filter(
    (c) => c.current.status === 'empty'
  ).length;
  const unresolvedCount = reviewDraft.reviewMeta.unresolvedCellCount;
  const editedCount = reviewDraft.reviewMeta.editedCellCount;

  return (
    <div
      id="sticky-review-status-bar"
      className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs border-b border-slate-200/90 shadow-2xs py-2 px-1 w-full max-w-full min-w-0"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 w-full min-w-0">
        {/* Left: Back Button */}
        <div className="shrink-0">
          <button
            id="btn-back-to-summary"
            type="button"
            onClick={closeReviewWorkspace}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-700 hover:text-violet-900 bg-violet-50/80 hover:bg-violet-100/90 px-2.5 py-1.5 rounded-lg border border-violet-200/70 transition-colors cursor-pointer select-none"
            title="Quay lại tóm tắt kết quả nhận dạng"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span>Quay lại kết quả</span>
          </button>
        </div>

        {/* Right: 5 Compact Status Counters */}
        <div className="grid grid-cols-5 gap-1 sm:flex sm:items-center sm:gap-1.5 lg:gap-2 text-center sm:text-left w-full sm:w-auto min-w-0">
          {/* 1. Tổng số ô */}
          <div
            className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5 px-1 sm:px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 justify-center min-w-0"
            title={`Tổng số ô: ${totalCells}`}
          >
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 whitespace-nowrap truncate">
              <span className="sm:hidden">Tổng</span>
              <span className="hidden sm:inline lg:hidden">Tổng ô</span>
              <span className="hidden lg:inline">Tổng số ô</span>
            </span>
            <span className="text-xs font-extrabold text-slate-800">{totalCells}</span>
          </div>

          {/* 2. Có môn */}
          <div
            className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5 px-1 sm:px-2.5 py-1 rounded-lg bg-emerald-50/90 border border-emerald-200/80 justify-center min-w-0"
            title={`Có môn học: ${recognizedCount}`}
          >
            <div className="flex items-center justify-center gap-1 min-w-0">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 hidden md:inline-block shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-700 whitespace-nowrap truncate">
                Có môn
              </span>
            </div>
            <span className="text-xs font-extrabold text-emerald-800">
              {recognizedCount}
            </span>
          </div>

          {/* 3. Ô trống */}
          <div
            className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5 px-1 sm:px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 justify-center min-w-0"
            title={`Ô trống: ${emptyCount}`}
          >
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 whitespace-nowrap truncate">
              <span className="sm:hidden">Trống</span>
              <span className="hidden sm:inline">Ô trống</span>
            </span>
            <span className="text-xs font-extrabold text-slate-700">{emptyCount}</span>
          </div>

          {/* 4. Cần kiểm tra */}
          <div
            className={`flex flex-col sm:flex-row sm:items-center sm:gap-1.5 px-1 sm:px-2.5 py-1 rounded-lg border justify-center transition-colors min-w-0 ${
              unresolvedCount > 0
                ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs font-bold ring-1 ring-amber-300/60'
                : 'bg-slate-50 border-slate-200/80 text-slate-600'
            }`}
            title={`Cần kiểm tra: ${unresolvedCount}`}
          >
            <div className="flex items-center justify-center gap-1 min-w-0">
              {unresolvedCount > 0 && (
                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 hidden sm:inline-block" />
              )}
              <span
                className={`text-[10px] sm:text-[11px] font-semibold whitespace-nowrap truncate ${
                  unresolvedCount > 0 ? 'text-amber-800' : 'text-slate-500'
                }`}
              >
                <span className="sm:hidden">Kiểm tra</span>
                <span className="hidden sm:inline lg:hidden">Kiểm tra</span>
                <span className="hidden lg:inline">Cần kiểm tra</span>
              </span>
            </div>
            <span
              className={`text-xs font-extrabold ${
                unresolvedCount > 0 ? 'text-amber-900' : 'text-slate-700'
              }`}
            >
              {unresolvedCount}
            </span>
          </div>

          {/* 5. Đã chỉnh sửa */}
          <div
            className={`flex flex-col sm:flex-row sm:items-center sm:gap-1.5 px-1 sm:px-2.5 py-1 rounded-lg border justify-center transition-colors min-w-0 ${
              editedCount > 0
                ? 'bg-sky-50 border-sky-300 text-sky-900 shadow-2xs ring-1 ring-sky-300/50'
                : 'bg-slate-50 border-slate-200/80 text-slate-600'
            }`}
            title={`Đã chỉnh sửa: ${editedCount}`}
          >
            <div className="flex items-center justify-center gap-1 min-w-0">
              {editedCount > 0 && (
                <Pencil className="w-3 h-3 text-sky-600 shrink-0 hidden sm:inline-block" />
              )}
              <span
                className={`text-[10px] sm:text-[11px] font-semibold whitespace-nowrap truncate ${
                  editedCount > 0 ? 'text-sky-700' : 'text-slate-500'
                }`}
              >
                <span className="sm:hidden">Sửa</span>
                <span className="hidden sm:inline lg:hidden">Đã sửa</span>
                <span className="hidden lg:inline">Đã chỉnh sửa</span>
              </span>
            </div>
            <span
              className={`text-xs font-extrabold ${
                editedCount > 0 ? 'text-sky-800' : 'text-slate-700'
              }`}
            >
              {editedCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
