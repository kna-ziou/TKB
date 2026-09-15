import React from 'react';
import { School } from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';
import { ThemeDecorations } from '../ThemeDecorations/ThemeDecorations';

export const TimetableHeader: React.FC = () => {
  const { state, theme } = useTimetable();
  const { meta } = state;
  const { tokens } = theme;

  const hasAnyMetadata = Boolean(
    meta.schoolName?.trim() ||
    meta.className?.trim() ||
    meta.studentName?.trim() ||
    meta.schoolYear?.trim()
  );

  return (
    <div
      id="timetable-header"
      className={`relative p-6 text-center border-b transition-colors duration-200 ${tokens.headerBackground} ${tokens.headerBorder}`}
    >
      {/* Decorative Layer */}
      <ThemeDecorations themeId={theme.id} placement="header" />

      {/* Main Title */}
      <h1
        className={`text-2xl sm:text-3xl font-black tracking-tight uppercase relative z-10 ${tokens.headerTitleColor}`}
      >
        {meta.title.trim() || 'THỜI KHÓA BIỂU'}
      </h1>

      {/* Metadata Line */}
      {hasAnyMetadata && (
        <div
          className={`flex flex-wrap justify-center items-center gap-x-6 gap-y-2 mt-2.5 text-sm relative z-10 ${tokens.headerSubtextColor}`}
        >
          {meta.schoolName?.trim() && (
            <p className="flex items-center gap-1">
              <School className="w-3.5 h-3.5 inline opacity-80" />
              <span className="font-semibold">Trường:</span>{' '}
              <span>{meta.schoolName.trim()}</span>
            </p>
          )}

          {meta.className?.trim() && (
            <p>
              <span className="font-semibold">Lớp:</span>{' '}
              <span className="font-medium">{meta.className.trim()}</span>
            </p>
          )}

          {meta.studentName?.trim() && (
            <p>
              <span className="font-semibold">Học sinh:</span>{' '}
              <span className="font-medium">{meta.studentName.trim()}</span>
            </p>
          )}

          {meta.schoolYear?.trim() && (
            <p>
              <span className="font-semibold">Năm học:</span>{' '}
              <span>{meta.schoolYear.trim()}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};
