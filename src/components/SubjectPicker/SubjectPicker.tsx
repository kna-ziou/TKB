import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Clock,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';
import { Subject } from '../../types/subject';
import { ActiveCellTarget } from '../../types/timetable';
import { normalizeSubjectName, searchSubjects } from '../../utils/subjectUtils';
import { DAY_LABELS } from '../../utils/timetableFactory';
import { SubjectColorBadge } from '../SubjectColorBadge/SubjectColorBadge';

export const SubjectPicker: React.FC = () => {
  const {
    state,
    activeCell,
    closeCellPicker,
    setCellSubject,
    clearCell,
    addCustomSubject,
    recentSubjects,
  } = useTimetable();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customSubjectName, setCustomSubjectName] = useState('');
  const [customSubjectError, setCustomSubjectError] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  // Memoize filtered subjects - unconditionally before any early returns
  const filteredSubjects = useMemo(() => {
    const list = searchSubjects(state?.subjects || [], searchQuery);
    return [...list].sort((a, b) => {
      if (a.custom && !b.custom) return 1;
      if (!a.custom && b.custom) return -1;
      return 0;
    });
  }, [state?.subjects, searchQuery]);

  // Shared subject selection logic for click, Enter, and Space
  const handleSelectSubject = useCallback(
    (subject: Subject) => {
      if (!activeCell) return;
      setCellSubject(activeCell, subject.id);
    },
    [activeCell, setCellSubject]
  );

  // Reset search and custom subject state when a cell is opened
  useEffect(() => {
    if (activeCell) {
      setSearchQuery('');
      setIsAddingCustom(false);
      setCustomSubjectName('');
      setCustomSubjectError('');
      setHighlightedIndex(0);
    }
  }, [activeCell]);

  // Reset highlight index when query changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  // Keyboard navigation inside SubjectPicker
  useEffect(() => {
    if (!activeCell) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAddingCustom) {
          setIsAddingCustom(false);
          setCustomSubjectName('');
          setCustomSubjectError('');
        } else {
          closeCellPicker();
        }
        return;
      }

      if (isAddingCustom) return;

      const target = e.target as HTMLElement | null;
      const isSearchInput = target?.id === 'input-search-subject';
      const isButton = Boolean(target?.closest('button'));

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev < filteredSubjects.length - 1 ? prev + 1 : prev;
          const nextSubj = filteredSubjects[next];
          if (nextSubj) {
            document.getElementById(`picker-subj-${nextSubj.id}`)?.scrollIntoView({ block: 'nearest' });
          }
          return next;
        });
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev > 0 ? prev - 1 : 0;
          const nextSubj = filteredSubjects[next];
          if (nextSubj) {
            document.getElementById(`picker-subj-${nextSubj.id}`)?.scrollIntoView({ block: 'nearest' });
          }
          return next;
        });
        return;
      }

      // If focus is on any button, let the button's own handlers execute Enter/Space cleanly
      if (isButton) {
        return;
      }

      // If search input has focus and user hits Enter:
      if (e.key === 'Enter') {
        if (isSearchInput && filteredSubjects.length > 0 && highlightedIndex >= 0) {
          const selected = filteredSubjects[highlightedIndex];
          if (selected) {
            e.preventDefault();
            handleSelectSubject(selected);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeCell,
    closeCellPicker,
    filteredSubjects,
    handleSelectSubject,
    highlightedIndex,
    isAddingCustom,
  ]);

  // Focus search input on open
  useEffect(() => {
    if (activeCell && !isAddingCustom) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeCell, isAddingCustom]);

  // Focus custom input when toggled
  useEffect(() => {
    if (isAddingCustom) {
      const timer = setTimeout(() => {
        customInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isAddingCustom]);

  const lastActiveCellRef = useRef<ActiveCellTarget | null>(null);

  // Restore focus to originating timetable cell when picker closes
  useEffect(() => {
    if (activeCell) {
      lastActiveCellRef.current = activeCell;
    } else if (lastActiveCellRef.current) {
      const cell = lastActiveCellRef.current;
      lastActiveCellRef.current = null;
      requestAnimationFrame(() => {
        const el = document.getElementById(
          `cell-${cell.day}-${cell.session}-${cell.periodIndex}`
        );
        el?.focus();
      });
    }
  }, [activeCell]);

  if (!activeCell) return null;

  const { day, session, periodIndex } = activeCell;
  const currentCellData =
    state.schedule?.[day]?.[session]?.periods?.[periodIndex];
  const currentSubjectId = currentCellData?.subjectId;
  const currentCustomLabel = currentCellData?.customLabel;
  const hasContent = Boolean(currentSubjectId || currentCustomLabel);

  const handleClear = () => {
    if (!activeCell) return;
    clearCell(activeCell);
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCell) return;
    const cleanName = normalizeSubjectName(customSubjectName);
    if (!cleanName) {
      setCustomSubjectError('Vui lòng nhập tên môn');
      return;
    }

    addCustomSubject(cleanName, cleanName, undefined, activeCell);
    setCustomSubjectName('');
    setIsAddingCustom(false);
  };

  const dayLabel = DAY_LABELS[day] || day;
  const sessionLabel = session === 'morning' ? 'Buổi sáng' : 'Buổi chiều';
  const periodLabel = `Tiết ${periodIndex + 1}`;

  return (
    <div
      id="subject-picker-backdrop"
      className="fixed inset-0 z-[200] bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeCellPicker();
        }
      }}
    >
      <div
        id="subject-picker-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="picker-title"
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-sky-50/60">
          <div>
            <h3 id="picker-title" className="font-bold text-sky-900 text-base">
              Chọn môn học
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-0.5">
              <span>{dayLabel}</span>
              <span>•</span>
              <span>{sessionLabel}</span>
              <span>•</span>
              <span className="text-sky-700 font-semibold">{periodLabel}</span>
            </div>
          </div>
          <button
            id="btn-close-picker"
            type="button"
            onClick={closeCellPicker}
            aria-label="Đóng"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              id="input-search-subject"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm môn học... (ví dụ: Toán, Tiếng Anh)"
              className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-800"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Recent Subjects Section */}
        {!searchQuery && recentSubjects.length > 0 && (
          <div className="p-2.5 pb-2 border-b border-slate-100 bg-slate-50/50">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-1.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Gần đây</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recentSubjects.map((subj) => (
                <button
                  key={`recent-${subj.id}`}
                  id={`btn-recent-subj-${subj.id}`}
                  type="button"
                  tabIndex={0}
                  onClick={() => handleSelectSubject(subj)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelectSubject(subj);
                    }
                  }}
                  aria-label={`Môn gần đây: ${subj.displayName || subj.name}`}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-sky-50 focus-visible:bg-sky-50 text-xs font-medium text-slate-700 hover:text-sky-900 focus-visible:text-sky-900 transition-colors cursor-pointer border border-slate-200/80 shadow-2xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-500"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: subj.color }}
                  />
                  <span>{subj.displayName || subj.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Subject Inline Form */}
        {isAddingCustom ? (
          <div className="p-4 bg-sky-50/50 border-b border-sky-100">
            <form onSubmit={handleSaveCustom} className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-sky-900 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                  Thêm môn tùy chỉnh
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCustom(false);
                    setCustomSubjectError('');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Hủy
                </button>
              </div>
              <input
                ref={customInputRef}
                id="input-custom-subject-name"
                type="text"
                value={customSubjectName}
                onChange={(e) => {
                  setCustomSubjectName(e.target.value);
                  if (customSubjectError) setCustomSubjectError('');
                }}
                placeholder="Ví dụ: CLB Tiếng Anh, Bơi lội..."
                className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-800"
              />
              {customSubjectError && (
                <span className="text-xs text-rose-500">
                  {customSubjectError}
                </span>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  id="btn-submit-custom-subject"
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-xs cursor-pointer"
                >
                  Lưu & Chọn
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {/* Subjects List */}
        <div
          id="picker-subjects-list"
          className="flex-1 overflow-y-auto p-2 divide-y divide-slate-50"
        >
          {filteredSubjects.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Không tìm thấy môn nào khớp với &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            filteredSubjects.map((subj, idx) => {
              const isSelected = currentSubjectId === subj.id;
              const isHighlighted = idx === highlightedIndex;
              return (
                <button
                  key={subj.id}
                  id={`picker-subj-${subj.id}`}
                  type="button"
                  tabIndex={0}
                  onClick={() => handleSelectSubject(subj)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelectSubject(subj);
                    }
                  }}
                  onFocus={() => setHighlightedIndex(idx)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  aria-label={`Chọn môn ${subj.displayName || subj.name}${subj.custom ? ' (Tùy chỉnh)' : ''}${isSelected ? ' (Đang chọn)' : ''}`}
                  className={`w-full px-3 py-2 rounded-lg text-left flex items-center justify-between transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-500 ${
                    isSelected
                      ? 'bg-sky-50 text-sky-900 font-semibold ring-1 ring-sky-300'
                      : isHighlighted
                      ? 'bg-slate-100 text-slate-900 font-medium'
                      : 'hover:bg-sky-50/60 text-slate-800 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <SubjectColorBadge
                      color={subj.color}
                      size="sm"
                      isLocked={subj.colorLocked}
                      title={`Màu: ${subj.color}`}
                    />
                    <span className="text-sm truncate">
                      {subj.displayName || subj.name}
                    </span>
                    {subj.shortName && (
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {subj.shortName}
                      </span>
                    )}
                    {subj.custom && (
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                        Tùy chỉnh
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-sky-600 stroke-[2.5]" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer Actions: Add Custom + Clear Cell */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2">
          {!isAddingCustom && (
            <button
              id="btn-toggle-custom-subject"
              type="button"
              onClick={() => setIsAddingCustom(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-700 px-2.5 py-1.5 rounded-lg hover:bg-sky-50 transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Môn tùy chỉnh</span>
            </button>
          )}

          {hasContent && (
            <button
              id="btn-clear-cell"
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-600 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-colors ml-auto cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa tiết</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
