import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  PersistedLibrary,
  SavedTimetableDocument,
  SaveStatus,
} from '../types/persistence';
import { useTimetable } from './TimetableContext';
import { usePrintSettings } from './PrintSettingsContext';
import { storageService } from '../services/storageService';
import {
  calculateStorageDiagnostics,
  cloneDocumentData,
  formatTimeOnlyVN,
  generateDefaultDocumentName,
  generateDocumentId,
  generateDuplicateName,
  StorageDiagnostics,
} from '../utils/persistenceUtils';
import { initialTimetableState } from '../reducer/timetableReducer';
import { DEFAULT_PRINT_SETTINGS } from '../types/print';
import { buildBackupPayload, triggerBackupDownload } from '../services/backupService';

interface DocumentLibraryContextValue {
  currentDocumentId: string | null;
  currentDocument: SavedTimetableDocument | null;
  currentDocumentName: string;
  documents: SavedTimetableDocument[];
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  lastSavedTimeStr: string;
  isHydrated: boolean;
  isLibraryOpen: boolean;
  isDataManagementOpen: boolean;
  toastMessage: string | null;
  diagnostics: StorageDiagnostics;
  showToast: (msg: string) => void;
  dismissToast: () => void;
  openLibrary: () => void;
  closeLibrary: () => void;
  openDataManagement: () => void;
  closeDataManagement: () => void;
  createNewDocument: () => void;
  openDocument: (id: string) => void;
  renameDocument: (id: string, newName: string) => void;
  duplicateDocument: (id: string) => void;
  deleteDocument: (id: string) => void;
  flushSave: () => void;
  exportBackup: () => void;
  restoreBackup: (library: PersistedLibrary) => boolean;
  resetAllData: () => void;
}

const DocumentLibraryContext = createContext<DocumentLibraryContextValue | null>(null);

