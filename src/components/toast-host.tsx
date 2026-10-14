"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

interface ToastOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
}

const ToastContext = createContext<(toast: ToastOptions) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastHost({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((next: ToastOptions) => {
    clearTimeout(timer.current);
    setToast(next);
    timer.current = setTimeout(() => setToast(null), 8000);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div className="toast">
            <span>{toast.message}</span>
            {toast.actionLabel && (
              <button
                onClick={async () => {
                  setToast(null);
                  await toast.onAction?.();
                }}
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}