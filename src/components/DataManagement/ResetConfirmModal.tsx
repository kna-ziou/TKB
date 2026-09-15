import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  const [confirmInput, setConfirmInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmInput('');
    }
  }, [isOpen]);

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

  const normalizedInput = confirmInput
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, ' ');
  const isConfirmed = normalizedInput === 'XOA DU LIEU' || normalizedInput === 'XOA';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isConfirmed) {
      onConfirm();
    }
  };

  return (
    <div
      id="reset-confirm-overlay"
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        id="reset-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-confirm-title"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-rose-100 bg-rose-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3
                id="reset-confirm-title"
                className="text-base font-bold text-rose-950 tracking-tight"
              >
                Đặt lại toàn bộ dữ liệu?
              </h3>
              <p className="text-xs text-rose-700">Khôi phục về trạng thái ban đầu</p>
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

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">
              Tất cả thời khóa biểu đã lưu, môn tùy chỉnh, màu sắc và thiết lập trên trình duyệt này sẽ bị xóa.
            </p>
            <p className="text-rose-600 font-medium">
              Hành động này không thể hoàn tác. Dữ liệu của các ứng dụng khác trên trình duyệt sẽ không bị ảnh hưởng.
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="reset-confirm-input"
              className="block text-xs font-semibold text-slate-700"
            >
              Để xác nhận, vui lòng nhập chữ{' '}
              <span className="font-mono font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                XOA DU LIEU
              </span>{' '}
              vào ô bên dưới:
            </label>
            <input
              id="reset-confirm-input"
              type="text"
              autoFocus
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="Nhập XOA DU LIEU để kích hoạt nút"
              className="w-full px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all text-slate-800"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              id="btn-cancel-reset"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              id="btn-confirm-reset"
              disabled={!isConfirmed}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                isConfirmed
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa toàn bộ dữ liệu</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
