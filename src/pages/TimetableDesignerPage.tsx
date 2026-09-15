import React from 'react';
import { SetupPanel } from '../components/SetupPanel/SetupPanel';
import { SubjectManager } from '../components/SubjectManager/SubjectManager';
import { SubjectPicker } from '../components/SubjectPicker/SubjectPicker';
import { TimetableGrid } from '../components/TimetableGrid/TimetableGrid';
import { PrintToolbar } from '../components/PrintToolbar/PrintToolbar';
import { EditorToolbar } from '../components/EditorToolbar/EditorToolbar';
import { A4PreviewModal } from '../components/A4Preview/A4PreviewModal';
import { AIImageImportModal } from '../components/AIImageImport/AIImageImportModal';
import { PrintableTimetable } from '../components/PrintableTimetable/PrintableTimetable';
import { useTimetable } from '../context/TimetableContext';
import { usePrintSettings } from '../context/PrintSettingsContext';

export const TimetableDesignerPage: React.FC = () => {
  const { state, theme } = useTimetable();
  const { settings, isPreviewOpen } = usePrintSettings();

  return (
    <div
      id="timetable-designer-page"
      className="flex-1 flex flex-col lg:flex-row items-start gap-6 w-full"
    >
      {/* Left Column: Setup Panel */}
      <SetupPanel />

      {/* Right Column: Preview & Interactive Timetable Grid */}
      <section
        id="timetable-preview-area"
        aria-label="Khu vực thời khóa biểu"
        className="flex-1 w-full min-w-0"
      >
        {/* Entry Point / Print Toolbar */}
        <PrintToolbar />

        {/* Editor Toolbar (Undo/Redo, Stats, Shortcuts, Status) */}
        {state.isGenerated && <EditorToolbar />}

        {/* Primary Interactive Timetable */}
        <TimetableGrid />
      </section>

      {/* Interactive Subject Picker Popover/Modal */}
      <SubjectPicker />

      {/* Subject Manager & Color Customizer Drawer/Modal */}
      <SubjectManager />

      {/* A4 Preview & Print Modal */}
      <A4PreviewModal />

      {/* AI Image Import Modal */}
      <AIImageImportModal />

      {/* Single Print Source of Truth: rendered cleanly for @media print whenever timetable is generated */}
      {state.isGenerated && (
        <div id="print-sheet-mount" className="hidden print:block w-full">
          <PrintableTimetable
            state={state}
            theme={theme}
            printSettings={settings}
            id="printable-timetable-sheet"
          />
        </div>
      )}
    </div>
  );
};
