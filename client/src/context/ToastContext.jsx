import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(({ message, type = 'info', title, duration = 4000 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type, title }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast Render Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isSuccess = toast.type === 'success';

          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-start gap-3 rounded-xl p-3.5 shadow-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] transition-all duration-150"
            >
              {isError ? (
                <AlertCircle className="h-4 w-4 shrink-0 text-[var(--status-error)] mt-0.5" />
              ) : isSuccess ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--status-success)] mt-0.5" />
              ) : (
                <Info className="h-4 w-4 shrink-0 text-[var(--accent-primary)] mt-0.5" />
              )}

              <div className="flex-1 text-xs">
                {toast.title && (
                  <h4 className="font-semibold mb-0.5 text-[var(--text-primary)]">
                    {toast.title}
                  </h4>
                )}
                <p className="text-[var(--text-secondary)] leading-relaxed">{toast.message}</p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md transition-colors cursor-pointer"
                aria-label="Dismiss toast"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
