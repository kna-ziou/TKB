import React, { useMemo, useState, useEffect } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  Edit2,
  Filter,
  Lock,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';
import { Subject } from '../../types/subject';
import {
  getSubjectUsageCount,
  normalizeSubjectName,
  searchSubjects,
} from '../../utils/subjectUtils';
import { SubjectColorBadge } from '../SubjectColorBadge/SubjectColorBadge';
import { SubjectEditor } from '../SubjectEditor/SubjectEditor';

export const SubjectManager: React.FC = () => {
  const {
    state,
    isSubjectManagerOpen,
    closeSubjectManager,
    updateSubject,
    lockAllSubjectColors,
    unlockAllSubjectColors,
    resetAllSubjectColors,
    deleteCustomSubject,
    addCustomSubject,
  } = useTimetable();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'default' | 'custom'>('all');
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  // Safe delete dialog state
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  // Reset all colors confirmation state
  const [showResetAllConfirm, setShowResetAllConfirm] = useState(false);

  // Inline custom subject creation inside manager
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomError, setNewCustomError] = useState('');

  // Count metrics
  const totalCount = state.subjects.length;
  const defaultCount = useMemo(
    () => state.subjects.filter((s) => !s.custom).length,
    [state.subjects]
  );
  const customCount = useMemo(
    () => state.subjects.filter((s) => s.custom).length,
    [state.subjects]
  );

  // Filtered and searched subjects
  const filteredSubjects = useMemo(() => {
    let list = state.subjects;
    if (activeTab === 'default') {
      list = list.filter((s) => !s.custom);
    } else if (activeTab === 'custom') {
      list = list.filter((s) => s.custom);
    }
    return searchSubjects(list, searchQuery);
  }, [state.subjects, activeTab, searchQuery]);

  // Handle Escape key
  useEffect(() => {
    if (!isSubjectManagerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showResetAllConfirm) {
          setShowResetAllConfirm(false);
        } else if (subjectToDelete) {
          setSubjectToDelete(null);
        } else if (editingSubject) {
          setEditingSubject(null);
        } else if (isCreatingCustom) {
          setIsCreatingCustom(false);
        } else {
          closeSubjectManager();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isSubjectManagerOpen,
    showResetAllConfirm,
    subjectToDelete,
    editingSubject,
    isCreatingCustom,
    closeSubjectManager,
  ]);

  if (!isSubjectManagerOpen) return null;

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normalizeSubjectName(newCustomName);
    if (!clean) {
      setNewCustomError('Vui lòng nhập tên môn.');
      return;
    }
    addCustomSubject(clean, clean);
    setNewCustomName('');
    setIsCreatingCustom(false);
    setNewCustomError('');
  };

  const handleConfirmDelete = () => {
    if (subjectToDelete) {
      deleteCustomSubject(subjectToDelete.id);
      if (editingSubject?.id === subjectToDelete.id) {
        setEditingSubject(null);
      }
      setSubjectToDelete(null);
    }
  };

  const handleConfirmResetAll = () => {
    resetAllSubjectColors();
    setShowResetAllConfirm(false);
  };

  return (
    <div
      id="subject-manager-backdrop"
      className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !editingSubject && !subjectToDelete && !showResetAllConfirm) {
          closeSubjectManager();
        }
      }}
    >
      <div
        id="subject-manager-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manager-title"
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150 relative"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 id="manager-title" className="font-bold text-slate-900 text-base sm:text-lg">
                Quản lý môn học
              </h2>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Tùy chỉnh tên hiển thị, tên viết tắt, màu sắc và khóa màu cho từng môn.
              </p>
            </div>
          </div>

          <button
            id="btn-close-subject-manager"
            type="button"
            onClick={closeSubjectManager}
            aria-label="Đóng bảng quản lý môn học"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Toolbar */}
        <div className="p-3 sm:px-5 sm:py-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              id="tab-all-subjects"
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({totalCount})
            </button>
            <button
              id="tab-default-subjects"
              type="button"
              onClick={() => setActiveTab('default')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'default'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mặc định ({defaultCount})
            </button>
            <button
              id="tab-custom-subjects"
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'custom'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tùy chỉnh ({customCount})
            </button>
          </div>

          {/* Color Batch Actions */}
          <div className="flex items-center gap-1.5">
            <button
              id="btn-lock-all-colors"
              type="button"
              onClick={lockAllSubjectColors}
              title="Khóa tất cả màu môn học"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Khóa tất cả</span>
            </button>

            <button
              id="btn-unlock-all-colors"
              type="button"
              onClick={unlockAllSubjectColors}
              title="Mở khóa tất cả màu môn học"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Mở khóa</span>
            </button>

            <button
              id="btn-trigger-reset-all"
              type="button"
              onClick={() => setShowResetAllConfirm(true)}
              title="Khôi phục toàn bộ màu về mặc định"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-rose-600 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Khôi phục màu</span>
            </button>
          </div>
        </div>

        {/* Search & Add Bar */}
        <div className="p-3 sm:px-5 sm:py-3 border-b border-slate-100 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-manager-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm môn theo tên, tên hiển thị, viết tắt..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-800"
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

          <button
            id="btn-manager-toggle-create"
            type="button"
            onClick={() => setIsCreatingCustom(!isCreatingCustom)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm môn</span>
          </button>
        </div>

        {/* Inline Create Form */}
        {isCreatingCustom && (
          <form
            onSubmit={handleCreateCustom}
            className="p-3 sm:px-5 bg-sky-50/70 border-b border-sky-100 flex flex-col sm:flex-row items-center gap-2"
          >
            <input
              id="input-new-custom-name"
              type="text"
              value={newCustomName}
              onChange={(e) => {
                setNewCustomName(e.target.value);
                if (newCustomError) setNewCustomError('');
              }}
              placeholder="Tên môn tùy chỉnh mới (ví dụ: CLB Tiếng Anh, Bơi lội...)"
              className="w-full sm:flex-1 px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800"
            />
            {newCustomError && (
              <span className="text-xs text-rose-500">{newCustomError}</span>
            )}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsCreatingCustom(false);
                  setNewCustomName('');
                  setNewCustomError('');
                }}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Hủy
              </button>
              <button
                id="btn-submit-new-custom"
                type="submit"
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-xs cursor-pointer"
              >
                Tạo môn
              </button>
            </div>
          </form>
        )}

        {/* Subject Items List */}
        <div
          id="manager-subject-list"
          className="flex-1 overflow-y-auto p-3 sm:p-5 divide-y divide-slate-100"
        >
          {filteredSubjects.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Không tìm thấy môn học nào phù hợp.
            </div>
          ) : (
            filteredSubjects.map((subj) => {
              const usageCount = getSubjectUsageCount(state.schedule, subj.id);
              const isCustom = Boolean(subj.custom);
              const displayName = subj.displayName || subj.name;
              const hasDifferentOriginalName = !isCustom && displayName !== subj.name;

              return (
                <div
                  key={subj.id}
                  id={`subject-item-${subj.id}`}
                  className="py-3 px-2 flex items-center justify-between hover:bg-slate-50/70 rounded-xl transition-colors group"
                >
                  {/* Left: Swatch + Names */}
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <button
                      type="button"
                      onClick={() => setEditingSubject(subj)}
                      title="Chỉnh sửa màu môn học"
                      className="cursor-pointer"
                    >
                      <SubjectColorBadge
                        color={subj.color}
                        size="md"
                        isLocked={subj.colorLocked}
                        title={`Màu ${subj.color}`}
                      />
                    </button>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {displayName}
                        </span>

                        {subj.shortName && (
                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                            {subj.shortName}
                          </span>
                        )}

                        {isCustom ? (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                            Tùy chỉnh
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                            Mặc định
                          </span>
                        )}
                      </div>

                      {hasDifferentOriginalName && (
                        <span className="text-[11px] text-slate-400 truncate">
                          Tên gốc: {subj.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Usage Badge + Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        usageCount > 0
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'text-slate-400 bg-slate-100'
                      }`}
                    >
                      {usageCount > 0 ? `${usageCount} tiết` : 'Chưa dùng'}
                    </span>

                    <button
                      id={`btn-edit-subject-${subj.id}`}
                      type="button"
                      onClick={() => setEditingSubject(subj)}
                      aria-label={`Sửa môn ${displayName}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
                      title="Chỉnh sửa tên và màu"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {isCustom && (
                      <button
                        id={`btn-delete-subject-${subj.id}`}
                        type="button"
                        onClick={() => setSubjectToDelete(subj)}
                        aria-label={`Xóa môn ${displayName}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Xóa môn tùy chỉnh"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:px-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Tổng số: <strong className="text-slate-800">{totalCount}</strong> môn học
          </span>
          <button
            id="btn-manager-done"
            type="button"
            onClick={closeSubjectManager}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Hoàn tất
          </button>
        </div>

        {/* Child: SubjectEditor Modal Overlay */}
        {editingSubject && (
          <div className="absolute inset-0 z-20 bg-white">
            <SubjectEditor
              subject={editingSubject}
              usageCount={getSubjectUsageCount(state.schedule, editingSubject.id)}
              onSave={(updated) => {
                updateSubject(updated);
                setEditingSubject(null);
              }}
              onDeleteRequest={(subj) => {
                setSubjectToDelete(subj);
              }}
              onClose={() => setEditingSubject(null)}
            />
          </div>
        )}

        {/* Child: Safe Delete Confirmation Dialog */}
        {subjectToDelete && (
          <div
            id="safe-delete-dialog-backdrop"
            className="absolute inset-0 z-30 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4"
          >
            <div
              id="safe-delete-dialog"
              className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="flex items-center gap-2.5 text-rose-600 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <h4 className="font-bold text-base text-slate-900">
                  {getSubjectUsageCount(state.schedule, subjectToDelete.id) > 0
                    ? 'Môn này đang được sử dụng'
                    : 'Xác nhận xóa môn học'}
                </h4>
              </div>

              <div className="text-xs text-slate-600 mb-4 leading-relaxed">
                {getSubjectUsageCount(state.schedule, subjectToDelete.id) > 0 ? (
                  <>
                    Môn &ldquo;<strong>{subjectToDelete.displayName || subjectToDelete.name}</strong>&rdquo; đang xuất hiện trong{' '}
                    <strong className="text-rose-600">
                      {getSubjectUsageCount(state.schedule, subjectToDelete.id)}
                    </strong>{' '}
                    tiết học.
                    <br />
                    Nếu xóa môn này, các tiết học đó sẽ tự động trở về trạng thái trống.
                  </>
                ) : (
                  <>
                    Bạn có chắc chắn muốn xóa môn tùy chỉnh &ldquo;
                    <strong>{subjectToDelete.displayName || subjectToDelete.name}</strong>&rdquo; khỏi danh sách?
                  </>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  id="btn-cancel-delete"
                  type="button"
                  onClick={() => setSubjectToDelete(null)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  id="btn-confirm-delete"
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs transition-colors cursor-pointer"
                >
                  Xóa môn
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Child: Reset All Colors Confirmation Dialog */}
        {showResetAllConfirm && (
          <div
            id="reset-all-dialog-backdrop"
            className="absolute inset-0 z-30 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4"
          >
            <div
              id="reset-all-dialog"
              className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="flex items-center gap-2.5 text-amber-600 mb-2">
                <RotateCcw className="w-5 h-5" />
                <h4 className="font-bold text-base text-slate-900">
                  Khôi phục toàn bộ màu?
                </h4>
              </div>

              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                Tất cả môn học sẽ được khôi phục về màu mặc định ban đầu. Tên hiển thị và cấu trúc thời khóa biểu của bạn vẫn được giữ nguyên.
              </p>

              <div className="flex items-center justify-end gap-2">
                <button
                  id="btn-cancel-reset-all"
                  type="button"
                  onClick={() => setShowResetAllConfirm(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  id="btn-confirm-reset-all"
                  type="button"
                  onClick={handleConfirmResetAll}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-xs transition-colors cursor-pointer"
                >
                  Khôi phục
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
