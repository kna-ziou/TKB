import { PersistedLibrary } from '../types/persistence';
import { validateLibrarySchema } from './persistenceUtils';

export const CURRENT_STORAGE_VERSION = 1;

/**
 * Migration entry point for persisted timetable storage data.
 * Validates and transforms older or unrecognized schema formats into the current version.
 * Ready for future upgrades (v1 -> v2, v2 -> v3).
 */
export function migratePersistedData(rawData: unknown): PersistedLibrary | null {
  if (!rawData || typeof rawData !== 'object') {
    return null;
  }

  const obj = rawData as Record<string, unknown>;

  // Current schema: Version 1
  if (obj.schemaVersion === CURRENT_STORAGE_VERSION) {
    if (validateLibrarySchema(obj)) {
      return obj as PersistedLibrary;
    }
  }

  // Future migration logic hooks go here:
  // if (obj.schemaVersion === 2) { ... return migrateV2toV1(obj); }

  return null;
}
