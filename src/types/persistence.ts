import { PrintSettings } from './print';
import { TimetableState } from './timetable';

export type SaveStatus = 'saved' | 'saving' | 'error';

export interface SavedTimetableDocument {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  dataVersion: number;
  timetable: TimetableState;
  printSettings?: PrintSettings;
}

export interface PersistedLibrary {
  schemaVersion: 1;
  currentDocumentId?: string;
  documents: SavedTimetableDocument[];
}

export interface DocumentLibraryState {
  currentDocumentId: string | null;
  currentDocument: SavedTimetableDocument | null;
  documents: SavedTimetableDocument[];
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  isHydrated: boolean;
  isLibraryOpen: boolean;
}
