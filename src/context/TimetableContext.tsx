import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';
import { getTheme } from '../data/themes';
import {
  initialTimetableState,
  TimetableAction,
  timetableReducer,
} from '../reducer/timetableReducer';
import { TimetableClipboard } from '../types/clipboard';
import { Subject } from '../types/subject';
import { ThemeId, TimetableTheme } from '../types/theme';
import {
  ActiveCellTarget,
  DayKey,
  SessionType,
  TimetableConfig,
  TimetableMeta,
  TimetableState,
} from '../types/timetable';
import { DAY_LABELS } from '../utils/timetableFactory';
import { useToast } from './ToastContext';

export interface HistoryState {
  past: TimetableState[];
  present: TimetableState;
  future: TimetableState[];
}

export type HistoryAction =
  | TimetableAction
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET_HISTORY' };

export const MAX_HISTORY = 50;

export function isHistoryTrackedAction(action: TimetableAction): boolean {
  switch (action.type) {
    case 'SET_CELL_SUBJECT':
    case 'CLEAR_CELL':
    case 'CLEAR_DAY':
    case 'CLEAR_SESSION':
    case 'PASTE_DAY':
    case 'UPDATE_CONFIG':
    case 'RESIZE_SCHEDULE':
    case 'UPDATE_META':
    case 'GENERATE_TIMETABLE':
    case 'ADD_CUSTOM_SUBJECT':
    case 'RESET_TIMETABLE':
    case 'APPLY_TIMETABLE_IMPORT':
      return true;
    default:
      return false;
  }
}

export function historyReducer(
  history: HistoryState,
  action: HistoryAction
): HistoryState {
  const { past, present, future } = history;

  if (action.type === 'UNDO') {
    if (past.length === 0) return history;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    return {
      past: newPast,
      present: previous,
      future: [present, ...future],
    };
  }

  if (action.type === 'REDO') {
    if (future.length === 0) return history;
    const next = future[0];
    const newFuture = future.slice(1);
    return {
      past: [...past, present],
      present: next,
      future: newFuture,
    };
  }

  if (action.type === 'RESET_HISTORY') {
    return {
      past: [],
      present,
      future: [],
    };
  }

  if (action.type === 'LOAD_STATE') {
    return {
      past: [],
      present: action.payload,
      future: [],
    };
  }

  // Regular TimetableAction
  const nextPresent = timetableReducer(present, action);
  if (nextPresent === present) {
    return history;
  }

  if (!isHistoryTrackedAction(action)) {
    return {
      past,
      present: nextPresent,
      future,
    };
  }

  const nextPast = [
    ...past.slice(Math.max(0, past.length - (MAX_HISTORY - 1))),
    present,
  ];

  return {
    past: nextPast,
    present: nextPresent,
    future: [],
  };
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }
  if (target.isContentEditable) {
    return true;
  }
  return false;
}

function getNextCell(
  current: ActiveCellTarget,
  direction: 'up' | 'down' | 'left' | 'right',
  config: TimetableConfig
): ActiveCellTarget {
  const { activeDays, morningPeriods, afternoonPeriods, afternoonEnabled } =
    config;
  const dayIdx = activeDays.indexOf(current.day);
  const totalDays = activeDays.length;

  if (direction === 'left') {
    const nextDayIdx = Math.max(0, dayIdx - 1);
    return { ...current, day: activeDays[nextDayIdx] };
  }

  if (direction === 'right') {
    const nextDayIdx = Math.min(totalDays - 1, dayIdx + 1);
    return { ...current, day: activeDays[nextDayIdx] };
  }

  if (direction === 'up') {
    if (current.session === 'afternoon') {
      if (current.periodIndex > 0) {
        return { ...current, periodIndex: current.periodIndex - 1 };
      }
      return {
        ...current,
        session: 'morning',
        periodIndex: Math.max(0, morningPeriods - 1),
      };
    }
    if (current.periodIndex > 0) {
      return { ...current, periodIndex: current.periodIndex - 1 };
    }
    return current;
  }

  if (direction === 'down') {
    if (current.session === 'morning') {
      if (current.periodIndex < morningPeriods - 1) {
        return { ...current, periodIndex: current.periodIndex + 1 };
      }
      if (afternoonEnabled && afternoonPeriods > 0) {
        return { ...current, session: 'afternoon', periodIndex: 0 };
      }
      return current;
    }
    if (current.periodIndex < afternoonPeriods - 1) {
      return { ...current, periodIndex: current.periodIndex + 1 };
    }
    return current;
  }

  return current;
}

