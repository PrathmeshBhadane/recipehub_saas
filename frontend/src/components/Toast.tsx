import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

// Global Event Dispatcher (Observer Pattern)
export const toast = {
  show(message: string, type: ToastType = "info") {
    const event = new CustomEvent("toast-message", {
      detail: { message, type }
    });
    window.dispatchEvent(event);
  },
  success(message: string) {
    this.show(message, "success");
  },
  error(message: string) {
    this.show(message, "error");
  },
  info(message: string) {
    this.show(message, "info");
  },
  warning(message: string) {
    this.show(message, "warning");
  }
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type: ToastType }>;
      const { message, type } = customEvent.detail;
      const newToast: ToastItem = {
        id: Date.now() + Math.random(),
        message,
        type
      };
      
      setToasts((prev) => [...prev, newToast]);

      // Auto dismiss after 3 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 4000);
    };

    window.addEventListener("toast-message", handleToastEvent);
    return () => window.removeEventListener("toast-message", handleToastEvent);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
      {toasts.map((t) => {
        let icon = <Info className="text-blue-400 w-5 h-5" />;
        let borderClass = "border-l-4 border-l-blue-500";
        if (t.type === "success") {
          icon = <CheckCircle className="text-emerald-400 w-5 h-5" />;
          borderClass = "border-l-4 border-l-emerald-500";
        } else if (t.type === "error") {
          icon = <XCircle className="text-rose-400 w-5 h-5" />;
          borderClass = "border-l-4 border-l-rose-500";
        } else if (t.type === "warning") {
          icon = <AlertCircle className="text-amber-400 w-5 h-5" />;
          borderClass = "border-l-4 border-l-amber-500";
        }

        return (
          <div
            key={t.id}
            className={`glass-panel p-4 flex gap-3 items-center justify-between shadow-2xl animate-slide-in ${borderClass}`}
            style={{ background: "var(--bg-secondary)", borderColor: "var(--border-color)" }}
          >
            <div className="flex gap-3 items-center">
              {icon}
              <span className="text-sm font-medium text-[var(--text-primary)]">{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
