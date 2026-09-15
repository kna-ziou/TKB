import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';
import { CheckCircle2, Info, AlertTriangle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2400);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Render Mount */}
      <div
        id="app-toast-container"
        aria-live="polite"
        className="fixed bottom-5 right-5 z-[300] flex flex-col gap-2 pointer-events-none no-print max-w-sm w-full px-4"
      >
        {toasts.map((t) => {
          let bg = 'bg-slate-900 text-white border-slate-700';
          let Icon = Info;
          if (t.type === 'success') {
            bg = 'bg-emerald-900/95 text-emerald-100 border-emerald-700';
            Icon = CheckCircle2;
          } else if (t.type === 'warning') {
            bg = 'bg-amber-900/95 text-amber-100 border-amber-700';
            Icon = AlertTriangle;
          } else if (t.type === 'error') {
            bg = 'bg-rose-900/95 text-rose-100 border-rose-700';
            Icon = AlertCircle;
          }

          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl border shadow-lg text-xs font-medium backdrop-blur-xs animate-in fade-in slide-in-from-bottom-2 duration-150 ${bg}`}
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{t.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="opacity-70 hover:opacity-100 p-0.5 rounded cursor-pointer shrink-0"
                aria-label="Đóng thông báo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback if rendered outside provider
    return {
      showToast: (msg: string) => console.log(msg),
    };
  }
  return ctx;
}
