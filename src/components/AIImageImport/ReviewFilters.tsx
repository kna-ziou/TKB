/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Layers, AlertTriangle, Edit3 } from 'lucide-react';
import { ReviewFilterType } from '../../types/timetableReview';
import { useAIImageImport } from '../../context/AIImageImportContext';

interface ReviewFiltersProps {
  currentFilter: ReviewFilterType;
  onFilterChange: (filter: ReviewFilterType) => void;
}

export const ReviewFilters: React.FC<ReviewFiltersProps> = ({
  currentFilter,
  onFilterChange,
}) => {
  const { reviewDraft } = useAIImageImport();

  if (!reviewDraft) return null;

  const totalCells = Object.keys(reviewDraft.cells).length;
  const unresolvedCount = reviewDraft.reviewMeta.unresolvedCellCount;
  const editedCount = reviewDraft.reviewMeta.editedCellCount;

  return (
    <div
      id="review-filters-bar"
      className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/90 border border-slate-200/80 rounded-xl w-full max-w-full min-w-0"
      role="tablist"
      aria-label="Lọc danh sách ô thời khóa biểu"
    >
      <button
        type="button"
        id="btn-filter-all"
        role="tab"
        aria-selected={currentFilter === 'all'}
        onClick={() => onFilterChange('all')}
        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
          currentFilter === 'all'
            ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/90'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
        }`}
      >
        <Layers className="w-3.5 h-3.5 text-slate-500" />
        <span>Tất cả</span>
        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700">
          {totalCells}
        </span>
      </button>

      <button
        type="button"
        id="btn-filter-needs-review"
        role="tab"
        aria-selected={currentFilter === 'needs_review'}
        onClick={() => onFilterChange('needs_review')}
        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
          currentFilter === 'needs_review'
            ? 'bg-white text-amber-900 shadow-2xs border border-amber-300'
            : 'text-slate-600 hover:text-amber-900 hover:bg-amber-50'
        }`}
      >
        <AlertTriangle
          className={`w-3.5 h-3.5 ${
            unresolvedCount > 0 ? 'text-amber-600' : 'text-slate-400'
          }`}
        />
        <span>Cần kiểm tra</span>
        <span
          className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
            unresolvedCount > 0
              ? 'bg-amber-100 text-amber-800 font-bold'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {unresolvedCount}
        </span>
      </button>

      <button
        type="button"
        id="btn-filter-edited"
        role="tab"
        aria-selected={currentFilter === 'edited'}
        onClick={() => onFilterChange('edited')}
        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
          currentFilter === 'edited'
            ? 'bg-white text-sky-900 shadow-2xs border border-sky-300'
            : 'text-slate-600 hover:text-sky-900 hover:bg-sky-50'
        }`}
      >
        <Edit3
          className={`w-3.5 h-3.5 ${
            editedCount > 0 ? 'text-sky-600' : 'text-slate-400'
          }`}
        />
        <span>Đã chỉnh sửa</span>
        <span
          className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
            editedCount > 0
              ? 'bg-sky-100 text-sky-800 font-bold'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {editedCount}
        </span>
      </button>
    </div>
  );
};
