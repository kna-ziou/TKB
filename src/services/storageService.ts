import { PersistedLibrary, SavedTimetableDocument } from '../types/persistence';
import { PrintSettings } from '../types/print';
import { TimetableState } from '../types/timetable';
import {
  cloneDocumentData,
  generateDefaultDocumentName,
  generateDocumentId,
  migrateLibrary,
  STORAGE_KEY_CURRENT,
  STORAGE_KEY_LIBRARY,
  STORAGE_PREFIX,
  validateLibrarySchema,
} from '../utils/persistenceUtils';
import { DEFAULT_5_DAYS } from '../utils/timetableFactory';

export interface LoadLibraryResult {
  library: PersistedLibrary;
  wasCorrupted: boolean;
  wasEmpty: boolean;
}

class StorageService {
  /**
   * Reads and parses the library from localStorage.
   * Never throws; provides safe fallback if storage is empty or corrupted.
   */
  public loadLibrary(
    fallbackTimetable: TimetableState,
    fallbackPrintSettings?: PrintSettings
  ): LoadLibraryResult {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      const fallback = this.createDefaultLibrary(fallbackTimetable, fallbackPrintSettings);
      return { library: fallback, wasCorrupted: false, wasEmpty: true };
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY_LIBRARY);
      if (!raw) {
        const initialLib = this.createDefaultLibrary(fallbackTimetable, fallbackPrintSettings);
        // Persist the newly created initial document immediately so subsequent reloads see it
        this.saveLibrary(initialLib);
        return { library: initialLib, wasCorrupted: false, wasEmpty: true };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (parseErr) {
        console.warn('StorageService: Corrupted JSON in localStorage.', parseErr);
        const fallback = this.createDefaultLibrary(fallbackTimetable, fallbackPrintSettings);
        return { library: fallback, wasCorrupted: true, wasEmpty: false };
      }

      const migrated = migrateLibrary(parsed);
      if (!migrated || !validateLibrarySchema(migrated)) {
        console.warn('StorageService: Invalid schema in localStorage.');
        const fallback = this.createDefaultLibrary(fallbackTimetable, fallbackPrintSettings);
        return { library: fallback, wasCorrupted: true, wasEmpty: false };
      }

      // If library has no documents, create a default document
      if (!migrated.documents || migrated.documents.length === 0) {
        const fallback = this.createDefaultLibrary(fallbackTimetable, fallbackPrintSettings);
        return { library: fallback, wasCorrupted: false, wasEmpty: true };
      }

      // Sort documents descending by updatedAt (newest first)
      migrated.documents.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      // Defensively normalize each document
      migrated.documents.forEach((doc) => {
        if (!doc.timetable) return;
        if (!doc.timetable.themeId) {
          doc.timetable.themeId = 'professional';
        }
        if (!doc.timetable.config?.activeDays || doc.timetable.config.activeDays.length === 0) {
          if (!doc.timetable.config) {
            doc.timetable.config = {
              activeDays: DEFAULT_5_DAYS,
              morningPeriods: 4,
              afternoonPeriods: 4,
              afternoonEnabled: true,
            };
          } else {
            doc.timetable.config.activeDays = DEFAULT_5_DAYS;
          }
        }
      });

      // Verify currentDocumentId points to an existing document
      if (
        !migrated.currentDocumentId ||
        !migrated.documents.some((d) => d.id === migrated.currentDocumentId)
      ) {
        migrated.currentDocumentId = migrated.documents[0].id;
      }

      return { library: migrated, wasCorrupted: false, wasEmpty: false };
    } catch (err) {
      console.warn('StorageService: Unexpected exception loading library.', err);
      const fallback = this.createDefaultLibrary(fallbackTimetable, fallbackPrintSettings);
      return { library: fallback, wasCorrupted: true, wasEmpty: false };
    }
  }

  /**
   * Writes the library to localStorage safely.
   * Returns true on success, false on quota/write failure.
   */
  public saveLibrary(library: PersistedLibrary): boolean {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false;
    }

    try {
      const serialized = JSON.stringify(library);
      localStorage.setItem(STORAGE_KEY_LIBRARY, serialized);

      if (library.currentDocumentId) {
        localStorage.setItem(STORAGE_KEY_CURRENT, library.currentDocumentId);
      }

      return true;
    } catch (err) {
      console.error('StorageService: Failed to save library to localStorage (e.g. quota exceeded).', err);
      return false;
    }
  }

  /**
   * Safely clears ONLY app-specific keys (starting with STORAGE_PREFIX).
   * NEVER calls localStorage.clear(), protecting all other browser/site data.
   */
  public clearAppStorage(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (err) {
      console.error('StorageService: Error clearing app storage.', err);
    }
  }

  /**
   * Helper to create a single document.
   */
  public createDocument(
    name: string,
    timetable: TimetableState,
    printSettings?: PrintSettings
  ): SavedTimetableDocument {
    const now = new Date().toISOString();
    return {
      id: generateDocumentId(),
      name: name.trim() || generateDefaultDocumentName(timetable),
      createdAt: now,
      updatedAt: now,
      dataVersion: 1,
      timetable: cloneDocumentData(timetable),
      printSettings: printSettings ? cloneDocumentData(printSettings) : undefined,
    };
  }

  /**
   * Creates an initial default library with one initial document.
   */
  public createDefaultLibrary(
    timetable: TimetableState,
    printSettings?: PrintSettings
  ): PersistedLibrary {
    const defaultDoc = this.createDocument(
      generateDefaultDocumentName(timetable),
      timetable,
      printSettings
    );

    return {
      schemaVersion: 1,
      currentDocumentId: defaultDoc.id,
      documents: [defaultDoc],
    };
  }
}

export const storageService = new StorageService();
