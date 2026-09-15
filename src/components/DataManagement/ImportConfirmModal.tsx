import React, { useEffect } from 'react';
import { AlertTriangle, Database, X, FileText, CheckCircle2 } from 'lucide-react';
import { BackupValidationSummary } from '../../types/backup';
import { formatDateTimeVN } from '../../utils/persistenceUtils';

interface ImportConfirmModalProps {
  isOpen: boolean;
  summary: BackupValidationSummary;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ImportConfirmModal: React.FC<ImportConfirmModalProps> = ({
  isOpen,
  summary,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const formattedExportDate = summary.exportedAt
    ? formatDateTimeVN(summary.exportedAt)
    : 'Không rõ';

  return (
    <div
      id="import-confirm-overlay"
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        id="import-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-confirm-title"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-sky-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-xs">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3
                id="import-confirm-title"
                className="text-base font-bold text-slate-900 tracking-tight"
              >
                Khôi phục dữ liệu
              </h3>
              <p className="text-xs text-slate-500">Tệp sao lưu hợp lệ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors cursor-pointer"
            aria-label="Đóng"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs sm:text-sm text-slate-700">
          <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-xl px-3.5 py-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Tệp sao lưu hợp lệ và đã sẵn sàng khôi phục.</span>
          </div>

          {/* Backup Summary Box */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-sky-600" />
                Thời khóa biểu:
              </span>
              <span className="font-bold text-slate-800">
                {summary.documentCount} bản lưu
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Môn tùy chỉnh:</span>
              <span className="font-bold text-slate-800">
                {summary.customSubjectCount} môn
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Phiên bản dữ liệu:</span>
              <span className="font-mono font-semibold text-slate-700">
                v{summary.version}
              </span>
            </div>

            {summary.exportedAt && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Xuất lúc:</span>
                <span className="font-medium text-slate-700">
                  {formattedExportDate}
                </span>
              </div>
            )}
          </div>

          {/* Replacement Warning */}
          <div className="rounded-xl bg-amber-50/80 border border-amber-200/80 p-3.5 flex items-start gap-2.5 text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-200/80 text-amber-900">
                THAY THẾ DỮ LIỆU HIỆN TẠI
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Dữ liệu thời khóa biểu hiện tại trên thiết bị này sẽ được thay thế hoàn toàn bằng dữ liệu từ tệp sao lưu.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            id="btn-cancel-import"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            id="btn-confirm-import"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 transition-colors cursor-pointer shadow-xs"
          >
            Nhập dữ liệu
          </button>
        </div>
      </div>
    </div>
  );
};
