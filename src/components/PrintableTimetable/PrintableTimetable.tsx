import React from 'react';
import { Sun, Sunset } from 'lucide-react';
import { DAY_LABELS } from '../../utils/timetableFactory';
import { ThemeDecorations } from '../ThemeDecorations/ThemeDecorations';
import { TimetableState } from '../../types/timetable';
import { TimetableTheme } from '../../types/theme';
import { PrintSettings } from '../../types/print';
import {
  getA4AutoFitLayout,
  getPrintSubjectRepresentation,
} from '../../utils/timetableDisplayUtils';
import { getActivePrintMetadata } from '../../utils/printUtils';
import { getReadableTextColor } from '../../utils/colorUtils';

interface PrintableTimetableProps {
  state: TimetableState;
  theme: TimetableTheme;
  printSettings: PrintSettings;
  id?: string;
  className?: string;
}

export const PrintableTimetable: React.FC<PrintableTimetableProps> = ({
  state,
  theme,
  printSettings,
  id = 'printable-timetable-sheet',
  className = '',
}) => {
  const { config, meta, subjects, schedule } = state;
  const { tokens } = theme;

  const activeDays = config.activeDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const morningCount = config.morningPeriods;
  const afternoonCount = config.afternoonPeriods;
  const showAfternoon = config.afternoonEnabled;

  const metadataItems = getActivePrintMetadata(meta, printSettings);

  // Calculate adaptive A4 auto-fit layout
  const autoFit = getA4AutoFitLayout(
    config,
    printSettings.orientation,
    metadataItems.length
  );

  // Subject lookup helper
  const getSubjectById = (subjectId?: string) => {
    if (!subjectId) return undefined;
    return subjects.find((s) => s.id === subjectId);
  };

  return (
    <div
      id={id}
      data-theme={theme.id}
      data-orientation={printSettings.orientation}
      data-density={autoFit.density}
      className={`printable-page-root relative w-full bg-white text-slate-800 flex flex-col transition-all overflow-hidden ${className}`}
      style={{
        boxSizing: 'border-box',
      }}
    >
      {/* Printable Header Area */}
      <div
        className={`relative text-center border-b transition-colors ${tokens.headerBackground} ${tokens.headerBorder} ${autoFit.headerPaddingClass}`}
      >
        {/* Decorative Theme Elements (Controlled by showDecorations) */}
        {printSettings.showDecorations && (
          <ThemeDecorations themeId={theme.id} placement="header" />
        )}

        {/* User-Customized or Default Title */}
        <h1
          className={`${autoFit.titleSizeClass} tracking-tight uppercase relative z-10 leading-tight ${tokens.headerTitleColor}`}
        >
          {meta.title.trim() || 'THỜI KHÓA BIỂU'}
        </h1>

        {/* Filtered, Non-Empty Metadata Line */}
        {metadataItems.length > 0 && (
          <div
            className={`flex flex-wrap justify-center items-center gap-x-4 gap-y-1 mt-1.5 ${autoFit.metaTextClass} font-medium relative z-10 ${tokens.headerSubtextColor}`}
          >
            {metadataItems.map((item, idx) => (
              <React.Fragment key={item.key}>
                {idx > 0 && <span className="opacity-50">·</span>}
                <span className="inline-flex items-center gap-1">
                  <span className="font-bold opacity-90">{item.label}:</span>
                  <span>{item.value}</span>
                </span>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Grid Table */}
      <div className="w-full overflow-hidden flex-1">
        <table className="w-full table-fixed border-collapse text-sm m-0 p-0">
          {/* Table Header (Thứ 2 - Thứ 6/7) */}
          <thead className={tokens.tableHeaderBg}>
            <tr className={autoFit.dayHeaderHeightClass}>
              <th
                className={`${autoFit.periodColWidthClass} border-b border-r text-[10px] sm:text-xs uppercase font-bold text-center ${tokens.periodColText} ${tokens.gridBorder}`}
              >
                Tiết
              </th>
              {activeDays.map((day) => (
                <th
                  key={`print-header-${day}`}
                  className={`border-b border-r ${autoFit.dayHeaderFontClass} text-center p-1 ${tokens.tableHeaderText} ${tokens.gridBorder}`}
                >
                  {DAY_LABELS[day]}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* MORNING SESSION DIVIDER */}
            <tr className={`${tokens.morningBackground} ${autoFit.dividerHeightClass}`}>
              <td
                colSpan={activeDays.length + 1}
                className={`py-0.5 px-3 ${autoFit.dividerFontClass} font-bold tracking-wider border-b uppercase ${tokens.morningText} ${tokens.gridBorder}`}
              >
                <div className="flex items-center gap-1.5">
                  <Sun className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${tokens.morningIconColor}`} />
                  <span>Buổi sáng</span>
                </div>
              </td>
            </tr>

            {/* MORNING PERIOD ROWS */}
            {Array.from({ length: morningCount }).map((_, periodIdx) => (
              <tr
                key={`print-row-morning-${periodIdx}`}
                className={autoFit.rowHeightClass}
                style={autoFit.rowHeightStyle}
              >
                <td
                  className={`border-r border-b text-center text-xs sm:text-sm font-bold ${tokens.periodColBg} ${tokens.periodColText} ${tokens.gridBorder}`}
                >
                  {periodIdx + 1}
                </td>
                {activeDays.map((day) => {
                  const daySchedule = schedule[day];
                  const periodData = daySchedule?.morning?.periods?.[periodIdx];
                  const subject = periodData?.subjectId
                    ? getSubjectById(periodData.subjectId)
                    : undefined;

                  const hasSubject = Boolean(subject || periodData?.customLabel);
                  const subjectRep = getPrintSubjectRepresentation(
                    subject,
                    periodData,
                    autoFit.density,
                    activeDays.length,
                    printSettings.orientation
                  );

                  const bgColor = hasSubject && subject?.color ? subject.color : undefined;
                  const textColor = bgColor ? getReadableTextColor(bgColor) : '#334155';

                  return (
                    <td
                      key={`print-cell-${day}-morning-${periodIdx}`}
                      className={`border-r border-b p-0 relative text-center align-middle ${tokens.gridBorder}`}
                      style={bgColor ? { backgroundColor: bgColor } : undefined}
                    >
                      {hasSubject ? (
                        <div
                          className="w-full h-full flex items-center justify-center p-1 text-center select-none overflow-hidden"
                          style={{ color: textColor }}
                        >
                          <span
                            className={`${subjectRep.fontSizeClass} ${subjectRep.lineClampClass} max-w-full break-words px-0.5 leading-tight text-center`}
                          >
                            {subjectRep.text}
                          </span>
                        </div>
                      ) : (
                        /* Empty cell is COMPLETELY blank for printing */
                        <div className="w-full h-full" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* AFTERNOON SESSION (IF ENABLED) */}
            {showAfternoon && (
              <>
                <tr className={`${tokens.afternoonBackground} ${autoFit.dividerHeightClass}`}>
                  <td
                    colSpan={activeDays.length + 1}
                    className={`py-0.5 px-3 ${autoFit.dividerFontClass} font-bold tracking-wider border-b uppercase ${tokens.afternoonText} ${tokens.gridBorder}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Sunset
                        className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${tokens.afternoonIconColor}`}
                      />
                      <span>Buổi chiều</span>
                    </div>
                  </td>
                </tr>

                {Array.from({ length: afternoonCount }).map((_, periodIdx) => (
                  <tr
                    key={`print-row-afternoon-${periodIdx}`}
                    className={autoFit.rowHeightClass}
                    style={autoFit.rowHeightStyle}
                  >
                    <td
                      className={`border-r border-b text-center text-xs sm:text-sm font-bold ${tokens.periodColBg} ${tokens.periodColText} ${tokens.gridBorder}`}
                    >
                      {periodIdx + 1}
                    </td>
                    {activeDays.map((day) => {
                      const daySchedule = schedule[day];
                      const periodData = daySchedule?.afternoon?.periods?.[periodIdx];
                      const subject = periodData?.subjectId
                        ? getSubjectById(periodData.subjectId)
                        : undefined;

                      const hasSubject = Boolean(subject || periodData?.customLabel);
                      const subjectRep = getPrintSubjectRepresentation(
                        subject,
                        periodData,
                        autoFit.density,
                        activeDays.length,
                        printSettings.orientation
                      );

                      const bgColor = hasSubject && subject?.color ? subject.color : undefined;
                      const textColor = bgColor ? getReadableTextColor(bgColor) : '#334155';

                      return (
                        <td
                          key={`print-cell-${day}-afternoon-${periodIdx}`}
                          className={`border-r border-b p-0 relative text-center align-middle ${tokens.gridBorder}`}
                          style={bgColor ? { backgroundColor: bgColor } : undefined}
                        >
                          {hasSubject ? (
                            <div
                              className="w-full h-full flex items-center justify-center p-1 text-center select-none overflow-hidden"
                              style={{ color: textColor }}
                            >
                              <span
                                className={`${subjectRep.fontSizeClass} ${subjectRep.lineClampClass} max-w-full break-words px-0.5 leading-tight text-center`}
                              >
                                {subjectRep.text}
                              </span>
                            </div>
                          ) : (
                            /* Empty cell is COMPLETELY blank for printing */
                            <div className="w-full h-full" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

