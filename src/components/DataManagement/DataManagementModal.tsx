import React, { useState, useRef, useEffect } from 'react';
import {
  Database,
  Download,
  Upload,
  Trash2,
  X,
  FileText,
  AlertCircle,
  HardDrive,
  BookOpen,
} from 'lucide-react';
import { useDocumentLibrary } from '../../context/DocumentLibraryContext';
import { parseBackupFile } from '../../services/backupService';
import { BackupValidationSummary } from '../../types/backup';
import { PersistedLibrary } from '../../types/persistence';
import { ImportConfirmModal } from './ImportConfirmModal';
import { ResetConfirmModal } from './ResetConfirmModal';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    diagnostics,
    exportBackup,
    restoreBackup,
    resetAllData,
    showToast,
  } = useDocumentLibrary();

  const [isDragOver, setIsDragOver] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    library: PersistedLibrary;
    summary: BackupValidationSummary;
  } | null>(null);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isImportConfirmOpen && !isResetConfirmOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isImportConfirmOpen, isResetConfirmOpen, onClose]);

  if (!isOpen) return null;

  // Handle Export Backup
  const handleExport = () => {
    try {
      exportBackup();
      setStatusMessage({
        type: 'success',
        text: 'Đã tạo và tải xuống tệp sao lưu JSON thành công.',
      });
      showToast('Đã xuất tệp sao lưu dữ liệu thành công.');
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Có lỗi xảy ra khi xuất dữ liệu sao lưu.',
      });
    }
  };

  // Process Selected File
  const handleProcessFile = async (file: File) => {
    setStatusMessage(null);

    const result = await parseBackupFile(file);

    if (result.isValid) {
      // Prepare import confirmation
      setPendingImport({
        library: result.library,
        summary: result.summary,
      });
      setIsImportConfirmOpen(true);
    } else {
      setStatusMessage({
        type: 'error',
        text: result.errorMessage,
      });
      showToast(result.errorMessage);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  // Confirm Import
  const handleConfirmImport = () => {
    if (!pendingImport) return;
    const success = restoreBackup(pendingImport.library);
    if (success) {
      setIsImportConfirmOpen(false);
      setPendingImport(null);
      onClose();
    }
  };

  // Confirm Reset
  const handleConfirmReset = () => {
    resetAllData();
    setIsResetConfirmOpen(false);
    onClose();
  };

  return (
    <div
      id="data-management-overlay"
      className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="data-management-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="data-management-title"
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="data-management-title"
                className="text-base sm:text-lg font-bold text-slate-900 tracking-tight"
              >
                QUẢN LÝ DỮ LIỆU
              </h2>
              <p className="text-xs text-slate-500">
                Sao lưu, khôi phục hoặc thiết lập lại bộ nhớ ứng dụng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Đóng"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-700">
          {/* Storage Diagnostics Overview */}
          <div
            id="data-storage-diagnostics"
            className="bg-slate-50/90 rounded-xl p-4 border border-slate-200/90"
          >
            <div className="flex items-center gap-2 mb-3">
              <HardDrive className="w-4 h-4 text-sky-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Trạng thái lưu trữ cục bộ
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4 text-center">
              <div className="bg-white rounded-lg p-2.5 border border-slate-200/70 shadow-2xs">
                <div className="text-base sm:text-lg font-bold text-slate-900">
                  {diagnostics.documentCount}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  Thời khóa biểu
                </div>
              </div>
              <div className="bg-white rounded-lg p-2.5 border border-slate-200/70 shadow-2xs">
                <div className="text-base sm:text-lg font-bold text-slate-900">
                  {diagnostics.customSubjectCount}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  Môn tùy chỉnh
                </div>
              </div>
              <div className="bg-white rounded-lg p-2.5 border border-slate-200/70 shadow-2xs">
                <div className="text-base sm:text-lg font-bold text-sky-700 font-mono">
                  {diagnostics.approximateFormattedSize}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  Dung lượng ước tính
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-200/60 space-y-1">
              <p className="flex items-center gap-1.5 font-medium text-slate-600">
                <BookOpen className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span>Dữ liệu được lưu trên trình duyệt của thiết bị này.</span>
              </p>
              <p className="text-[10.5px] text-slate-400 pl-5">
                Xóa dữ liệu duyệt web hoặc bộ nhớ cache có thể làm mất thời khóa biểu. Hãy dùng &ldquo;Xuất dữ liệu&rdquo; để sao lưu an toàn hoặc chuyển đổi sang thiết bị khác.
              </p>
            </div>
          </div>

          {/* Status feedback message */}
          {statusMessage && (
            <div
              id="data-status-banner"
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-medium animate-in fade-in duration-150 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Primary Operations: Export & Import */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Sao lưu & Khôi phục
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Export Card */}
              <div
                id="card-export-backup"
                className="bg-white rounded-xl p-4 border border-slate-200 hover:border-sky-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                      <Download className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-900 text-sm">
                      Xuất dữ liệu
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Tải về toàn bộ thời khóa biểu và môn học thành tệp sao lưu JSON để lưu trữ hoặc chuyển sang máy khác.
                  </p>
                </div>

                <button
                  type="button"
                  id="btn-export-backup"
                  onClick={handleExport}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất dữ liệu (.json)</span>
                </button>
              </div>

              {/* Import Card */}
              <div
                id="card-import-backup"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`bg-white rounded-xl p-4 border transition-all flex flex-col justify-between gap-3 ${
                  isDragOver
                    ? 'border-sky-500 bg-sky-50/50 ring-2 ring-sky-400/30'
                    : 'border-slate-200 hover:border-sky-300 hover:shadow-xs'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Upload className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-900 text-sm">
                      Nhập dữ liệu
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Khôi phục thời khóa biểu từ tệp sao lưu JSON. Bạn sẽ được xem thông tin tệp trước khi xác nhận.
                  </p>
                </div>

                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="input-import-backup"
                    accept=".json,application/json"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    id="btn-import-backup"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-300 hover:border-slate-400 transition-colors cursor-pointer shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Chọn tệp sao lưu (.json)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Destructive Section: Reset Data */}
          <div className="pt-3 border-t border-slate-200/90">
            <div
              id="card-reset-data"
              className="bg-rose-50/50 rounded-xl p-4 border border-rose-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                  <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Đặt lại dữ liệu</span>
                </div>
                <p className="text-xs text-rose-700/90">
                  Xóa tất cả thời khóa biểu và môn tùy chỉnh, khôi phục cài đặt gốc của ứng dụng.
                </p>
              </div>

              <button
                type="button"
                id="btn-open-reset-confirm"
                onClick={() => setIsResetConfirmOpen(true)}
                className="shrink-0 px-3.5 py-2 rounded-xl bg-white hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-300 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              >
                Đặt lại dữ liệu...
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Import Confirmation Modal */}
      {pendingImport && (
        <ImportConfirmModal
          isOpen={isImportConfirmOpen}
          summary={pendingImport.summary}
          onConfirm={handleConfirmImport}
          onCancel={() => {
            setIsImportConfirmOpen(false);
            setPendingImport(null);
          }}
        />
      )}

      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <ResetConfirmModal
          isOpen={isResetConfirmOpen}
          onConfirm={handleConfirmReset}
          onCancel={() => setIsResetConfirmOpen(false)}
        />
      )}
    </div>
  );
};
