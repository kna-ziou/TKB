/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Plus,
  RefreshCw,
  Minus,
  AlertTriangle,
  Check,
  Ban,
} from 'lucide-react';
import {
  CellApplyChange,
  CellResolutionAction,
} from '../../types/timetableApply';
import { useAIImageImport } from '../../context/AIImageImportContext';

interface ApplyGridCellProps {
  change: CellApplyChange;
}

export const ApplyGridCell: React.FC<ApplyGridCellProps> = ({ change }) => {
  const { updateApplyOverride } = useAIImageImport();

  const {
    cellId,
    periodNumber,
    currentSubject,
    aiSubject,
    finalSubject,
    currentValue,
    reviewValue,
    resultValue,
    classification,
    isConflict,
    resolution,
  } = change;

  const displayCurrent = currentValue !== undefined ? currentValue : currentSubject;
  const displayReview = reviewValue !== undefined ? reviewValue : aiSubject;
  const displayResult = resultValue !== undefined ? resultValue : finalSubject;

  // Background and border styling based on classification
  const getStyling = () => {
    switch (classification) {
      case 'add':
        return 'bg-emerald-50/70 border-emerald-300 text-emerald-950 hover:bg-emerald-100/70';
      case 'replace':
        return 'bg-blue-50/70 border-blue-300 text-blue-950 hover:bg-blue-100/70';
      case 'skip':
        return isConflict
          ? 'bg-amber-50/70 border-amber-300 text-amber-950 hover:bg-amber-100/70'
          : 'bg-slate-50 border-slate-200 text-slate-700';
      case 'clear_conflict':
        return 'bg-rose-50/70 border-rose-300 text-rose-950 hover:bg-rose-100/70';
      case 'unmappable':
        return 'bg-red-50 border-red-300 text-red-900 opacity-80';
      case 'empty_unchanged':
        return 'bg-slate-50/50 border-slate-200/60 text-slate-400';
      case 'unchanged':
      default:
        return 'bg-slate-50/60 border-slate-200 text-slate-600';
    }
  };

  const getBadge = () => {
    switch (classification) {
      case 'add':
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
            <Plus className="w-2.5 h-2.5" /> Thêm
          </span>
        );
      case 'replace':
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
            <RefreshCw className="w-2.5 h-2.5" /> Thay thế
          </span>
        );
      case 'skip':
        return isConflict ? (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
            <Ban className="w-2.5 h-2.5" /> Giữ cũ
          </span>
        ) : (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
            Giữ
          </span>
        );
      case 'clear_conflict':
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
            <Minus className="w-2.5 h-2.5" /> Xóa
          </span>
        );
      case 'unmappable':
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
            <AlertTriangle className="w-2.5 h-2.5" /> Ngoài lưới
          </span>
        );
      case 'empty_unchanged':
        return (
          <span className="text-[10px] text-slate-400 font-mono">
            —
          </span>
        );
      case 'unchanged':
      default:
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
            <Check className="w-2.5 h-2.5" /> Khớp
          </span>
        );
    }
  };

  const handleSelectResolution = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateApplyOverride(cellId, e.target.value as CellResolutionAction);
  };

  return (
    <div
      id={`apply-cell-${cellId}`}
      className={`p-2 rounded-xl border transition-all flex flex-col justify-between gap-1.5 min-h-[82px] text-xs min-w-0 ${getStyling()}`}
    >
      {/* Top row: badge & period info */}
      <div className="flex items-center justify-between gap-1 min-w-0">
        <span className="text-[10px] font-mono font-semibold text-slate-400 shrink-0">
          T{periodNumber}
        </span>
        <div className="shrink-0">{getBadge()}</div>
      </div>

      {/* Content comparison */}
      <div className="space-y-0.5 my-auto min-w-0 w-full">
        {classification === 'unchanged' || classification === 'empty_unchanged' ? (
          <div className="font-bold truncate text-slate-800">
            {displayResult || <span className="text-slate-400 font-normal italic">(Trống)</span>}
          </div>
        ) : (
          <div className="space-y-1 min-w-0 w-full">
            {isConflict ? (
              <div className="text-[11px] leading-tight space-y-0.5 min-w-0">
                <div className="flex items-center gap-1 text-slate-500 min-w-0">
                  <span className="text-[9px] uppercase font-semibold text-slate-400 shrink-0">Cũ:</span>
                  <span
                    className={`truncate font-medium min-w-0 flex-1 ${
                      classification !== 'skip' ? 'line-through text-slate-400' : 'text-slate-700'
                    }`}
                  >
                    {displayCurrent || '(Trống)'}
                  </span>
                </div>
                <div className="flex items-center gap-1 font-bold text-slate-800 min-w-0">
                  <span className="text-[9px] uppercase font-semibold text-violet-500 shrink-0">Mới:</span>
                  <span className="truncate min-w-0 flex-1">
                    {displayReview || <span className="font-normal italic text-slate-400">(Trống)</span>}
                  </span>
                </div>
              </div>
            ) : (
              <div className="font-bold truncate text-slate-800">
                {displayResult || <span className="text-slate-400 font-normal italic">(Trống)</span>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interactive resolution override for conflict cells */}
      {isConflict && (
        <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between gap-1 min-w-0 w-full">
          <label htmlFor={`override-sel-${cellId}`} className="sr-only">
            Ghi đè ô T{periodNumber}
          </label>
          <select
            id={`override-sel-${cellId}`}
            value={resolution}
            onChange={handleSelectResolution}
            className="w-full min-w-0 text-[10px] py-0.5 px-1 bg-white/90 border border-slate-300 rounded font-medium text-slate-700 cursor-pointer hover:border-slate-400 focus:outline-hidden focus:ring-1 focus:ring-violet-500"
          >
            <option value="auto">Tự động</option>
            <option value="keep_current">Giữ hiện tại ({displayCurrent || 'Trống'})</option>
            <option value="use_image">Dùng từ ảnh ({displayReview || 'Trống'})</option>
          </select>
        </div>
      )}
    </div>
  );
};
