/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppShell } from './components/AppShell/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { ToastProvider } from './context/ToastContext';
import { TimetableProvider } from './context/TimetableContext';
import { PrintSettingsProvider } from './context/PrintSettingsContext';
import { DocumentLibraryProvider } from './context/DocumentLibraryContext';
import { GeminiCredentialProvider } from './context/GeminiCredentialContext';
import { AIImageImportProvider } from './context/AIImageImportContext';
import { TimetableDesignerPage } from './pages/TimetableDesignerPage';

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <TimetableProvider>
          <PrintSettingsProvider>
            <DocumentLibraryProvider>
              <GeminiCredentialProvider>
                <AIImageImportProvider>
                  <AppShell>
                    <TimetableDesignerPage />
                  </AppShell>
                </AIImageImportProvider>
              </GeminiCredentialProvider>
            </DocumentLibraryProvider>
          </PrintSettingsProvider>
        </TimetableProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

