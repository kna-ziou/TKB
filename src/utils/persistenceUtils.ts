import { PersistedLibrary, SavedTimetableDocument } from '../types/persistence';
import { TimetableState } from '../types/timetable';
import { removeVietnameseTones } from './subjectUtils';

export const STORAGE_PREFIX = 'tkb-online-designer:';
export const STORAGE_KEY_LIBRARY = 'tkb-online-designer:v1:library';
export const STORAGE_KEY_CURRENT = 'tkb-online-designer:v1:current';
export const APP_VERSION = '1.6.0';

export interface StorageDiagnostics {
  documentCount: number;
  customSubjectCount: number;
  approximateBytes: number;
  approximateFormattedSize: string;
}

/**
 * Calculates storage diagnostics including document count, custom subject count,
 * and approximate formatted size in KB without exposing raw internal storage keys.
 */
export function calculateStorageDiagnostics(library?: PersistedLibrary | null): StorageDiagnostics {
  if (!library || !Array.isArray(library.documents)) {
    return {
      documentCount: 0,
      customSubjectCount: 0,
      approximateBytes: 0,
      approximateFormattedSize: '0 KB',
    };
  }

  const documentCount = library.documents.length;
  const customIds = new Set<string>();

  library.documents.forEach((doc) => {
    if (Array.isArray(doc.timetable?.subjects)) {
      doc.timetable.subjects.forEach((s) => {
        if (s.custom) {
          customIds.add(s.id);
        }
      });
    }
  });

  let approximateBytes = 0;
  try {
    const raw = JSON.stringify(library);
    // Standard UTF-8 byte length calculation
    approximateBytes = new Blob([raw]).size;
  } catch {
    approximateBytes = 0;
  }

  let approximateFormattedSize = '0 KB';
  if (approximateBytes < 1024) {
    approximateFormattedSize = `${approximateBytes} B`;
  } else if (approximateBytes < 1024 * 1024) {
    approximateFormattedSize = `${(approximateBytes / 1024).toFixed(1)} KB`;
  } else {
    approximateFormattedSize = `${(approximateBytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return {
    documentCount,
    customSubjectCount: customIds.size,
    approximateBytes,
    approximateFormattedSize,
  };
}

/**
 * Generate a unique document ID.
 */
export function generateDocumentId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `tkb-doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Perform a deep clone without reference sharing.
 */
export function cloneDocumentData<T>(data: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(data);
    } catch {
      // Fallback for non-cloneable objects
    }
  }
  return JSON.parse(JSON.stringify(data));
}

/**
 * Generate smart default document name from timetable state.
 * Priority: className -> schoolName -> "Thời Khóa Biểu"
 */
export function generateDefaultDocumentName(state: TimetableState): string {
  const className = state?.meta?.className?.trim();
  if (className) {
    return `TKB ${className}`;
  }

  const schoolName = state?.meta?.schoolName?.trim();
  if (schoolName) {
    return `TKB ${schoolName}`;
  }

  return 'Thời Khóa Biểu';
}

/**
 * Generate an appropriate name for a duplicated document.
 * E.g., "TKB 4A1" -> "TKB 4A1 - Bản sao" -> "TKB 4A1 - Bản sao 2"
 */
export function generateDuplicateName(
  originalName: string,
  existingNames: string[] = []
): string {
  const baseName = originalName.trim() || 'Thời Khóa Biểu';
  const nameSet = new Set(existingNames.map((n) => n.trim().toLowerCase()));

  const firstCandidate = `${baseName} - Bản sao`;
  if (!nameSet.has(firstCandidate.toLowerCase())) {
    return firstCandidate;
  }

  let counter = 2;
  while (counter < 1000) {
    const candidate = `${baseName} - Bản sao ${counter}`;
    if (!nameSet.has(candidate.toLowerCase())) {
      return candidate;
    }
    counter++;
  }

  return `${baseName} - Bản sao ${Date.now()}`;
}

/**
 * Formats an ISO date string into Vietnamese format: DD/MM/YYYY HH:mm
 */
export function formatDateTimeVN(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';

    const pad = (n: number) => n.toString().padStart(2, '0');
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return '';
  }
}

/**
 * Format only the time: HH:mm
 */
export function formatTimeOnlyVN(d: Date | null): string {
  if (!d) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Validates whether a raw parsed object conforms to PersistedLibrary schema v1.
 */
export function validateLibrarySchema(raw: unknown): raw is PersistedLibrary {
  if (!raw || typeof raw !== 'object') return false;

  const obj = raw as Record<string, unknown>;
  if (obj.schemaVersion !== 1) return false;
  if (!Array.isArray(obj.documents)) return false;

  // Validate each document minimally to prevent runtime exceptions
  for (const item of obj.documents) {
    if (!item || typeof item !== 'object') return false;
    const doc = item as Record<string, unknown>;
    if (typeof doc.id !== 'string' || !doc.id) return false;
    if (typeof doc.name !== 'string') return false;
    if (typeof doc.createdAt !== 'string' || typeof doc.updatedAt !== 'string') return false;
    if (!doc.timetable || typeof doc.timetable !== 'object') return false;

    const tt = doc.timetable as Record<string, unknown>;
    if (!tt.meta || !tt.config || !tt.schedule || !Array.isArray(tt.subjects)) {
      return false;
    }
  }

  return true;
}

/**
 * Migration pipeline for future schema versions (currently handles v1).
 */
export function migrateLibrary(raw: unknown): PersistedLibrary | null {
  if (!raw || typeof raw !== 'object') return null;

  const obj = raw as Record<string, unknown>;

  // Schema v1
  if (obj.schemaVersion === 1) {
    if (validateLibrarySchema(obj)) {
      return obj;
    }
  }

  // Graceful fallback for unversioned legacy or malformed objects
  return null;
}

/**
 * Fuzzy search documents by name, schoolName, className, studentName.
 */
export function searchDocuments(
  documents: SavedTimetableDocument[],
  query: string
): SavedTimetableDocument[] {
  const q = removeVietnameseTones(query.trim().toLowerCase());
  if (!q) return documents;

  return documents.filter((doc) => {
    const docName = removeVietnameseTones(doc.name || '');
    const schoolName = removeVietnameseTones(doc.timetable?.meta?.schoolName || '');
    const className = removeVietnameseTones(doc.timetable?.meta?.className || '');
    const studentName = removeVietnameseTones(doc.timetable?.meta?.studentName || '');
    const grade = removeVietnameseTones(doc.timetable?.meta?.grade || '');

    return (
      docName.includes(q) ||
      schoolName.includes(q) ||
      className.includes(q) ||
      studentName.includes(q) ||
      grade.includes(q)
    );
  });
}
