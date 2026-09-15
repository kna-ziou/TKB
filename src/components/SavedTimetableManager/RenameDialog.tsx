import React, { useState, useEffect } from 'react';
import { Edit3, X } from 'lucide-react';

interface RenameDialogProps {
  isOpen: boolean;
  initialName: string;
  onSave: (newName: string) => void;
  onCancel: () => void;
}

export const RenameDialog: React.FC<RenameDialogProps> = ({
  isOpen,
  initialName,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    setName(initialName);
  }, [initialName, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  return (
    <div
      id="rename-dialog-overlay"
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        id="rename-dialog-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-dialog-title"
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-sky-50/50">
          <div className="flex items-center gap-2.5 text-sky-900 font-bold text-base">
            <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-600">
              <Edit3 className="w-4 h-4" />
            </div>
            <h3 id="rename-dialog-title">Đổi tên bản lưu</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-3">
            <label
              htmlFor="rename-input-field"
              className="block text-xs font-semibold text-slate-700"
            >
              Tên thời khóa biểu
            </label>
            <input
              id="rename-input-field"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: TKB 4A1, TKB Minh Khang..."
              maxLength={60}
              autoFocus
              className="w-full px-3.5 py-2 text-sm text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
            />
            <p className="text-[11px] text-slate-400">
              Lưu ý: Đổi tên bản lưu giúp bạn phân biệt trong danh sách, không làm thay đổi tiêu đề hiển thị trên bản in A4.
            </p>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
            <button
              type="button"
              id="btn-cancel-rename"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer shadow-xs"
            >
              Hủy
            </button>
            <button
              type="submit"
              id="btn-save-rename"
              disabled={!name.trim()}
              className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer shadow-sm shadow-sky-200"
            >
              Lưu tên
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
