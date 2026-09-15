/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  PlusCircle,
  RefreshCw,
  MinusCircle,
} from 'lucide-react';
import { TimetableApplyPlan } from '../../types/timetableApply';
import { useAIImageImport } from '../../context/AIImageImportContext';

interface ApplyConfirmModalProps {
  plan: TimetableApplyPlan;
  isOpen: boolean;
  onClose: () => void;
}

export const ApplyConfirmModal: React.FC<ApplyConfirmModalProps> = ({
  plan,
  isOpen,
  onClose,
}) => {
  const { executeApplyToTimetable, isApplying } = useAIImageImport();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const { summary } = plan;
  const hasDestructive = summary.cellsReplaced > 0 || summary.cellsCleared > 0;

  const handleConfirm = () => {
    const success = executeApplyToTimetable();
    if (success) {
      onClose();
    }
  };

  return (
    <div
      id="apply-confirm-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print animate-in fade-in duration-150 overflow-y-auto overflow-x-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="apply-confirm-title"
    >
      <div
        id="apply-confirm-modal"
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5 min-w-0 max-w-full my-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                hasDestructive
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-violet-100 text-violet-700'
              }`}
            >
              {hasDestructive ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3
                id="apply-confirm-title"
                className="text-base font-bold text-slate-900 tracking-tight"
              >
                Xác nhận áp dụng vào TKB
              </h3>
              <p className="text-xs text-slate-500">
                Toàn bộ thay đổi sẽ được áp dụng đồng thời
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-confirm-x"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Change Breakdown */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <div className="font-bold text-slate-700 mb-1">Tóm tắt nội dung thay đổi:</div>

          <div className="space-y-1.5 text-slate-600">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                Thêm môn vào ô trống:
              </span>
              <span className="font-bold text-emerald-700">
                +{summary.cellsAdded} ô
              </span>
            </div>

            {summary.cellsReplaced > 0 && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-blue-700">
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                  Ghi đè thay thế môn:
                </span>
                <span className="font-bold text-blue-700">
                  {summary.cellsReplaced} ô
                </span>
              </div>
            )}

            {summary.cellsCleared > 0 && (
              <div id="confirm-stat-cleared" className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-rose-700">
                  <MinusCircle className="w-3.5 h-3.5 text-rose-600" />
                  Xóa:
                </span>
                <span className="font-bold text-rose-700">
                  {summary.cellsCleared} ô
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-slate-500" />
                Giữ nguyên ô cũ / không đổi:
              </span>
              <span className="font-semibold text-slate-700">
                {summary.cellsSkipped + summary.cellsUnchanged} ô
              </span>
            </div>
          </div>
        </div>

        {/* Destructive Clear Warning */}
        {summary.cellsCleared > 0 && (
          <div
            id="confirm-destructive-clear-warning"
            className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1"
          >
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Cảnh báo xóa dữ liệu: Xóa {summary.cellsCleared} ô</span>
            </div>
            <p className="text-[11px] text-rose-800">
              Thao tác này sẽ xóa nội dung của {summary.cellsCleared} ô hiện có.
            </p>
          </div>
        )}

        {/* Warning if replacing existing cells */}
        {summary.cellsReplaced > 0 && (
          <div
            id="confirm-replace-warning"
            className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1"
          >
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Có {summary.cellsReplaced} ô hiện tại sẽ bị thay thế</span>
            </div>
            <p className="text-[11px] text-amber-800">
              Các môn hiện có trong những ô này sẽ được cập nhật theo dữ liệu mới từ ảnh.
            </p>
          </div>
        )}

        {/* Undo guarantee reassurance */}
        <div className="flex items-start gap-2 p-2.5 bg-slate-100 rounded-xl text-[11px] text-slate-600">
          <RotateCcw className="w-3.5 h-3.5 text-violet-600 shrink-0 mt-0.5" />
          <span>
            Bạn luôn có thể bấm nút <strong>Hoàn tác (Undo)</strong> một lần duy nhất để quay lại thời khóa biểu trước khi áp dụng.
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            id="btn-cancel-apply"
            onClick={onClose}
            disabled={isApplying}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            id="btn-confirm-apply"
            onClick={handleConfirm}
            disabled={isApplying}
            className="px-5 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isApplying ? 'Đang áp dụng...' : 'Xác nhận áp dụng'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
