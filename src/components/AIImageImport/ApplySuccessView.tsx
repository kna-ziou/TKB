/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  RotateCcw,
  PlusCircle,
  RefreshCw,
  MinusCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { ApplyPlanSummary } from '../../types/timetableApply';
import { useGeminiCredential } from '../../context/GeminiCredentialContext';
import { useAIImageImport } from '../../context/AIImageImportContext';

interface ApplySuccessViewProps {
  summary: ApplyPlanSummary;
}

export const ApplySuccessView: React.FC<ApplySuccessViewProps> = ({ summary }) => {
  const { closeImportModal } = useGeminiCredential();
  const { resetWorkflow } = useAIImageImport();

  const handleFinish = () => {
    closeImportModal();
    resetWorkflow();
  };

  return (
    <div
      id="apply-success-view"
      className="p-4 sm:p-8 bg-white rounded-2xl border border-emerald-100 shadow-xs flex flex-col items-center text-center space-y-6 animate-in zoom-in-95 duration-200 w-full max-w-full min-w-0"
    >
      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs shrink-0">
        <CheckCircle2 className="w-9 h-9" />
      </div>

      {/* Heading */}
      <div className="space-y-1.5 max-w-md w-full min-w-0">
        <h3 className="text-xl font-bold text-slate-900 tracking-tight">
          Đã áp dụng thời khóa biểu thành công!
        </h3>
        <p className="text-sm text-slate-500">
          Toàn bộ dữ liệu từ ảnh đã được hợp nhất chính xác vào thời khóa biểu đang thiết kế.
        </p>
      </div>

      {/* Metrics breakdown card */}
      <div className="w-full max-w-lg min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-left">
        <div className="p-2.5 bg-white rounded-xl border border-slate-100 flex flex-col">
          <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
            <PlusCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px] font-bold">Thêm mới</span>
          </div>
          <span className="text-lg font-extrabold text-slate-800">
            {summary.cellsAdded} <span className="text-xs font-normal text-slate-500">ô</span>
          </span>
        </div>

        <div className="p-2.5 bg-white rounded-xl border border-slate-100 flex flex-col">
          <div className="flex items-center gap-1.5 text-blue-600 mb-1">
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px] font-bold">Thay thế</span>
          </div>
          <span className="text-lg font-extrabold text-slate-800">
            {summary.cellsReplaced} <span className="text-xs font-normal text-slate-500">ô</span>
          </span>
        </div>

        <div className="p-2.5 bg-white rounded-xl border border-slate-100 flex flex-col">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <MinusCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px] font-bold">Bỏ qua / Giữ</span>
          </div>
          <span className="text-lg font-extrabold text-slate-800">
            {summary.cellsSkipped + summary.cellsUnchanged} <span className="text-xs font-normal text-slate-500">ô</span>
          </span>
        </div>

        <div className="p-2.5 bg-white rounded-xl border border-slate-100 flex flex-col">
          <div className="flex items-center gap-1.5 text-violet-600 mb-1">
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px] font-bold">Thông tin & Cấu trúc</span>
          </div>
          <span className="text-xs font-bold text-slate-700 leading-tight">
            {summary.metadataChanged > 0 || summary.structureChanged > 0
              ? 'Đã cập nhật'
              : 'Giữ nguyên'}
          </span>
        </div>
      </div>

      {/* Undo guarantee tip */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-amber-800 text-xs font-medium text-left max-w-lg w-full min-w-0">
        <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
        <span className="min-w-0 flex-1">
          <strong>Lưu ý:</strong> Bạn luôn có thể nhấn nút <strong>Hoàn tác (Undo)</strong> hoặc phím tắt <strong>Ctrl+Z</strong> trên màn hình chính bất cứ lúc nào để quay lại trạng thái trước khi nhập.
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm min-w-0 pt-2">
        <button
          type="button"
          id="btn-apply-success-close"
          onClick={handleFinish}
          className="w-full py-3 px-5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm shadow-md shadow-violet-200 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Xem thời khóa biểu ngay</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
