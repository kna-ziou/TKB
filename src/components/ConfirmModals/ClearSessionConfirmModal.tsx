import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { SessionType } from '../../types/timetable';

interface ClearSessionConfirmModalProps {
  session: SessionType | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (session: SessionType) => void;
}

export const ClearSessionConfirmModal: React.FC<ClearSessionConfirmModalProps> = ({
  session,
  isOpen,
  onClose,
  onConfirm,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !session) return null;

  const sessionLabel = session === 'morning' ? 'buổi sáng' : 'buổi chiều';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs no-print">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="clear-session-title"
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0 text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h3
          id="clear-session-title"
          className="text-lg font-bold text-slate-900 mb-2"
        >
          Xóa toàn bộ môn {sessionLabel}?
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          Tất cả các tiết học của{' '}
          <span className="font-semibold text-slate-800">{sessionLabel}</span> trên mọi ngày trong tuần sẽ được xóa khỏi thời khóa biểu. Thao tác này có thể khôi phục bằng{' '}
          <span className="font-medium text-indigo-600">Hoàn tác (Ctrl+Z)</span>.
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(session);
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Xóa môn {sessionLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