export const DocumentLibraryProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { state: timetableState, loadState } = useTimetable();
  const { settings: printSettings, loadSettings, resetSettings } = usePrintSettings();

  const [documents, setDocuments] = useState<SavedTimetableDocument[]>([]);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);
  const [isDataManagementOpen, setIsDataManagementOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Guards to prevent race conditions during hydration and document switching
  const isSwitchingRef = useRef<boolean>(false);
  const autosaveTimerRef = useRef<number | null>(null);

  // Keep latest references for autosave and flush handlers
  const timetableStateRef = useRef(timetableState);
  timetableStateRef.current = timetableState;

  const printSettingsRef = useRef(printSettings);
  printSettingsRef.current = printSettings;

  const documentsRef = useRef(documents);
  documentsRef.current = documents;

  const currentDocumentIdRef = useRef(currentDocumentId);
  currentDocumentIdRef.current = currentDocumentId;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  const dismissToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  /**
   * Performs an immediate synchronous save of the current document snapshot
   */
  const performSave = useCallback((): boolean => {
    const currId = currentDocumentIdRef.current;
    if (!currId || isSwitchingRef.current) return false;

    const latestTimetable = timetableStateRef.current;
    const latestSettings = printSettingsRef.current;
    const nowIso = new Date().toISOString();

    const currDocs = documentsRef.current;
    const existingDoc = currDocs.find((d) => d.id === currId);

    const docName =
      existingDoc?.name || generateDefaultDocumentName(latestTimetable);

    const updatedDoc: SavedTimetableDocument = {
      id: currId,
      name: docName,
      createdAt: existingDoc?.createdAt || nowIso,
      updatedAt: nowIso,
      dataVersion: 1,
      timetable: cloneDocumentData(latestTimetable),
      printSettings: cloneDocumentData(latestSettings),
    };

    const nextDocs = currDocs.map((d) => (d.id === currId ? updatedDoc : d));
    if (!nextDocs.some((d) => d.id === currId)) {
      nextDocs.unshift(updatedDoc);
    }

    // Sort descending by updatedAt
    nextDocs.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    const libraryPayload: PersistedLibrary = {
      schemaVersion: 1,
      currentDocumentId: currId,
      documents: nextDocs,
    };

    const success = storageService.saveLibrary(libraryPayload);
    if (success) {
      setDocuments(nextDocs);
      setSaveStatus('saved');
      setLastSavedAt(new Date());
      return true;
    } else {
      setSaveStatus('error');
      setToastMessage('Không thể lưu dữ liệu vào trình duyệt (vượt quá dung lượng).');
      return false;
    }
  }, []);

  const flushSave = useCallback(() => {
    if (autosaveTimerRef.current !== null) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    performSave();
  }, [performSave]);

  // 1. BOOTSTRAP / INITIAL HYDRATION
  useEffect(() => {
    isSwitchingRef.current = true;
    const { library, wasCorrupted } = storageService.loadLibrary(
      timetableStateRef.current,
      printSettingsRef.current
    );

    if (wasCorrupted) {
      setToastMessage(
        'Không thể đọc dữ liệu đã lưu. Ứng dụng đã khởi tạo dữ liệu mới.'
      );
    }

    const activeId = library.currentDocumentId || library.documents[0]?.id;
    const targetDoc =
      library.documents.find((d) => d.id === activeId) || library.documents[0];

    if (targetDoc) {
      loadState(cloneDocumentData(targetDoc.timetable));
      if (targetDoc.printSettings) {
        loadSettings(cloneDocumentData(targetDoc.printSettings));
      }
      setCurrentDocumentId(targetDoc.id);
    }

    setDocuments(library.documents);
    setSaveStatus('saved');
    setLastSavedAt(new Date());

    // Give a short tick before allowing autosave to prevent initial state race
    setTimeout(() => {
      isSwitchingRef.current = false;
      setIsHydrated(true);
    }, 150);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. AUTOSAVE ON TIMETABLE / PRINT SETTINGS CHANGE
  useEffect(() => {
    if (!isHydrated || isSwitchingRef.current || !currentDocumentId) {
      return;
    }

    setSaveStatus('saving');

    if (autosaveTimerRef.current !== null) {
      clearTimeout(autosaveTimerRef.current);
    }

    // 700ms debounce
    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      performSave();
    }, 700);

    return () => {
      if (autosaveTimerRef.current !== null) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [timetableState, printSettings, isHydrated, currentDocumentId, performSave]);

  // 3. FLUSH SAVE ON TAB VISIBILITY CHANGE & PAGEHIDE
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushSave();
      }
    };

    const handlePageHide = () => {
      flushSave();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [flushSave]);

  // 4. SWITCH DOCUMENT (OPEN)
  const openDocument = useCallback(
    (id: string) => {
      if (id === currentDocumentIdRef.current) {
        setIsLibraryOpen(false);
        return;
      }

      // Flush current save before switching
      flushSave();

      const target = documentsRef.current.find((d) => d.id === id);
      if (!target) return;

      isSwitchingRef.current = true;
      setCurrentDocumentId(id);

      // Hydrate state
      loadState(cloneDocumentData(target.timetable));
      if (target.printSettings) {
        loadSettings(cloneDocumentData(target.printSettings));
      } else {
        resetSettings();
      }

      // Update storage currentDocumentId
      storageService.saveLibrary({
        schemaVersion: 1,
        currentDocumentId: id,
        documents: documentsRef.current,
      });

      setIsLibraryOpen(false);

      setTimeout(() => {
        isSwitchingRef.current = false;
        setSaveStatus('saved');
        setLastSavedAt(new Date());
      }, 150);
    },
    [flushSave, loadSettings, loadState, resetSettings]
  );

  // 5. CREATE NEW DOCUMENT
  const createNewDocument = useCallback(() => {
    // Flush current document save
    flushSave();

    isSwitchingRef.current = true;

    const newDoc = storageService.createDocument(
      'Thời Khóa Biểu',
      initialTimetableState,
      DEFAULT_PRINT_SETTINGS
    );

    // Apply default clean states
    loadState(cloneDocumentData(initialTimetableState));
    resetSettings();

    const nextDocs = [newDoc, ...documentsRef.current];
    setDocuments(nextDocs);
    setCurrentDocumentId(newDoc.id);

    storageService.saveLibrary({
      schemaVersion: 1,
      currentDocumentId: newDoc.id,
      documents: nextDocs,
    });

    setIsLibraryOpen(false);

    setTimeout(() => {
      isSwitchingRef.current = false;
      setSaveStatus('saved');
      setLastSavedAt(new Date());
    }, 150);
  }, [flushSave, loadState, resetSettings]);

  // 6. RENAME DOCUMENT
  const renameDocument = useCallback((id: string, newName: string) => {
    const trimmed = newName.trim() || 'Thời Khóa Biểu';
    const nowIso = new Date().toISOString();

    const nextDocs = documentsRef.current.map((doc) => {
      if (doc.id === id) {
        return {
          ...doc,
          name: trimmed,
          updatedAt: nowIso,
        };
      }
      return doc;
    });

    setDocuments(nextDocs);
    storageService.saveLibrary({
      schemaVersion: 1,
      currentDocumentId: currentDocumentIdRef.current || undefined,
      documents: nextDocs,
    });
  }, []);

  // 7. DUPLICATE DOCUMENT
  const duplicateDocument = useCallback(
    (id: string) => {
      flushSave();

      const target = documentsRef.current.find((d) => d.id === id);
      if (!target) return;

      const newName = generateDuplicateName(
        target.name,
        documentsRef.current.map((d) => d.name)
      );
      const nowIso = new Date().toISOString();

      const dupDoc: SavedTimetableDocument = {
        id: generateDocumentId(),
        name: newName,
        createdAt: nowIso,
        updatedAt: nowIso,
        dataVersion: 1,
        timetable: cloneDocumentData(target.timetable),
        printSettings: target.printSettings
          ? cloneDocumentData(target.printSettings)
          : cloneDocumentData(DEFAULT_PRINT_SETTINGS),
      };

      const nextDocs = [dupDoc, ...documentsRef.current];
      setDocuments(nextDocs);

      storageService.saveLibrary({
        schemaVersion: 1,
        currentDocumentId: currentDocumentIdRef.current || undefined,
        documents: nextDocs,
      });
    },
    [flushSave]
  );

  // 8. DELETE DOCUMENT
  const deleteDocument = useCallback(
    (id: string) => {
      if (autosaveTimerRef.current !== null) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }

      const remaining = documentsRef.current.filter((d) => d.id !== id);

      if (id === currentDocumentIdRef.current) {
        isSwitchingRef.current = true;

        if (remaining.length > 0) {
          // Switch to most recently updated document
          const nextDoc = remaining[0];
          loadState(cloneDocumentData(nextDoc.timetable));
          if (nextDoc.printSettings) {
            loadSettings(cloneDocumentData(nextDoc.printSettings));
          } else {
            resetSettings();
          }

          setCurrentDocumentId(nextDoc.id);
          setDocuments(remaining);

          storageService.saveLibrary({
            schemaVersion: 1,
            currentDocumentId: nextDoc.id,
            documents: remaining,
          });

          setTimeout(() => {
            isSwitchingRef.current = false;
            setSaveStatus('saved');
            setLastSavedAt(new Date());
          }, 150);
        } else {
          // If no documents left, create a fresh default document
          const freshDoc = storageService.createDocument(
            'Thời Khóa Biểu',
            initialTimetableState,
            DEFAULT_PRINT_SETTINGS
          );

          loadState(cloneDocumentData(initialTimetableState));
          resetSettings();

          const newDocs = [freshDoc];
          setCurrentDocumentId(freshDoc.id);
          setDocuments(newDocs);

          storageService.saveLibrary({
            schemaVersion: 1,
            currentDocumentId: freshDoc.id,
            documents: newDocs,
          });

          setTimeout(() => {
            isSwitchingRef.current = false;
            setSaveStatus('saved');
            setLastSavedAt(new Date());
          }, 150);
        }
      } else {
        // Just delete non-active document
        setDocuments(remaining);
        storageService.saveLibrary({
          schemaVersion: 1,
          currentDocumentId: currentDocumentIdRef.current || undefined,
          documents: remaining,
        });
      }
    },
    [loadSettings, loadState, resetSettings]
  );

  // 9. EXPORT BACKUP
  const exportBackup = useCallback(() => {
    // Flush current active edits first
    flushSave();

    const currDocs = documentsRef.current;
    const currId = currentDocumentIdRef.current;

    const currentLib: PersistedLibrary = {
      schemaVersion: 1,
      currentDocumentId: currId || undefined,
      documents: currDocs,
    };

    const backupPayload = buildBackupPayload(currentLib);
    triggerBackupDownload(backupPayload);
  }, [flushSave]);

  // 10. ATOMIC RESTORE BACKUP
  const restoreBackup = useCallback(
    (newLibrary: PersistedLibrary): boolean => {
      // Cancel pending autosave
      if (autosaveTimerRef.current !== null) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }

      // Step 1: Attempt transactional commit to storage first
      const saveSuccess = storageService.saveLibrary(newLibrary);
      if (!saveSuccess) {
        setToastMessage(
          'Không thể khôi phục dữ liệu. Dữ liệu hiện tại vẫn được giữ nguyên.'
        );
        return false;
      }

      // Step 2: Atomic state update
      isSwitchingRef.current = true;

      const activeId = newLibrary.currentDocumentId || newLibrary.documents[0]?.id;
      const targetDoc =
        newLibrary.documents.find((d) => d.id === activeId) || newLibrary.documents[0];

      if (targetDoc) {
        loadState(cloneDocumentData(targetDoc.timetable));
        if (targetDoc.printSettings) {
          loadSettings(cloneDocumentData(targetDoc.printSettings));
        } else {
          resetSettings();
        }
        setCurrentDocumentId(targetDoc.id);
      }

      setDocuments(newLibrary.documents);
      setToastMessage('Đã khôi phục dữ liệu thành công.');
      setIsLibraryOpen(false);

      setTimeout(() => {
        isSwitchingRef.current = false;
        setSaveStatus('saved');
        setLastSavedAt(new Date());
      }, 150);

      return true;
    },
    [loadSettings, loadState, resetSettings]
  );

  // 11. SAFE RESET ALL APP DATA
  const resetAllData = useCallback(() => {
    if (autosaveTimerRef.current !== null) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    // Clear ONLY app-specific keys, never touching other browser keys
    storageService.clearAppStorage();

    const freshDoc = storageService.createDocument(
      'Thời Khóa Biểu',
      initialTimetableState,
      DEFAULT_PRINT_SETTINGS
    );

    const freshLib: PersistedLibrary = {
      schemaVersion: 1,
      currentDocumentId: freshDoc.id,
      documents: [freshDoc],
    };

    storageService.saveLibrary(freshLib);

    isSwitchingRef.current = true;
    loadState(cloneDocumentData(initialTimetableState));
    resetSettings();
    setCurrentDocumentId(freshDoc.id);
    setDocuments([freshDoc]);
    setToastMessage('Đã xóa toàn bộ dữ liệu và khôi phục về mặc định.');
    setIsLibraryOpen(false);

    setTimeout(() => {
      isSwitchingRef.current = false;
      setSaveStatus('saved');
      setLastSavedAt(new Date());
    }, 150);
  }, [loadSettings, loadState, resetSettings]);

  const openLibrary = useCallback(() => setIsLibraryOpen(true), []);
  const closeLibrary = useCallback(() => setIsLibraryOpen(false), []);

  const openDataManagement = useCallback(() => setIsDataManagementOpen(true), []);
  const closeDataManagement = useCallback(() => setIsDataManagementOpen(false), []);

  const diagnostics = useMemo<StorageDiagnostics>(() => {
    return calculateStorageDiagnostics({
      schemaVersion: 1,
      currentDocumentId: currentDocumentId || undefined,
      documents,
    });
  }, [documents, currentDocumentId]);

  const currentDocument = useMemo(() => {
    return documents.find((d) => d.id === currentDocumentId) || null;
  }, [documents, currentDocumentId]);

  const currentDocumentName = useMemo(() => {
    if (currentDocument?.name) return currentDocument.name;
    return generateDefaultDocumentName(timetableState);
  }, [currentDocument, timetableState]);

  const lastSavedTimeStr = useMemo(() => {
    return formatTimeOnlyVN(lastSavedAt);
  }, [lastSavedAt]);

  const contextValue = useMemo<DocumentLibraryContextValue>(
    () => ({
      currentDocumentId,
      currentDocument,
      currentDocumentName,
      documents,
      saveStatus,
      lastSavedAt,
      lastSavedTimeStr,
      isHydrated,
      isLibraryOpen,
      isDataManagementOpen,
      toastMessage,
      diagnostics,
      showToast,
      dismissToast,
      openLibrary,
      closeLibrary,
      openDataManagement,
      closeDataManagement,
      createNewDocument,
      openDocument,
      renameDocument,
      duplicateDocument,
      deleteDocument,
      flushSave,
      exportBackup,
      restoreBackup,
      resetAllData,
    }),
    [
      currentDocumentId,
      currentDocument,
      currentDocumentName,
      documents,
      saveStatus,
      lastSavedAt,
      lastSavedTimeStr,
      isHydrated,
      isLibraryOpen,
      isDataManagementOpen,
      toastMessage,
      diagnostics,
      showToast,
      dismissToast,
      openLibrary,
      closeLibrary,
      openDataManagement,
      closeDataManagement,
      createNewDocument,
      openDocument,
      renameDocument,
      duplicateDocument,
      deleteDocument,
      flushSave,
      exportBackup,
      restoreBackup,
      resetAllData,
    ]
  );

  return (
    <DocumentLibraryContext.Provider value={contextValue}>
      {children}
    </DocumentLibraryContext.Provider>
  );
};

export function useDocumentLibrary(): DocumentLibraryContextValue {
  const context = useContext(DocumentLibraryContext);
  if (!context) {
    throw new Error(
      'useDocumentLibrary must be used within a DocumentLibraryProvider'
    );
  }
  return context;
}
