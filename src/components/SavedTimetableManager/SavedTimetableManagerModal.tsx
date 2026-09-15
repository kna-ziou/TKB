import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Plus,
  Search,
  FolderOpen,
  Calendar,
  Copy,
  Trash2,
  Edit3,
  CheckCircle2,
  Info,
  Palette,
  Database,
} from 'lucide-react';
import { useDocumentLibrary } from '../../context/DocumentLibraryContext';
import { SavedTimetableDocument } from '../../types/persistence';
import { formatDateTimeVN, searchDocuments } from '../../utils/persistenceUtils';
import { RenameDialog } from './RenameDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { getTheme } from '../../data/themes';

export const SavedTimetableManagerModal: React.FC = () => {
  const {
    isLibraryOpen,
    closeLibrary,
    documents,
    currentDocumentId,
    openDocument,
    createNewDocument,
    renameDocument,
    duplicateDocument,
    deleteDocument,
    openDataManagement,
  } = useDocumentLibrary();

  const [searchQuery, setSearchQuery] = useState('');
  const [docToRename, setDocToRename] = useState<SavedTimetableDocument | null>(null);
  const [docToDelete, setDocToDelete] = useState<SavedTimetableDocument | null>(null);

  // Filter documents based on query
  const filteredDocs = useMemo(() => {
    return searchDocuments(documents, searchQuery);
  }, [documents, searchQuery]);

  // Handle Escape key
  useEffect(() => {
    if (!isLibraryOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (docToDelete) {
          setDocToDelete(null);
        } else if (docToRename) {
          setDocToRename(null);
        } else {
          closeLibrary();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLibraryOpen, docToDelete, docToRename, closeLibrary]);

  if (!isLibraryOpen) return null;

  return (
    <div
      id="saved-timetable-manager-overlay"
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="saved-timetable-manager-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-modal-title"
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="library-modal-title"
                  className="text-base sm:text-lg font-bold text-slate-900 tracking-tight"
                >
                  TKB CỦA TÔI
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-700">
                  {documents.length} bản lưu
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Quản lý, mở lại hoặc nhân bản các thời khóa biểu đã lưu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-manager-new-tkb"
              onClick={createNewDocument}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>TKB mới</span>
            </button>
            <button
              type="button"
              onClick={closeLibrary}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="library-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên bản lưu, lớp, trường, học sinh..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Document List */}
        <div
          id="saved-timetable-list"
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 min-h-[220px]"
        >
          {filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <Calendar className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">
                {searchQuery
                  ? 'Không tìm thấy thời khóa biểu nào phù hợp'
                  : 'Chưa có thời khóa biểu nào'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {searchQuery
                  ? 'Thử tìm kiếm với từ khóa khác'
                  : 'Bấm “TKB mới” để bắt đầu tạo thời khóa biểu'}
              </p>
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const isActive = doc.id === currentDocumentId;
              const docTheme = getTheme(doc.timetable?.themeId || 'professional');
              const meta = doc.timetable?.meta;
              const config = doc.timetable?.config;
              const daysCount = config?.activeDays?.length || 5;

              return (
                <div
                  key={doc.id}
                  id={`saved-doc-${doc.id}`}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-sky-50/50 border-sky-300 ring-1 ring-sky-300/40 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Info */}
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm sm:text-base tracking-tight truncate max-w-[260px] sm:max-w-[340px]">
                          {doc.name}
                        </span>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300/60">
                            <CheckCircle2 className="w-3 h-3" />
                            Đang mở
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          <Palette className="w-2.5 h-2.5 text-slate-500" />
                          {docTheme.name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                          {daysCount} ngày
                        </span>
                      </div>

                      {/* Sub-meta (School, Class, Student) */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        {meta?.className && (
                          <span>
                            Lớp: <strong className="text-slate-700">{meta.className}</strong>
                          </span>
                        )}
                        {meta?.schoolName && (
                          <span className="truncate max-w-[200px]" title={meta.schoolName}>
                            Trường: {meta.schoolName}
                          </span>
                        )}
                        {meta?.studentName && (
                          <span className="truncate max-w-[150px]" title={meta.studentName}>
                            Học sinh: {meta.studentName}
                          </span>
                        )}
                      </div>

                      {/* Update timestamp */}
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <span>Cập nhật:</span>
                        <span className="font-medium text-slate-500">
                          {formatDateTimeVN(doc.updatedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      {isActive ? (
                        <button
                          type="button"
                          onClick={closeLibrary}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
                        >
                          Tiếp tục sửa
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openDocument(doc.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs cursor-pointer transition-colors shadow-xs"
                        >
                          Mở
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setDocToRename(doc)}
                        title="Đổi tên thời khóa biểu"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-sky-700 hover:bg-sky-50 transition-colors cursor-pointer"
                        aria-label="Đổi tên thời khóa biểu"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => duplicateDocument(doc.id)}
                        title="Tạo bản sao thời khóa biểu này"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-sky-700 hover:bg-sky-50 transition-colors cursor-pointer"
                        aria-label="Tạo bản sao thời khóa biểu"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDocToDelete(doc)}
                        title="Xóa vĩnh viễn thời khóa biểu này"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        aria-label="Xóa thời khóa biểu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer with Storage / Privacy Notice & Data Management button */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-[11px] text-slate-500">
          <div className="flex items-start sm:items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5 sm:mt-0" />
            <p>
              Dữ liệu được lưu an toàn trên trình duyệt của thiết bị này.
            </p>
          </div>
          <button
            type="button"
            id="btn-library-open-backup"
            onClick={() => {
              closeLibrary();
              openDataManagement();
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-sky-300 text-sky-700 hover:text-sky-800 font-semibold cursor-pointer shadow-2xs transition-colors shrink-0"
          >
            <Database className="w-3 h-3 text-sky-600" />
            <span>Sao lưu & Quản lý dữ liệu</span>
          </button>
        </div>
      </div>

      {/* Rename Dialog */}
      {docToRename && (
        <RenameDialog
          isOpen={Boolean(docToRename)}
          initialName={docToRename.name}
          onSave={(newName) => {
            renameDocument(docToRename.id, newName);
            setDocToRename(null);
          }}
          onCancel={() => setDocToRename(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {docToDelete && (
        <DeleteConfirmDialog
          isOpen={Boolean(docToDelete)}
          documentName={docToDelete.name}
          onConfirm={() => {
            deleteDocument(docToDelete.id);
            setDocToDelete(null);
          }}
          onCancel={() => setDocToDelete(null)}
        />
      )}
    </div>
  );
};
