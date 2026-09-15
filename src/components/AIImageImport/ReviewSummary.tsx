/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAIImageImport } from '../../context/AIImageImportContext';

export const ReviewSummary: React.FC = () => {
  const { reviewDraft, restoreAllReviewEdits, openApplyPreview } = useAIImageImport();
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  if (!reviewDraft) return null;

  const unresolvedCount = reviewDraft.reviewMeta.unresolvedCellCount;
  const editedCount = reviewDraft.reviewMeta.editedCellCount;
  const isReady = unresolvedCount === 0;

  const handleConfirmReset = () => {
    restoreAllReviewEdits();
    setShowResetConfirm(false);
  };

  return (
    <div className="space-y-4 pt-2 w-full max-w-full min-w-0">
      {/* Readiness Status Banner */}
      {isReady ? (
        <div
          id="review-status-ready"
          className="p-3.5 sm:p-4 bg-emerald-50/90 border border-emerald-300 rounded-2xl flex items-start gap-3 shadow-2xs w-full min-w-0"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0 text-emerald-700 mt-0.5">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 min-w-0 flex-1">
            <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
              ✓ Kết quả đã sẵn sàng
            </h4>
            <p className="text-xs text-emerald-900 font-medium leading-relaxed">
              Bạn đã kiểm tra các ô cần chú ý. Dữ liệu hiện đã sẵn sàng cho bước
              chuẩn bị nhập vào thời khóa biểu.
            </p>
          </div>
        </div>
      ) : (
        <div
          id="review-status-blocked"
          className="p-3.5 sm:p-4 bg-amber-50/90 border border-amber-300 rounded-2xl flex items-start gap-3 shadow-2xs w-full min-w-0"
        >
          <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 text-amber-700 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 min-w-0 flex-1">
            <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
              Còn {unresolvedCount} ô cần kiểm tra
            </h4>
            <p className="text-xs text-amber-900 font-medium leading-relaxed">
              Vui lòng nhấp vào các ô có nhãn &quot;Cần kiểm tra&quot; để chọn môn học
              hoặc xác nhận trạng thái trước khi chuyển sang bước tiếp theo.
            </p>
          </div>
        </div>
      )}

      {/* Primary Actions & Reset Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 w-full min-w-0">
        <button
          id="btn-restore-all-review"
          type="button"
          onClick={() => setShowResetConfirm(true)}
          disabled={editedCount === 0 && reviewDraft.reviewMeta.editedMetadataCount === 0}
          className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          title="Khôi phục toàn bộ các thay đổi về kết quả ban đầu của Gemini"
        >
          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
          <span>Khôi phục toàn bộ kết quả Gemini</span>
        </button>

        {/* Next step button: Enabled when isReady */}
        <div className="w-full sm:w-auto flex flex-col items-center sm:items-end gap-1">
          <button
            id="btn-apply-reviewed-timetable"
            type="button"
            onClick={openApplyPreview}
            disabled={!isReady}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              isReady
                ? 'bg-violet-600 hover:bg-violet-700 text-white cursor-pointer shadow-md shadow-violet-200'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed select-none'
            }`}
            title={
              isReady
                ? 'Xem trước và tùy chọn cách nhập vào thời khóa biểu'
                : `Vui lòng kiểm tra hết các ô cần chú ý (còn ${unresolvedCount} ô) trước khi tiếp tục.`
            }
            aria-disabled={!isReady}
          >
            <Sparkles className={`w-4 h-4 shrink-0 ${isReady ? 'text-violet-200' : 'text-slate-400'}`} />
            <span>Tiếp tục nhập vào TKB</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
          <span
            className={`text-[10px] font-medium text-center ${
              isReady ? 'text-emerald-600 font-semibold' : 'text-slate-500 italic'
            }`}
          >
            {isReady
              ? 'Sẵn sàng xem trước & áp dụng vào TKB'
              : `(Còn ${unresolvedCount} ô cần kiểm tra)`}
          </span>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-confirm-title"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-rose-600">
              <RotateCcw className="w-5 h-5 shrink-0" />
              <h3 id="reset-confirm-title" className="text-sm font-bold text-slate-900">
                Khôi phục toàn bộ chỉnh sửa?
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Các thay đổi bạn đã thực hiện trong bước kiểm tra sẽ bị mất. Dữ
              liệu sẽ quay trở về đúng kết quả nhận dạng ban đầu của Gemini.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                id="btn-confirm-restore-all"
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Khôi phục
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
