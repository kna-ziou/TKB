import React from 'react';
import { Plus } from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';
import { ActiveCellTarget, DayKey, SessionType } from '../../types/timetable';
import { DAY_LABELS } from '../../utils/timetableFactory';
import { getSubjectDisplay } from '../../utils/subjectUtils';

interface TimetableCellProps {
  day: DayKey;
  session: SessionType;
  periodIndex: number;
  onContextMenu?: (e: React.MouseEvent, cell: ActiveCellTarget) => void;
}

export const TimetableCell: React.FC<TimetableCellProps> = ({
  day,
  session,
  periodIndex,
  onContextMenu,
}) => {
  const {
    state,
    theme,
    activeCell,
    selectedCell,
    setSelectedCell,
    openCellPicker,
    getSubjectById,
  } = useTimetable();
  const { tokens } = theme;

  const daySchedule = state.schedule[day];
  const sessionSchedule = daySchedule ? daySchedule[session] : undefined;
  const cellData = sessionSchedule?.periods?.[periodIndex];

  const subject = cellData?.subjectId
    ? getSubjectById(cellData.subjectId)
    : undefined;

  const displayText = getSubjectDisplay(subject, cellData);
  const hasSubject = Boolean(displayText);

  const isPickerActive =
    activeCell?.day === day &&
    activeCell?.session === session &&
    activeCell?.periodIndex === periodIndex;

  const isCurrentSelected =
    selectedCell?.day === day &&
    selectedCell?.session === session &&
    selectedCell?.periodIndex === periodIndex;

  const cellTarget: ActiveCellTarget = { day, session, periodIndex };

  const sessionLabel = session === 'morning' ? 'Buổi sáng' : 'Buổi chiều';
  const periodLabel = `Tiết ${periodIndex + 1}`;
  const dayLabel = DAY_LABELS[day] || day;
  const subjectLabel = displayText || 'Chưa chọn môn';
  const cellAriaLabel = `${dayLabel}, ${sessionLabel}, ${periodLabel}, ${subjectLabel}`;

  const handleClick = () => {
    setSelectedCell(cellTarget);
    openCellPicker(cellTarget);
  };

  const handleFocus = () => {
    setSelectedCell(cellTarget);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Space opens SubjectPicker (Enter triggers onClick natively on button)
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      setSelectedCell(cellTarget);
      openCellPicker(cellTarget);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedCell(cellTarget);
    if (onContextMenu) {
      onContextMenu(e, cellTarget);
    }
  };

  const cellBgColor = hasSubject && subject?.color ? subject.color : undefined;

  return (
    <button
      id={`cell-${day}-${session}-${periodIndex}`}
      type="button"
      tabIndex={0}
      onClick={handleClick}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
      aria-label={cellAriaLabel}
      style={
        !isPickerActive && cellBgColor
          ? {
              backgroundColor: cellBgColor,
            }
          : undefined
      }
      className={`group relative w-full h-full min-h-[52px] p-2 flex flex-col items-center justify-center transition-all cursor-pointer select-none focus:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-inset focus-visible:z-20 ${
        isPickerActive
          ? 'border-2 border-sky-500 bg-sky-50 shadow-inner z-20'
          : isCurrentSelected
          ? 'ring-2 ring-sky-600 ring-inset z-20 shadow-xs'
          : hasSubject
          ? 'hover:brightness-98 hover:shadow-2xs'
          : `bg-white/70 hover:${tokens.cellHoverBg}`
      }`}
    >
      {isPickerActive ? (
        <span className="text-xs sm:text-sm font-bold text-sky-700">
          + Chọn môn
        </span>
      ) : hasSubject ? (
        <span
          className="text-xs sm:text-sm font-medium text-slate-800 line-clamp-2 max-w-full leading-snug break-words px-1 text-center"
          title={displayText}
        >
          {displayText}
        </span>
      ) : (
        <span className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-300 group-hover:text-sky-600 group-focus-visible:text-sky-600 transition-colors">
          <Plus className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-focus-visible:opacity-100" />
          <span className="hidden group-hover:inline group-focus-visible:inline font-medium">Chọn môn</span>
        </span>
      )}
    </button>
  );
};
