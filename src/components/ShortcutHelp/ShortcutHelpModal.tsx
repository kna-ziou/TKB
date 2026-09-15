import React, { useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';

interface ShortcutHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    title: 'Lịch sử & Thao tác',
    items: [
      {
        keys: ['Ctrl', 'Z'],
        macKeys: ['⌘', 'Z'],
        description: 'Hoàn tác thao tác vừa thực hiện',
      },
      {
        keys: ['Ctrl', 'Y'],
        secondaryKeys: ['Ctrl', 'Shift', 'Z'],
        macKeys: ['⌘', '⇧', 'Z'],
        description: 'Làm lại thao tác vừa hoàn tác',
      },
    ],
  },
  {
    title: 'Thao tác ô (Cell)',
    items: [
      {
        keys: ['Ctrl', 'C'],
        macKeys: ['⌘', 'C'],
        description: 'Sao chép môn học của ô đang chọn',
      },
      {
        keys: ['Ctrl', 'V'],
        macKeys: ['⌘', 'V'],
        description: 'Dán môn học vào ô đang chọn',
      },
      {
        keys: ['Enter'],
        description: 'Mở bảng chọn môn học cho ô',
      },
      {
        keys: ['Delete'],
        secondaryKeys: ['Backspace'],
        description: 'Xóa môn học khỏi ô đang chọn',
      },
      {
        keys: ['↑', '↓', '←', '→'],
        description: 'Di chuyển giữa các ô trong bảng',
      },
      {
        keys: ['Chuột phải'],
        description: 'Mở menu thao tác nhanh cho ô',
      },
    ],
  },
  {
    title: 'Thao tác nâng cao',
    items: [
      {
        keys: ['⋯ Thứ'],
        description: 'Sao chép, dán hoặc xóa môn toàn bộ ngày',
      },
      {
        keys: ['⋯ Buổi'],
        description: 'Xóa nhanh toàn bộ môn buổi sáng hoặc buổi chiều',
      },
      {
        keys: ['Esc'],
        description: 'Đóng bảng chọn môn hoặc hủy vùng chọn',
      },
    ],
  },
];

export const ShortcutHelpModal: React.FC<ShortcutHelpModalProps> = ({
  isOpen,
  onClose,
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs no-print">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-help-title"
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="shortcut-help-title"
                className="text-base font-bold text-slate-900"
              >
                Phím tắt & Thao tác nhanh
              </h3>
              <p className="text-xs text-slate-500">
                Tăng tốc độ nhập liệu và chỉnh sửa thời khóa biểu
              </p>
            </div>
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

        <div className="overflow-y-auto py-4 space-y-6 flex-1 pr-1">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="space-y-2.5">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {group.title}
              </h4>
              <div className="bg-slate-50/70 rounded-xl divide-y divide-slate-200/60 border border-slate-200/80">
                {group.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 px-3 text-xs"
                  >
                    <span className="text-slate-700 font-medium">
                      {item.description}
                    </span>
                    <div className="flex items-center gap-1 shrink-0 ml-3">
                      {item.keys.map((k, kIdx) => (
                        <React.Fragment key={kIdx}>
                          {kIdx > 0 && (
                            <span className="text-slate-400 text-[10px]">+</span>
                          )}
                          <kbd className="px-1.5 py-0.5 text-[11px] font-mono font-semibold text-slate-700 bg-white border border-slate-300 rounded shadow-2xs">
                            {k}
                          </kbd>
                        </React.Fragment>
                      ))}
                      {item.secondaryKeys && (
                        <>
                          <span className="text-slate-400 text-[10px] mx-0.5">
                            hoặc
                          </span>
                          {item.secondaryKeys.map((sk, skIdx) => (
                            <React.Fragment key={skIdx}>
                              {skIdx > 0 && (
                                <span className="text-slate-400 text-[10px]">+</span>
                              )}
                              <kbd className="px-1.5 py-0.5 text-[11px] font-mono font-semibold text-slate-700 bg-white border border-slate-300 rounded shadow-2xs">
                                {sk}
                              </kbd>
                            </React.Fragment>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Mẹo: Nhấn <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 border border-slate-200 rounded">Esc</kbd> để đóng bảng này
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