interface TimetableContextValue {
  state: TimetableState;
  theme: TimetableTheme;
  dispatch: React.Dispatch<TimetableAction>;

  // Cell Picker & Active Selection
  activeCell: ActiveCellTarget | null;
  openCellPicker: (cell: ActiveCellTarget) => void;
  closeCellPicker: () => void;
  selectedCell: ActiveCellTarget | null;
  setSelectedCell: (cell: ActiveCellTarget | null) => void;

  // History / Undo / Redo
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;

  // Internal Clipboard
  clipboard: TimetableClipboard;
  copyCell: (target: ActiveCellTarget) => void;
  pasteCell: (target: ActiveCellTarget) => void;
  copyDay: (day: DayKey) => void;
  pasteDayToTarget: (targetDay: DayKey) => void;

  // Bulk Actions
  clearDay: (day: DayKey) => void;
  clearSession: (session: SessionType) => void;

  // Recent Subjects
  recentSubjects: Subject[];
  recordRecentSubject: (subjectId: string) => void;

  // Timetable State Controls
  updateMeta: (meta: Partial<TimetableMeta>) => void;
  updateConfig: (config: Partial<TimetableConfig>) => void;
  setTheme: (themeId: ThemeId) => void;
  setCellSubject: (
    target: ActiveCellTarget,
    subjectId?: string,
    customLabel?: string
  ) => void;
  clearCell: (target: ActiveCellTarget) => void;
  addCustomSubject: (
    name: string,
    displayName?: string,
    shortName?: string,
    assignToCell?: ActiveCellTarget
  ) => void;
  updateSubject: (payload: {
    id: string;
    name?: string;
    displayName?: string;
    shortName?: string;
    color?: string;
    colorLocked?: boolean;
  }) => void;
  setSubjectColor: (id: string, color: string) => void;
  resetSubjectColor: (id: string) => void;
  setSubjectColorLock: (id: string, locked: boolean) => void;
  lockAllSubjectColors: () => void;
  unlockAllSubjectColors: () => void;
  resetAllSubjectColors: () => void;
  deleteCustomSubject: (id: string) => void;
  isSubjectManagerOpen: boolean;
  openSubjectManager: () => void;
  closeSubjectManager: () => void;
  generateTimetable: () => void;
  resetTimetable: () => void;
  loadState: (newState: TimetableState) => void;
  applyTimetableImport: (nextState: TimetableState) => void;
  getSubjectById: (id?: string) => Subject | undefined;
}

const TimetableContext = createContext<TimetableContextValue | null>(null);

export interface TimetableProviderProps {
  children: React.ReactNode;
  initialStateOverride?: Partial<TimetableState>;
}

