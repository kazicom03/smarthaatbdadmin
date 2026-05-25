import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  text: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

interface ToastItemProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className="pointer-events-auto bg-white border border-slate-100 rounded-xl shadow-lg p-4 flex items-start gap-3 w-full"
    >
      {toast.type === "success" && (
        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
      )}
      {toast.type === "error" && (
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
      )}
      {toast.type === "info" && (
        <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
      )}
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-800">{toast.text}</p>
      </div>
      <button
        type="button"
        onClick={() => onClose(toast.id)}
        className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

export const Toast: React.FC<ToastProps> = ({ toasts, onClose }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none no-print">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>
  );
};
