import React, { useEffect } from 'react';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi';

export interface ToastMessage {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  toast,
  onDismiss,
  duration = 4000,
}) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, onDismiss, duration]);

  if (!toast) return null;

  const bgStyles = {
    error: 'bg-slate-900 text-white border-slate-700 shadow-slate-900/20',
    warning: 'bg-amber-950 text-amber-100 border-amber-800 shadow-amber-950/20',
    success: 'bg-emerald-950 text-emerald-100 border-emerald-800 shadow-emerald-950/20',
    info: 'bg-slate-900 text-white border-slate-700 shadow-slate-900/20',
  }[toast.type];

  const iconStyles = {
    error: <FiAlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
    warning: <FiAlertCircle className="w-4 h-4 text-amber-400 shrink-0" />,
    success: <FiCheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />,
    info: <FiInfo className="w-4 h-4 text-indigo-400 shrink-0" />,
  }[toast.type];

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 max-w-sm w-full transition-all duration-200"
    >
      <div
        className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-xl border text-xs font-medium backdrop-blur-sm ${bgStyles}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {iconStyles}
          <p className="leading-snug break-words">{toast.message}</p>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          aria-label="Dismiss notification"
        >
          <FiX className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
