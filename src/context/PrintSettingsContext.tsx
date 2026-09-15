import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  DEFAULT_PRINT_SETTINGS,
  PageOrientation,
  PrintSettings,
} from '../types/print';
import { injectPrintPageStyle } from '../utils/printUtils';

interface PrintSettingsContextValue {
  settings: PrintSettings;
  updateSettings: (partial: Partial<PrintSettings>) => void;
  setOrientation: (orientation: PageOrientation) => void;
  toggleField: (field: keyof PrintSettings) => void;
  loadSettings: (settings: PrintSettings) => void;
  resetSettings: () => void;
  isPreviewOpen: boolean;
  openPreview: () => void;
  closePreview: () => void;
  triggerPrint: () => void;
}

const PrintSettingsContext = createContext<PrintSettingsContextValue | undefined>(
  undefined
);

export const PrintSettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<PrintSettings>(DEFAULT_PRINT_SETTINGS);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  // Synchronize CSS @page rule whenever orientation changes
  useEffect(() => {
    injectPrintPageStyle(settings.orientation);
  }, [settings.orientation]);

  const updateSettings = useCallback((partial: Partial<PrintSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const setOrientation = useCallback((orientation: PageOrientation) => {
    setSettings((prev) => ({ ...prev, orientation }));
  }, []);

  const toggleField = useCallback((field: keyof PrintSettings) => {
    setSettings((prev) => {
      const currentVal = prev[field];
      if (typeof currentVal === 'boolean') {
        return { ...prev, [field]: !currentVal };
      }
      return prev;
    });
  }, []);

  const loadSettings = useCallback((newSettings: PrintSettings) => {
    setSettings(newSettings);
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_PRINT_SETTINGS);
  }, []);

  const openPreview = useCallback(() => {
    setIsPreviewOpen(true);
  }, []);

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
  }, []);

  const triggerPrint = useCallback(() => {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  }, []);

  const value: PrintSettingsContextValue = {
    settings,
    updateSettings,
    setOrientation,
    toggleField,
    loadSettings,
    resetSettings,
    isPreviewOpen,
    openPreview,
    closePreview,
    triggerPrint,
  };

  return (
    <PrintSettingsContext.Provider value={value}>
      {children}
    </PrintSettingsContext.Provider>
  );
};

export function usePrintSettings(): PrintSettingsContextValue {
  const context = useContext(PrintSettingsContext);
  if (!context) {
    throw new Error(
      'usePrintSettings must be used within a PrintSettingsProvider'
    );
  }
  return context;
}
