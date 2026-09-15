import { PersistedLibrary } from './persistence';

export interface BackupAppMeta {
  name: string;
  version: string;
}

export interface BackupDataPayload {
  schemaVersion: number;
  currentDocumentId?: string;
  documents: unknown[];
  [key: string]: unknown;
}

export interface TimetableBackupFile {
  format: 'tkb-online-backup' | 'tkb-backup';
  version: number;
  exportedAt: string;
  app: BackupAppMeta;
  data: BackupDataPayload;
}

export interface BackupValidationSummary {
  documentCount: number;
  customSubjectCount: number;
  version: number;
  exportedAt?: string;
}

export interface BackupValidationSuccess {
  isValid: true;
  backup: TimetableBackupFile;
  library: PersistedLibrary;
  summary: BackupValidationSummary;
  errorMessage?: undefined;
  detail?: undefined;
}

export interface BackupValidationFailure {
  isValid: false;
  errorMessage: string;
  detail?: string;
  backup?: undefined;
  library?: undefined;
  summary?: undefined;
}

export type BackupValidationResult =
  | BackupValidationSuccess
  | BackupValidationFailure;
