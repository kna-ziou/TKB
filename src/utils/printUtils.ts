import { PageOrientation, PrintSettings } from '../types/print';
import { TimetableMeta } from '../types/timetable';

const DYNAMIC_PRINT_STYLE_ID = 'dynamic-print-page-style';

/**
 * Injects or updates a dynamic @page CSS rule for browser print orientation and margin.
 */
export function injectPrintPageStyle(orientation: PageOrientation): void {
  if (typeof document === 'undefined') return;

  let styleTag = document.getElementById(DYNAMIC_PRINT_STYLE_ID) as HTMLStyleElement | null;
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = DYNAMIC_PRINT_STYLE_ID;
    document.head.appendChild(styleTag);
  }

  styleTag.textContent = `
    @page {
      size: A4 ${orientation};
      margin: 10mm;
    }
  `;

  document.body.classList.remove('print-landscape', 'print-portrait');
  document.body.classList.add(`print-${orientation}`);
}

export interface FormattedPrintMetaItem {
  key: string;
  label: string;
  value: string;
}

/**
 * Returns only non-empty metadata items that are enabled in print settings.
 * Ensures no empty labels (e.g. "Trường:") are ever rendered if the field is empty.
 */
export function getActivePrintMetadata(
  meta: TimetableMeta,
  settings: PrintSettings
): FormattedPrintMetaItem[] {
  const items: FormattedPrintMetaItem[] = [];

  if (settings.showSchoolName && meta.schoolName?.trim()) {
    items.push({
      key: 'school',
      label: 'Trường',
      value: meta.schoolName.trim(),
    });
  }

  if (settings.showClassName && meta.className?.trim()) {
    items.push({
      key: 'class',
      label: 'Lớp',
      value: meta.className.trim(),
    });
  }

  if (settings.showStudentName && meta.studentName?.trim()) {
    items.push({
      key: 'student',
      label: 'Học sinh',
      value: meta.studentName.trim(),
    });
  }

  if (settings.showSchoolYear && meta.schoolYear?.trim()) {
    items.push({
      key: 'year',
      label: 'Năm học',
      value: meta.schoolYear.trim(),
    });
  }

  return items;
}
