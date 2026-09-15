import React, { useState, useRef, useEffect } from 'react';
import { Palette, FolderOpen, Plus, Edit3, X, AlertCircle, Database } from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';
import { useDocumentLibrary } from '../../context/DocumentLibraryContext';
import { SaveStatusIndicator } from '../SaveStatus/SaveStatusIndicator';
import { SavedTimetableManagerModal } from '../SavedTimetableManager/SavedTimetableManagerModal';
import { RenameDialog } from '../SavedTimetableManager/RenameDialog';
import { DataManagementModal } from '../DataManagement/DataManagementModal';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { theme } = useTimetable();
  const {
    currentDocument,
    currentDocumentName,
    currentDocumentId,
    documents,
    openLibrary,
    createNewDocument,
    renameDocument,
    isDataManagementOpen,
    openDataManagement,
    closeDataManagement,
    toastMessage,
    dismissToast,
  } = useDocumentLibrary();

  const [isHeaderRenameOpen, setIsHeaderRenameOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Dynamically keep --app-header-height in sync with the real runtime header height
  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.offsetHeight;
        if (height > 0) {
          document.documentElement.style.setProperty('--app-header-height', `${height}px`);
        }
      }
    };

    updateHeaderHeight();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && headerRef.current) {
      resizeObserver = new ResizeObserver(updateHeaderHeight);
      resizeObserver.observe(headerRef.current);
    }

    window.addEventListener('resize', updateHeaderHeight);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', updateHeaderHeight);
    };
  }, []);

  return (
    <div
      id="app-shell"
      data-theme={theme.id}
      className={`min-h-screen ${theme.tokens.pageBackground} text-slate-800 flex flex-col font-sans transition-colors duration-200 selection:bg-sky-100 selection:text-sky-900`}
    >
      {/* App Header */}
      <header
        id="app-header"
        ref={headerRef}
        className="bg-white/95 backdrop-blur-xs border-b border-slate-200 sticky top-0 z-30 shadow-xs no-print"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[64px] py-2 flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Theme */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              TKB
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-sky-900 tracking-tight">
                  TKB Online Designer
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-sky-600 border border-sky-200/80">
                  <Palette className="w-3 h-3" />
                  {theme.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">
                Thiết kế và in ấn thời khóa biểu học sinh chuyên nghiệp
              </p>
            </div>
          </div>

          {/* Center/Right Toolbar: Current Doc Name, Save Status, Library, Data Mgmt & New Doc */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-3">
            {/* Current Document Name pill (clickable to rename) */}
            <button
              type="button"
              id="header-current-doc-btn"
              onClick={() => setIsHeaderRenameOpen(true)}
              title="Nhấn để đổi tên bản lưu này"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/90 hover:bg-slate-200/70 border border-slate-200 text-xs text-slate-700 transition-colors cursor-pointer group"
            >
              <span className="font-semibold text-slate-900 truncate max-w-[130px] sm:max-w-[180px]">
                {currentDocumentName}
              </span>
              <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-sky-600 transition-colors shrink-0" />
            </button>

            {/* Autosave Status Indicator */}
            <SaveStatusIndicator />

            {/* "TKB của tôi" Button */}
            <button
              type="button"
              id="btn-my-timetables"
              onClick={openLibrary}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-sky-600" />
              <span>TKB của tôi</span>
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                {documents.length}
              </span>
            </button>

            {/* "Dữ liệu" Button */}
            <button
              type="button"
              id="btn-data-management"
              onClick={openDataManagement}
              title="Sao lưu, khôi phục hoặc quản lý dữ liệu"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-sky-600" />
              <span>Dữ liệu</span>
            </button>

            {/* "TKB mới" Quick Action Button */}
            <button
              type="button"
              id="btn-new-timetable"
              onClick={createNewDocument}
              title="Tạo thời khóa biểu mới sạch sẽ"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">TKB mới</span>
            </button>
          </div>
        </div>
      </header>

      {/* Global Persistence Toast / Warning (e.g. corrupted storage fallback or storage quota error) */}
      {toastMessage && (
        <div
          id="persistence-toast"
          role="alert"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 w-full no-print"
        >
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-amber-800 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={dismissToast}
              className="text-amber-600 hover:text-amber-800 p-1 rounded-md cursor-pointer"
              aria-label="Đóng thông báo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
        {children}
      </main>

      {/* Saved Timetables Manager Modal */}
      <SavedTimetableManagerModal />

      {/* Data Management Modal (Export, Import, Reset) */}
      <DataManagementModal
        isOpen={isDataManagementOpen}
        onClose={closeDataManagement}
      />

      {/* Rename Current Document Dialog */}
      {isHeaderRenameOpen && currentDocumentId && (
        <RenameDialog
          isOpen={isHeaderRenameOpen}
          initialName={currentDocumentName}
          onSave={(newName) => {
            renameDocument(currentDocumentId, newName);
            setIsHeaderRenameOpen(false);
          }}
          onCancel={() => setIsHeaderRenameOpen(false)}
        />
      )}
    </div>
  );
};
