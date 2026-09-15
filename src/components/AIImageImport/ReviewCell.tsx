/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Edit3, AlertTriangle, EyeOff } from 'lucide-react';
import { ReviewCell as ReviewCellType } from '../../types/timetableReview';
import { isCellNeedsReview } from '../../services/timetableReviewService';

interface ReviewCellProps {
  cell: ReviewCellType;
  onSelect: (cell: ReviewCellType) => void;
  dayLabel: string;
}

export const ReviewCell: React.FC<ReviewCellProps> = ({
  cell,
  onSelect,
  dayLabel,
}) => {
  const needsReview = isCellNeedsReview(cell);
  const isEdited = cell.edited;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(cell);
    }
  };

  // Build descriptive ARIA label
  const sessionText = cell.sessionKey === 'morning' ? 'Sáng' : 'Chiều';
  const statusText =
    cell.current.status === 'recognized'
      ? `Môn ${cell.current.subject || '(chưa rõ)'}`
      : cell.current.status === 'empty'
      ? 'Ô trống'
      : cell.current.status === 'unreadable'
      ? 'Không đọc được'
      : 'Cần kiểm tra';

  const ariaLabel = `${dayLabel}, ${sessionText} Tiết ${cell.periodNumber}: ${statusText}${
    isEdited ? ', đã chỉnh sửa' : ''
  }${needsReview ? ', cần kiểm tra' : ''}`;

  // Content rendering based on status
  const renderContent = () => {
    switch (cell.current.status) {
      case 'recognized':
        return (
          <span className="font-bold text-slate-900 text-xs truncate max-w-full block">
            {cell.current.subject || '(Chưa nhập)'}
          </span>
        );
      case 'empty':
        return (
          <span className="text-slate-300 font-bold text-sm tracking-widest select-none">
            —
          </span>
        );
      case 'uncertain':
        return (
          <div className="space-y-0.5 max-w-full">
            <span className="font-bold text-amber-950 text-xs truncate max-w-full block">
              {cell.current.subject || 'Chưa rõ'}
            </span>
          </div>
        );
      case 'unreadable':
        return (
          <span className="text-[11px] font-bold text-rose-700 flex items-center justify-center gap-1">
            <EyeOff className="w-3 h-3 shrink-0" />
            <span className="truncate">Không đọc được</span>
          </span>
        );
    }
  };

  return (
    <div
      role="gridcell"
      tabIndex={0}
      id={`review-cell-${cell.id}`}
      aria-label={ariaLabel}
      onClick={() => onSelect(cell)}
      onKeyDown={handleKeyDown}
      className={`relative min-h-[58px] p-2 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer select-none group focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1 ${
        needsReview
          ? 'bg-amber-50/90 border-amber-300 hover:bg-amber-100/90 hover:border-amber-400'
          : isEdited
          ? 'bg-sky-50/70 border-sky-300 hover:bg-sky-100/80 hover:border-sky-400'
          : cell.current.status === 'empty'
          ? 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/80'
          : 'bg-white border-slate-200/90 hover:bg-violet-50/40 hover:border-violet-300'
      }`}
    >
      {/* Badges row in corner */}
      <div className="absolute top-1 right-1 flex items-center gap-0.5 pointer-events-none">
        {isEdited && (
          <span
            title="Đã chỉnh sửa"
            className="flex items-center text-[9px] font-bold text-sky-700 bg-sky-100 px-1 py-0.2 rounded border border-sky-200"
          >
            <Edit3 className="w-2.5 h-2.5 mr-0.5" />
            Sửa
          </span>
        )}
        {needsReview && (
          <span
            title="Cần kiểm tra"
            className="flex items-center text-[9px] font-bold text-amber-800 bg-amber-200/80 px-1 py-0.2 rounded border border-amber-300"
          >
            <AlertTriangle className="w-2.5 h-2.5 mr-0.5 text-amber-700" />
            Kiểm tra
          </span>
        )}
      </div>

      {/* Main Cell Content */}
      <div className="w-full px-1">{renderContent()}</div>
    </div>
  );
};
