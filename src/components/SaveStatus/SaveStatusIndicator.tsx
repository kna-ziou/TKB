import React from 'react';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import { useDocumentLibrary } from '../../context/DocumentLibraryContext';

export const SaveStatusIndicator: React.FC = () => {
  const { saveStatus, lastSavedTimeStr } = useDocumentLibrary();

  if (saveStatus === 'saving') {
    return (
      <div
        id="save-status-saving"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 select-none animate-pulse"
        title="Đang lưu thay đổi vào trình duyệt..."
      >
        <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin" />
        <span>Đang lưu...</span>
      </div>
    );
  }

  if (saveStatus === 'error') {
    return (
      <div
        id="save-status-error"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 select-none"
        title="Không thể lưu dữ liệu vào trình duyệt (vượt quá dung lượng)"
      >
        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
        <span>Lỗi lưu dữ liệu</span>
      </div>
    );
  }

  // 'saved'
  return (
    <div
      id="save-status-saved"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/70 select-none"
      title={lastSavedTimeStr ? `Đã lưu lúc ${lastSavedTimeStr}` : 'Dữ liệu đã được lưu an toàn'}
    >
      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
      <span>Đã lưu</span>
      {lastSavedTimeStr && (
        <span className="text-[11px] text-emerald-600/80 font-normal hidden md:inline">
          {lastSavedTimeStr}
        </span>
      )}
    </div>
  );
};
