/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  PlusCircle,
  RefreshCw,
  MinusCircle,
  ShieldCheck,
} from 'lucide-react';
import { TimetableApplyPlan } from '../../types/timetableApply';
import { useAIImageImport } from '../../context/AIImageImportContext';

interface ApplyStatusBarProps {
  plan: TimetableApplyPlan | null;
  onOpenConfirm: () => void;
}

export const ApplyStatusBar: React.FC<ApplyStatusBarProps> = ({
  plan,
  onOpenConfirm,
}) => {
  const { backToReviewWorkspace, isApplying } = useAIImageImport();
  const statusBarRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = statusBarRef.current;
    if (!el) return;

    const updateHeight = () => {
      const height = el.getBoundingClientRect().height || el.offsetHeight;
      if (height > 0) {
        const workspace = el.closest('#apply-preview-workspace') as HTMLElement | null;
        if (workspace) {
          workspace.style.setProperty('--apply-status-bar-height', `${height}px`);
        }
        document.documentElement.style.setProperty('--apply-status-bar-height', `${height}px`);
      }
    };

    updateHeight();

    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);

    return () => ro.disconnect();
  }, [plan]);

  const summary = plan?.summary;
  const isValid = plan?.isValid ?? false;
  const hasConflicts = (summary?.conflicts ?? 0) > 0;

  return (
    <div
      ref={statusBarRef}
      id="apply-status-bar"
      className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs border-b border-slate-200 py-3 px-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 w-full max-w-full min-w-0"
    >
      {/* Left: Back to Review button */}
      <div className="flex items-center gap-2 min-w-0 flex-wrap">
        <button
          type="button"
          id="btn-back-to-review"
          onClick={backToReviewWorkspace}
          className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại kiểm tra</span>
        </button>

        <span className="hidden md:inline-block h-4 w-px bg-slate-200" />

        <div className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-slate-700 min-w-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="truncate">Xem trước & Áp dụng</span>
        </div>
      </div>

      {/* Middle: Summary Metrics Badges */}
      {summary && (
        <div className="flex items-center flex-wrap gap-1.5 text-xs font-medium min-w-0 max-w-full">
          <span
            id="badge-plan-add"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-semibold"
            title="Số ô trống sẽ được thêm mới"
          >
            <PlusCircle className="w-3 h-3 text-emerald-600" />
            <span>+{summary.cellsAdded} mới</span>
          </span>

          <span
            id="badge-plan-replace"
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold ${
              summary.cellsReplaced > 0
                ? 'bg-blue-50 text-blue-700 border border-blue-200/80'
                : 'bg-slate-50 text-slate-500 border border-slate-200/60'
            }`}
            title="Số ô hiện tại sẽ được thay thế bằng môn từ ảnh"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{summary.cellsReplaced} thay thế</span>
          </span>

          {summary.cellsCleared > 0 && (
            <span
              id="badge-plan-cleared"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200/80 font-semibold"
              title="Số ô hiện tại sẽ bị xóa nội dung"
            >
              <MinusCircle className="w-3 h-3 text-rose-600" />
              <span>−{summary.cellsCleared} xóa</span>
            </span>
          )}

          {hasConflicts && (
            <span
              id="badge-plan-conflicts"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/80 font-semibold animate-pulse"
              title="Số ô có khác biệt môn giữa thời khóa biểu và ảnh"
            >
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              <span>{summary.conflicts} xung đột</span>
            </span>
          )}

          <span
            id="badge-plan-skip"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200/80 text-[11px]"
            title="Số ô được giữ nguyên"
          >
            <MinusCircle className="w-3 h-3 text-slate-400" />
            <span>{summary.cellsSkipped + summary.cellsUnchanged} giữ nguyên</span>
          </span>
        </div>
      )}

      {/* Right: Primary Apply CTA */}
      <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
        <button
          type="button"
          id="btn-open-apply-confirm"
          onClick={onOpenConfirm}
          disabled={!isValid || isApplying}
          className={`w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs select-none ${
            isValid && !isApplying
              ? 'bg-violet-600 hover:bg-violet-700 text-white cursor-pointer hover:shadow-violet-200 hover:shadow-md'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200'
          }`}
          title={
            !isValid
              ? plan?.blockingIssues.join('; ') || 'Dữ liệu chưa thể áp dụng'
              : 'Mở xác nhận để áp dụng toàn bộ vào thời khóa biểu'
          }
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isApplying ? 'Đang áp dụng...' : 'Áp dụng vào TKB'}</span>
        </button>
      </div>
    </div>
  );
};
