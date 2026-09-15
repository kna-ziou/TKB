import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Info,
  Lock,
  RotateCcw,
  Save,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import { Subject } from '../../types/subject';
import { SubjectColorPicker } from '../SubjectColorPicker/SubjectColorPicker';
import { SubjectColorBadge } from '../SubjectColorBadge/SubjectColorBadge';

interface SubjectEditorProps {
  subject: Subject;
  usageCount: number;
  onSave: (updated: {
    id: string;
    name?: string;
    displayName?: string;
    shortName?: string;
    color?: string;
    colorLocked?: boolean;
  }) => void;
  onDeleteRequest?: (subject: Subject) => void;
  onClose: () => void;
}

export const SubjectEditor: React.FC<SubjectEditorProps> = ({
  subject,
  usageCount,
  onSave,
  onDeleteRequest,
  onClose,
}) => {
  const [name, setName] = useState(subject.name);
  const [displayName, setDisplayName] = useState(subject.displayName || subject.name);
  const [shortName, setShortName] = useState(subject.shortName || '');
  const [color, setColor] = useState(subject.color);
  const [colorLocked, setColorLocked] = useState(Boolean(subject.colorLocked));
  const [error, setError] = useState('');

  const isCustom = Boolean(subject.custom);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isCustom && !name.trim()) {
      setError('Tên môn học không được để trống.');
      return;
    }

    onSave({
      id: subject.id,
      name: isCustom ? name.trim() : subject.name,
      displayName: displayName.trim() || (isCustom ? name.trim() : subject.name),
      shortName: shortName.trim(),
      color,
      colorLocked,
    });

    onClose();
  };

  const handleResetColor = () => {
    setColor(subject.defaultColor);
  };

  return (
    <div
      id="subject-editor-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="editor-title"
      className="flex flex-col h-full bg-white rounded-2xl overflow-hidden shadow-xl border border-slate-200"
    >
      {/* Editor Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-3">
          <button
            id="btn-editor-back"
            type="button"
            onClick={onClose}
            aria-label="Quay lại danh sách"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h3 id="editor-title" className="font-bold text-slate-900 text-base flex items-center gap-2">
              <span>Chỉnh sửa môn học</span>
              <SubjectColorBadge color={color} size="sm" isLocked={colorLocked} />
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {isCustom ? 'Môn tùy chỉnh của bạn' : 'Môn học chuẩn của hệ thống'}
            </p>
          </div>
        </div>

        <button
          id="btn-editor-close"
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Editor Body Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
        {/* Usage info banner */}
        <div
          id="editor-usage-badge"
          className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium ${
            usageCount > 0
              ? 'bg-sky-50 text-sky-800 border border-sky-200'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          <span>
            {usageCount > 0
              ? `Môn này đang xuất hiện trong ${usageCount} tiết học trên thời khóa biểu.`
              : 'Môn này chưa được gán vào tiết học nào.'}
          </span>
          {isCustom && (
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
              Tùy chỉnh
            </span>
          )}
        </div>

        {/* Canonical Name */}
        <div>
          <label
            htmlFor="editor-field-name"
            className="block text-xs font-semibold mb-1 text-slate-700"
          >
            Tên đầy đủ {isCustom && <span className="text-rose-500">*</span>}
          </label>
          {isCustom ? (
            <input
              id="editor-field-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="Ví dụ: STEM Robotics, CLB Đọc sách..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-slate-800"
            />
          ) : (
            <div className="relative">
              <input
                id="editor-field-name"
                type="text"
                disabled
                value={subject.name}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-100 text-slate-600 cursor-not-allowed font-medium"
              />
              <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>Môn mặc định không đổi tên gốc. Bạn có thể đổi tên hiển thị bên dưới.</span>
              </div>
            </div>
          )}
          {error && <span className="text-xs text-rose-500 mt-1 block">{error}</span>}
        </div>

        {/* Display Name */}
        <div>
          <label
            htmlFor="editor-field-display-name"
            className="block text-xs font-semibold mb-1 text-slate-700"
          >
            Tên hiển thị trên ô thời khóa biểu
          </label>
          <input
            id="editor-field-display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Ví dụ: Giáo Dục Thể Chất, Hoạt Động Trải Nghiệm..."
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-slate-800"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Được ưu tiên hiển thị trên ô thời khóa biểu (tối đa 2 dòng).
          </p>
        </div>

        {/* Short Name */}
        <div>
          <label
            htmlFor="editor-field-short-name"
            className="block text-xs font-semibold mb-1 text-slate-700"
          >
            Tên viết tắt (tùy chọn)
          </label>
          <input
            id="editor-field-short-name"
            type="text"
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            placeholder="Ví dụ: GDTC, HĐTN, STEM..."
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-slate-800"
          />
        </div>

        <div className="border-t border-slate-100 pt-4">
          {/* Color Picker */}
          <SubjectColorPicker
            currentColor={color}
            defaultColor={subject.defaultColor}
            onColorChange={setColor}
            onResetDefault={handleResetColor}
            idPrefix={`editor-${subject.id}`}
          />
        </div>

        {/* Color Lock Setting */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${colorLocked ? 'bg-sky-100 text-sky-700' : 'bg-slate-200 text-slate-500'}`}>
              {colorLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">
                Khóa màu môn học
              </div>
              <div className="text-[11px] text-slate-500">
                Giữ nguyên màu này ngay cả khi đổi phong cách hoặc áp dụng bảng màu mới.
              </div>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              id="editor-toggle-color-lock"
              type="checkbox"
              checked={colorLocked}
              onChange={(e) => setColorLocked(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
          </label>
        </div>

        {/* Custom Subject Deletion section */}
        {isCustom && onDeleteRequest && (
          <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-rose-600 block">
                Xóa môn tùy chỉnh
              </span>
              <span className="text-[11px] text-slate-400">
                Gỡ bỏ môn học này khỏi danh sách.
              </span>
            </div>
            <button
              id="btn-editor-delete-subject"
              type="button"
              onClick={() => onDeleteRequest(subject)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa môn</span>
            </button>
          </div>
        )}

        {/* Form Footer with Save & Cancel */}
        <div className="border-t border-slate-100 pt-4 mt-auto flex items-center justify-end gap-2.5">
          <button
            id="btn-editor-cancel"
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            id="btn-editor-submit"
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-sm rounded-lg transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu thay đổi</span>
          </button>
        </div>
      </form>
    </div>
  );
};
