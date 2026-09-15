/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  HelpCircle,
  EyeOff,
} from 'lucide-react';
import { CellStatus } from '../../types/timetableRecognition';
import {
  ReviewCell,
  REVIEW_CONFIDENCE_THRESHOLD,
} from '../../types/timetableReview';
import { useAIImageImport } from '../../context/AIImageImportContext';

interface ReviewCellEditorProps {
  cell: ReviewCell;
  onClose: () => void;
}

export const ReviewCellEditor: React.FC<ReviewCellEditorProps> = ({
  cell,
  onClose,
}) => {
  const { updateCell, restoreCell, confirmCell } = useAIImageImport();

  const [subject, setSubject] = useState<string>(cell.current.subject ?? '');
  const [status, setStatus] = useState<CellStatus>(cell.current.status);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // Initial focus management
  useEffect(() => {
    if (status === 'recognized' || status === 'uncertain') {
      inputRef.current?.focus();
    } else {
      cancelBtnRef.current?.focus();
    }
  }, []);

  // Subsequent focus when status switches to recognized or uncertain
  useEffect(() => {
    if (status === 'recognized' || status === 'uncertain') {
      inputRef.current?.focus();
    }
  }, [status]);

  // Handle ESC key with child dialog priority:
  // Capture phase listener ensures child dialog intercepts ESC before parent modal or bubbling listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  const handleStatusChange = (newStatus: CellStatus) => {
    setStatus(newStatus);
    if (newStatus === 'empty' || newStatus === 'unreadable') {
      setSubject('');
    } else if (!subject && cell.original.subjectRaw) {
      setSubject(cell.original.subjectNormalized || cell.original.subjectRaw);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Enforce consistency rules
    if (status === 'recognized') {
      const trimmed = subject.trim();
      if (!trimmed) {
        // If user wants recognized, subject cannot be empty
        return;
      }
      updateCell(cell.id, { status: 'recognized', subject: trimmed });
    } else if (status === 'empty') {
      updateCell(cell.id, { status: 'empty', subject: null });
    } else if (status === 'unreadable') {
      updateCell(cell.id, { status: 'unreadable', subject: null });
    } else {
      // uncertain
      updateCell(cell.id, {
        status: 'uncertain',
        subject: subject.trim() || null,
      });
    }

    onClose();
  };

  const handleRestore = () => {
    restoreCell(cell.id);
    onClose();
  };

  const handleConfirmOriginal = () => {
    confirmCell(cell.id);
    onClose();
  };

  const confidencePercent = Math.round(cell.original.confidence * 100);
  const isLowConfidence = cell.original.confidence < REVIEW_CONFIDENCE_THRESHOLD;

  const statusOptions: Array<{
    value: CellStatus;
    label: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      value: 'recognized',
      label: 'Đã nhận dạng',
      description: 'Có môn học rõ ràng',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
    },
    {
      value: 'empty',
      label: 'Ô trống',
      description: 'Không có môn học',
      icon: <span className="w-4 h-4 font-bold text-slate-400 text-center leading-none">—</span>,
    },
    {
      value: 'uncertain',
      label: 'Cần kiểm tra',
      description: 'Chữ mờ hoặc chưa chắc chắn',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
    },
    {
      value: 'unreadable',
      label: 'Không đọc được',
      description: 'Bị che khuất hoặc rách',
      icon: <EyeOff className="w-4 h-4 text-rose-600" />,
    },
  ];

  return (
    <div
      id="review-cell-editor-modal"
      data-nested-dialog="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cell-editor-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-100">
          <div>
            <h3 id="cell-editor-title" className="text-sm font-bold text-slate-900">
              Chỉnh sửa ô thời khóa biểu
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {cell.sessionKey === 'morning' ? 'Buổi sáng' : 'Buổi chiều'} • Tiết {cell.periodNumber}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Read-only Gemini Reference Card */}
          <div className="p-3 bg-violet-50/70 border border-violet-200/80 rounded-xl text-xs space-y-1">
            <div className="flex items-center justify-between text-violet-900">
              <span className="flex items-center gap-1 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                Gemini đọc:
              </span>
              <span className="font-mono text-[11px] text-violet-700 font-semibold">
                Độ tin cậy: {confidencePercent}%
              </span>
            </div>
            <div className="text-slate-800 font-semibold pl-4.5">
              {cell.original.subjectRaw ? (
                <span>&quot;{cell.original.subjectRaw}&quot;</span>
              ) : (
                <span className="text-slate-400 italic">(Không có chữ)</span>
              )}
              {cell.original.subjectNormalized &&
                cell.original.subjectNormalized !== cell.original.subjectRaw && (
                  <span className="text-slate-500 text-[11px] ml-1.5">
                    → Chuẩn hóa: &quot;{cell.original.subjectNormalized}&quot;
                  </span>
                )}
            </div>

            {/* Quick action: If low confidence recognized and user confirms it's correct */}
            {isLowConfidence && cell.original.status === 'recognized' && (
              <div className="pt-2 border-t border-violet-200/60 flex items-center justify-between">
                <span className="text-[11px] text-amber-800 font-medium flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-amber-600 shrink-0" />
                  Độ tin cậy &lt; 80%
                </span>
                <button
                  type="button"
                  id="btn-confirm-low-confidence"
                  onClick={handleConfirmOriginal}
                  className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/90 hover:bg-emerald-200/90 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
                  title="Xác nhận kết quả của Gemini là chính xác"
                >
                  Xác nhận đúng
                </button>
              </div>
            )}
          </div>

          {/* Status Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Trạng thái ô:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleStatusChange(opt.value)}
                  className={`p-2.5 text-left rounded-xl border transition-all cursor-pointer flex items-start gap-2 ${
                    status === opt.value
                      ? 'border-violet-600 bg-violet-50/70 ring-1 ring-violet-500 shadow-2xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <span className="mt-0.5 shrink-0">{opt.icon}</span>
                  <div>
                    <p
                      className={`text-xs font-bold ${
                        status === opt.value ? 'text-violet-950' : 'text-slate-800'
                      }`}
                    >
                      {opt.label}
                    </p>
                    <p className="text-[10px] text-slate-500">{opt.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Subject Text Input (only when recognized or uncertain) */}
          {(status === 'recognized' || status === 'uncertain') && (
            <div className="space-y-1">
              <label
                htmlFor="edit-cell-subject-input"
                className="block text-xs font-bold text-slate-700"
              >
                Tên môn học:
              </label>
              <input
                ref={inputRef}
                id="edit-cell-subject-input"
                type="text"
                maxLength={100}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="VD: Toán, Ngữ văn, Tiếng Anh..."
                required={status === 'recognized'}
                className="w-full px-3.5 py-2 text-sm font-semibold bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
              />
              {status === 'recognized' && !subject.trim() && (
                <p className="text-[11px] text-rose-600">
                  Vui lòng nhập tên môn hoặc chọn trạng thái khác.
                </p>
              )}
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              id="btn-restore-gemini-cell"
              type="button"
              onClick={handleRestore}
              disabled={!cell.edited && !cell.reviewConfirmed}
              className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              title="Khôi phục lại giá trị Gemini ban đầu cho ô này"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi phục Gemini</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                ref={cancelBtnRef}
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                id="btn-save-cell-edit"
                type="submit"
                disabled={status === 'recognized' && !subject.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
