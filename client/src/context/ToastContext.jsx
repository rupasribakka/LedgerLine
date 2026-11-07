import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(({ message, type = 'info', title, duration = 4500 }) => {
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
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isSuccess = toast.type === 'success';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl p-4 shadow-2xl backdrop-blur-xl border transition-all duration-200 animate-in slide-in-from-bottom-2 ${
                isError
                  ? 'bg-[#150a0d] border-[rgba(255,93,122,0.35)] text-[#ff5d7a]'
                  : isSuccess
                  ? 'bg-[#06150e] border-[rgba(45,255,154,0.3)] text-[#2dff9a]'
                  : 'bg-[#07110d] border-[rgba(60,255,160,0.18)] text-[#eafff5]'
              }`}
            >
              {isError ? (
                <AlertCircle className="h-5 w-5 shrink-0 text-[#ff5d7a] mt-0.5" />
              ) : isSuccess ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[#2dff9a] mt-0.5" />
              ) : (
                <Info className="h-5 w-5 shrink-0 text-[#7ea594] mt-0.5" />
              )}

              <div className="flex-1 text-xs">
                {toast.title && <h4 className="font-bold mb-0.5 text-[#eafff5]">{toast.title}</h4>}
                <p className="text-slate-200 leading-relaxed">{toast.message}</p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-[#7ea594] hover:text-[#eafff5] p-1 rounded-lg transition-colors cursor-pointer"
                aria-label="Dismiss toast"
              >
                <X className="h-4 w-4" />
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
