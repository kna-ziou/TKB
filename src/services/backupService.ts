import {
  BackupValidationResult,
  TimetableBackupFile,
} from '../types/backup';
import { PersistedLibrary } from '../types/persistence';
import { APP_VERSION } from '../utils/persistenceUtils';
import {
  BACKUP_FORMAT_IDENTIFIER,
  CURRENT_BACKUP_VERSION,
  validateBackupData,
} from '../utils/backupValidation';

export function formatBackupFileName(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `TKB-Online-Backup-${year}-${month}-${day}-${hours}${minutes}.json`;
}

export function buildBackupPayload(library: PersistedLibrary): TimetableBackupFile {
  return {
    format: BACKUP_FORMAT_IDENTIFIER,
    version: CURRENT_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: {
      name: 'TKB Online Designer',
      version: APP_VERSION,
    },
    data: {
      schemaVersion: library.schemaVersion,
      currentDocumentId: library.currentDocumentId,
      documents: library.documents,
    },
  };
}

export function triggerBackupDownload(backup: TimetableBackupFile): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = formatBackupFileName();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function parseBackupFile(file: File): Promise<BackupValidationResult> {
  // Reject non-json file extensions
  if (!file.name.toLowerCase().endsWith('.json')) {
    return {
      isValid: false,
      errorMessage: 'Tệp không phải dữ liệu sao lưu của TKB Online Designer.',
      detail: 'File extension must be .json',
    };
  }

  try {
    const text = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return {
        isValid: false,
        errorMessage: 'Không thể đọc tệp JSON.',
        detail: 'Invalid JSON syntax',
      };
    }

    return validateBackupData(parsed);
  } catch (err) {
    return {
      isValid: false,
      errorMessage: 'Không thể đọc tệp JSON.',
      detail: err instanceof Error ? err.message : 'Unknown read error',
    };
  }
}
