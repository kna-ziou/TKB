import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Copy,
  Clipboard,
  Trash2,
  Edit3,
  Plus,
} from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';
import { ActiveCellTarget } from '../../types/timetable';

export interface ContextMenuPosition {
  x: number;
  y: number;
  cell: ActiveCellTarget;
}

interface CellContextMenuProps {
  position: ContextMenuPosition | null;
  onClose: () => void;
}

export const CellContextMenu: React.FC<CellContextMenuProps> = ({
  position,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const {
    state,
    getSubjectById,
    openCellPicker,
    copyCell,
    pasteCell,
    clearCell,
    clipboard,
  } = useTimetable();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleScrollOrResize = () => {
      onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [onClose]);

  if (!position || typeof document === 'undefined') return null;

  const { cell, x, y } = position;
  const cellData =
    state.schedule[cell.day]?.[cell.session]?.periods?.[cell.periodIndex];
  const currentSubject = getSubjectById(cellData?.subjectId);
  const isCellEmpty = !cellData?.subjectId && !cellData?.customLabel;
  const canPaste = clipboard?.type === 'cell';

  // Adjust coordinates to avoid going outside viewport
  const menuWidth = 190;
  const menuHeight = 175;
  const adjustedX =
    x + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 10 : x;
  const adjustedY =
    y + menuHeight > window.innerHeight
      ? window.innerHeight - menuHeight - 10
      : y;

  return createPortal(
    <div
      ref={menuRef}
      style={{ left: adjustedX, top: adjustedY }}
      role="menu"
      className="fixed z-[100] bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 min-w-[185px] animate-in fade-in zoom-in-95 duration-100 no-print text-xs"
    >
      {/* Header with subject name or empty status */}
      <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-2 mb-1">
        {currentSubject ? (
          <>
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
              style={{ backgroundColor: currentSubject.color }}
            />
            <span className="font-semibold text-slate-800 truncate">
              {currentSubject.displayName || currentSubject.name}
            </span>
          </>
        ) : (
          <span className="text-slate-400 italic font-normal">Ô trống</span>
        )}
      </div>

      {/* Select / Change Subject */}
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onClose();
          openCellPicker(cell);
        }}
        className="w-full flex items-center justify-between px-3 py-1.5 text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
      >
        <span className="flex items-center gap-2">
          {isCellEmpty ? (
            <Plus className="w-3.5 h-3.5 text-indigo-600" />
          ) : (
            <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
          )}
          <span>{isCellEmpty ? 'Chọn môn' : 'Đổi môn'}</span>
        </span>
        <kbd className="text-[10px] text-slate-400 font-mono">Enter</kbd>
      </button>

      {/* Copy */}
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onClose();
          copyCell(cell);
        }}
        className="w-full flex items-center justify-between px-3 py-1.5 text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <Copy className="w-3.5 h-3.5 text-slate-500" />
          <span>Sao chép</span>
        </span>
        <kbd className="text-[10px] text-slate-400 font-mono">Ctrl+C</kbd>
      </button>

      {/* Paste */}
      <button
        type="button"
        role="menuitem"
        disabled={!canPaste}
        onClick={() => {
          if (!canPaste) return;
          onClose();
          pasteCell(cell);
        }}
        className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors ${
          canPaste
            ? 'text-slate-700 hover:bg-slate-50 cursor-pointer'
            : 'text-slate-300 cursor-not-allowed'
        }`}
      >
        <span className="flex items-center gap-2">
          <Clipboard className="w-3.5 h-3.5" />
          <span>Dán</span>
        </span>
        <kbd className="text-[10px] font-mono">Ctrl+V</kbd>
      </button>

      <div className="h-px bg-slate-100 my-1" />

      {/* Clear Cell */}
      <button
        type="button"
        role="menuitem"
        disabled={isCellEmpty}
        onClick={() => {
          if (isCellEmpty) return;
          onClose();
          clearCell(cell);
        }}
        className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors ${
          !isCellEmpty
            ? 'text-rose-600 hover:bg-rose-50 cursor-pointer'
            : 'text-slate-300 cursor-not-allowed'
        }`}
      >
        <span className="flex items-center gap-2">
          <Trash2 className="w-3.5 h-3.5" />
          <span>Xóa tiết</span>
        </span>
        <kbd className="text-[10px] font-mono">Del</kbd>
      </button>
    </div>,
    document.body
  );
};