export function TimetableProvider({
  children,
  initialStateOverride,
}: TimetableProviderProps) {
  const { showToast } = useToast();

  const [history, dispatchHistory] = useReducer(historyReducer, {
    past: [],
    present: initialStateOverride
      ? { ...initialTimetableState, ...initialStateOverride }
      : initialTimetableState,
    future: [],
  });

  const state = history.present;
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  // Dispatch adapter for standard TimetableAction
  const dispatch = useCallback((action: TimetableAction) => {
    dispatchHistory(action);
  }, []);

  const [activeCell, setActiveCell] = useState<ActiveCellTarget | null>(null);
  const [selectedCell, setSelectedCell] = useState<ActiveCellTarget | null>(null);
  const [clipboard, setClipboard] = useState<TimetableClipboard>(null);
  const [recentSubjectIds, setRecentSubjectIds] = useState<string[]>([]);
  const [isSubjectManagerOpen, setIsSubjectManagerOpen] = useState(false);

  // Memoized map for fast subject lookup by ID
  const subjectsMap = useMemo(() => {
    const map = new Map<string, Subject>();
    state.subjects.forEach((subj) => map.set(subj.id, subj));
    return map;
  }, [state.subjects]);

  const getSubjectById = useCallback(
    (id?: string): Subject | undefined => {
      if (!id) return undefined;
      return subjectsMap.get(id);
    },
    [subjectsMap]
  );

  const theme = useMemo(
    () => getTheme(state.themeId || 'professional'),
    [state.themeId]
  );

  // Recent subjects list
  const recentSubjects = useMemo(() => {
    return recentSubjectIds
      .map((id) => subjectsMap.get(id))
      .filter((s): s is Subject => Boolean(s));
  }, [recentSubjectIds, subjectsMap]);

  const recordRecentSubject = useCallback((subjectId: string) => {
    if (!subjectId) return;
    setRecentSubjectIds((prev) => [
      subjectId,
      ...prev.filter((id) => id !== subjectId),
    ].slice(0, 5));
  }, []);

  // Cell Picker Controls
  const openCellPicker = useCallback((cell: ActiveCellTarget) => {
    setActiveCell(cell);
    setSelectedCell(cell);
  }, []);

  const closeCellPicker = useCallback(() => {
    setActiveCell(null);
  }, []);

  // History controls
  const undo = useCallback(() => {
    if (!canUndo) return;
    dispatchHistory({ type: 'UNDO' });
    showToast('Đã hoàn tác', 'info');
  }, [canUndo, showToast]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    dispatchHistory({ type: 'REDO' });
    showToast('Đã làm lại', 'info');
  }, [canRedo, showToast]);

  const clearHistory = useCallback(() => {
    dispatchHistory({ type: 'RESET_HISTORY' });
  }, []);

  // Cell & Day Clipboard Controls
  const copyCell = useCallback(
    (target: ActiveCellTarget) => {
      const cellData =
        state.schedule[target.day]?.[target.session]?.periods?.[
          target.periodIndex
        ];
      if (!cellData?.subjectId && !cellData?.customLabel) {
        showToast('Ô trống, không có dữ liệu để sao chép', 'info');
        setClipboard({
          type: 'cell',
          data: {},
        });
        return;
      }
      setClipboard({
        type: 'cell',
        data: {
          subjectId: cellData.subjectId,
          customLabel: cellData.customLabel,
        },
      });
      showToast('Đã sao chép tiết học', 'info');
    },
    [state.schedule, showToast]
  );

  const pasteCell = useCallback(
    (target: ActiveCellTarget) => {
      if (!clipboard || clipboard.type !== 'cell') {
        showToast('Không có gì để dán', 'warning');
        return;
      }

      if (clipboard.data.subjectId) {
        const exists = state.subjects.some(
          (s) => s.id === clipboard.data.subjectId
        );
        if (!exists) {
          showToast('Môn học đã không còn tồn tại.', 'warning');
          return;
        }
      }

      dispatch({
        type: 'SET_CELL_SUBJECT',
        payload: {
          day: target.day,
          session: target.session,
          periodIndex: target.periodIndex,
          subjectId: clipboard.data.subjectId,
          customLabel: clipboard.data.customLabel,
        },
      });

      if (clipboard.data.subjectId) {
        recordRecentSubject(clipboard.data.subjectId);
      }

      showToast('Đã dán tiết học', 'success');
    },
    [clipboard, dispatch, recordRecentSubject, showToast, state.subjects]
  );

  const copyDay = useCallback(
    (day: DayKey) => {
      const daySchedule = state.schedule[day];
      if (!daySchedule) return;

      const morning = (daySchedule.morning?.periods || []).map((p) => ({
        subjectId: p.subjectId,
        customLabel: p.customLabel,
      }));
      const afternoon = (daySchedule.afternoon?.periods || []).map((p) => ({
        subjectId: p.subjectId,
        customLabel: p.customLabel,
      }));

      setClipboard({
        type: 'day',
        day,
        periods: { morning, afternoon },
      });
      const dayLabel = DAY_LABELS[day] || day;
      showToast(`Đã sao chép ${dayLabel}`, 'info');
    },
    [state.schedule, showToast]
  );

  const pasteDayToTarget = useCallback(
    (targetDay: DayKey) => {
      if (!clipboard || clipboard.type !== 'day') {
        showToast('Không có dữ liệu ngày để dán', 'warning');
        return;
      }

      dispatch({
        type: 'PASTE_DAY',
        payload: {
          targetDay,
          sourcePeriods: clipboard.periods,
        },
      });
      const targetDayLabel = DAY_LABELS[targetDay] || targetDay;
      showToast(`Đã dán vào ${targetDayLabel}`, 'success');
    },
    [clipboard, dispatch, showToast]
  );

  const clearDay = useCallback(
    (day: DayKey) => {
      dispatch({ type: 'CLEAR_DAY', payload: { day } });
      const dayLabel = DAY_LABELS[day] || day;
      showToast(`Đã xóa môn ${dayLabel}`, 'info');
    },
    [dispatch, showToast]
  );

  const clearSession = useCallback(
    (session: SessionType) => {
      dispatch({ type: 'CLEAR_SESSION', payload: { session } });
      const sessionLabel = session === 'morning' ? 'buổi sáng' : 'buổi chiều';
      showToast(`Đã xóa môn ${sessionLabel}`, 'info');
    },
    [dispatch, showToast]
  );

  // Subject assignment & clearing
  const setCellSubject = useCallback(
    (
      target: ActiveCellTarget,
      subjectId?: string,
      customLabel?: string
    ) => {
      dispatch({
        type: 'SET_CELL_SUBJECT',
        payload: {
          day: target.day,
          session: target.session,
          periodIndex: target.periodIndex,
          subjectId,
          customLabel,
        },
      });
      if (subjectId) {
        recordRecentSubject(subjectId);
      }
      closeCellPicker();
    },
    [closeCellPicker, dispatch, recordRecentSubject]
  );

  const clearCell = useCallback(
    (target: ActiveCellTarget) => {
      dispatch({
        type: 'CLEAR_CELL',
        payload: {
          day: target.day,
          session: target.session,
          periodIndex: target.periodIndex,
        },
      });
      closeCellPicker();
      showToast('Đã xóa tiết học', 'info');
    },
    [closeCellPicker, dispatch, showToast]
  );

  const openSubjectManager = useCallback(() => {
    setIsSubjectManagerOpen(true);
  }, []);

  const closeSubjectManager = useCallback(() => {
    setIsSubjectManagerOpen(false);
  }, []);

  const updateMeta = useCallback(
    (meta: Partial<TimetableMeta>) => {
      dispatch({ type: 'UPDATE_META', payload: meta });
    },
    [dispatch]
  );

  const updateConfig = useCallback(
    (config: Partial<TimetableConfig>) => {
      dispatch({ type: 'UPDATE_CONFIG', payload: config });
    },
    [dispatch]
  );

  const setTheme = useCallback(
    (themeId: ThemeId) => {
      dispatch({ type: 'SET_THEME', payload: { themeId } });
    },
    [dispatch]
  );

  const addCustomSubject = useCallback(
    (
      name: string,
      displayName?: string,
      shortName?: string,
      assignToCell?: ActiveCellTarget
    ) => {
      dispatch({
        type: 'ADD_CUSTOM_SUBJECT',
        payload: {
          name,
          displayName,
          shortName,
          assignToCell,
        },
      });
      if (assignToCell) {
        closeCellPicker();
      }
    },
    [closeCellPicker, dispatch]
  );

  const updateSubject = useCallback(
    (payload: {
      id: string;
      name?: string;
      displayName?: string;
      shortName?: string;
      color?: string;
      colorLocked?: boolean;
    }) => {
      dispatch({ type: 'UPDATE_SUBJECT', payload });
    },
    [dispatch]
  );

  const setSubjectColor = useCallback(
    (id: string, color: string) => {
      dispatch({ type: 'SET_SUBJECT_COLOR', payload: { id, color } });
    },
    [dispatch]
  );

  const resetSubjectColor = useCallback(
    (id: string) => {
      dispatch({ type: 'RESET_SUBJECT_COLOR', payload: { id } });
    },
    [dispatch]
  );

  const setSubjectColorLock = useCallback(
    (id: string, locked: boolean) => {
      dispatch({ type: 'SET_SUBJECT_COLOR_LOCK', payload: { id, locked } });
    },
    [dispatch]
  );

  const lockAllSubjectColors = useCallback(() => {
    dispatch({ type: 'LOCK_ALL_SUBJECT_COLORS' });
  }, [dispatch]);

  const unlockAllSubjectColors = useCallback(() => {
    dispatch({ type: 'UNLOCK_ALL_SUBJECT_COLORS' });
  }, [dispatch]);

  const resetAllSubjectColors = useCallback(() => {
    dispatch({ type: 'RESET_ALL_SUBJECT_COLORS' });
  }, [dispatch]);

  const deleteCustomSubject = useCallback(
    (id: string) => {
      dispatch({ type: 'DELETE_CUSTOM_SUBJECT', payload: { id } });
    },
    [dispatch]
  );

  const generateTimetable = useCallback(() => {
    dispatch({ type: 'GENERATE_TIMETABLE' });
  }, [dispatch]);

  const resetTimetable = useCallback(() => {
    dispatch({ type: 'RESET_TIMETABLE' });
  }, [dispatch]);

  const loadState = useCallback(
    (newState: TimetableState) => {
      dispatch({ type: 'LOAD_STATE', payload: newState });
    },
    [dispatch]
  );

  const applyTimetableImport = useCallback(
    (nextState: TimetableState) => {
      dispatch({ type: 'APPLY_TIMETABLE_IMPORT', payload: { nextState } });
    },
    [dispatch]
  );

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Critical Safety: Never hijack native inputs / textareas / editable elements
      if (isEditableElement(e.target)) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Undo / Redo
      if (isCtrlOrCmd && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
        return;
      }

      if (isCtrlOrCmd && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        if (canRedo) redo();
        return;
      }

      // If a modal or popover is open, don't execute cell navigation
      if (activeCell || isSubjectManagerOpen) {
        return;
      }

      // Grid cell shortcuts when a cell is selected
      const targetCell =
        selectedCell ||
        (() => {
          const activeId = document.activeElement?.id;
          if (!activeId || !activeId.startsWith('cell-')) return null;
          const parts = activeId.split('-');
          if (parts.length === 4) {
            return {
              day: parts[1] as DayKey,
              session: parts[2] as SessionType,
              periodIndex: parseInt(parts[3], 10),
            };
          }
          return null;
        })();

      if (targetCell) {
        if (isCtrlOrCmd && (e.key === 'c' || e.key === 'C')) {
          e.preventDefault();
          copyCell(targetCell);
          return;
        }

        if (isCtrlOrCmd && (e.key === 'v' || e.key === 'V')) {
          e.preventDefault();
          pasteCell(targetCell);
          return;
        }

        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          clearCell(targetCell);
          return;
        }

        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openCellPicker(targetCell);
          return;
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedCell((curr) => {
            const current = curr || targetCell;
            const next = current ? getNextCell(current, 'up', state.config) : null;
            if (next) {
              requestAnimationFrame(() => {
                document.getElementById(`cell-${next.day}-${next.session}-${next.periodIndex}`)?.focus();
              });
            }
            return next;
          });
          return;
        }

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedCell((curr) => {
            const current = curr || targetCell;
            const next = current ? getNextCell(current, 'down', state.config) : null;
            if (next) {
              requestAnimationFrame(() => {
                document.getElementById(`cell-${next.day}-${next.session}-${next.periodIndex}`)?.focus();
              });
            }
            return next;
          });
          return;
        }

        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setSelectedCell((curr) => {
            const current = curr || targetCell;
            const next = current ? getNextCell(current, 'left', state.config) : null;
            if (next) {
              requestAnimationFrame(() => {
                document.getElementById(`cell-${next.day}-${next.session}-${next.periodIndex}`)?.focus();
              });
            }
            return next;
          });
          return;
        }

        if (e.key === 'ArrowRight') {
          e.preventDefault();
          setSelectedCell((curr) => {
            const current = curr || targetCell;
            const next = current ? getNextCell(current, 'right', state.config) : null;
            if (next) {
              requestAnimationFrame(() => {
                document.getElementById(`cell-${next.day}-${next.session}-${next.periodIndex}`)?.focus();
              });
            }
            return next;
          });
          return;
        }

        if (e.key === 'Escape') {
          setSelectedCell(null);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    canUndo,
    canRedo,
    undo,
    redo,
    selectedCell,
    activeCell,
    isSubjectManagerOpen,
    copyCell,
    pasteCell,
    clearCell,
    openCellPicker,
    state.config,
  ]);

  const contextValue = useMemo<TimetableContextValue>(
    () => ({
      state,
      theme,
      dispatch,
      activeCell,
      openCellPicker,
      closeCellPicker,
      selectedCell,
      setSelectedCell,
      canUndo,
      canRedo,
      undo,
      redo,
      clearHistory,
      clipboard,
      copyCell,
      pasteCell,
      copyDay,
      pasteDayToTarget,
      clearDay,
      clearSession,
      recentSubjects,
      recordRecentSubject,
      updateMeta,
      updateConfig,
      setTheme,
      setCellSubject,
      clearCell,
      addCustomSubject,
      updateSubject,
      setSubjectColor,
      resetSubjectColor,
      setSubjectColorLock,
      lockAllSubjectColors,
      unlockAllSubjectColors,
      resetAllSubjectColors,
      deleteCustomSubject,
      isSubjectManagerOpen,
      openSubjectManager,
      closeSubjectManager,
      generateTimetable,
      resetTimetable,
      loadState,
      applyTimetableImport,
      getSubjectById,
    }),
    [
      state,
      theme,
      dispatch,
      activeCell,
      openCellPicker,
      closeCellPicker,
      selectedCell,
      canUndo,
      canRedo,
      undo,
      redo,
      clearHistory,
      clipboard,
      copyCell,
      pasteCell,
      copyDay,
      pasteDayToTarget,
      clearDay,
      clearSession,
      recentSubjects,
      recordRecentSubject,
      updateMeta,
      updateConfig,
      setTheme,
      setCellSubject,
      clearCell,
      addCustomSubject,
      updateSubject,
      setSubjectColor,
      resetSubjectColor,
      setSubjectColorLock,
      lockAllSubjectColors,
      unlockAllSubjectColors,
      resetAllSubjectColors,
      deleteCustomSubject,
      isSubjectManagerOpen,
      openSubjectManager,
      closeSubjectManager,
      generateTimetable,
      resetTimetable,
      loadState,
      applyTimetableImport,
      getSubjectById,
    ]
  );

  return (
    <TimetableContext.Provider value={contextValue}>
      {children}
    </TimetableContext.Provider>
  );
}

export function useTimetable(): TimetableContextValue {
  const context = useContext(TimetableContext);
  if (!context) {
    throw new Error('useTimetable must be used within a TimetableProvider');
  }
  return context;
}
