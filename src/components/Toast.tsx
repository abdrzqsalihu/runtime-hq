"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  onClose: (id: string) => void;
}

export function Toast({ id, type, title, message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [id, onClose]);

  const bgColor =
    type === "success"
      ? "bg-success/5 border-success/20"
      : type === "error"
        ? "bg-error/5 border-error/20"
        : "bg-accent/5 border-accent/20";

  const textColor =
    type === "success"
      ? "text-success"
      : type === "error"
        ? "text-error"
        : "text-accent";

  const titleColor =
    type === "success"
      ? "text-success/80"
      : type === "error"
        ? "text-error/80"
        : "text-accent/80";

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={`animate-in fade-in slide-in-from-top-2 duration-300 p-4 border rounded-sm ${bgColor} flex items-start gap-3`}
    >
      <div className="flex-1 pt-0.5">
        <div className={`text-[9px] font-black uppercase tracking-widest ${titleColor} mb-1`}>
          [{type.toUpperCase()}] {title}
        </div>
        <div className={`text-[10px] font-bold uppercase tracking-tight ${textColor}/60`}>
          {message}
        </div>
      </div>
      <button
        onClick={() => onClose(id)}
        aria-label="Dismiss notification"
        className={`flex-shrink-0 ${textColor}/40 hover:${textColor}/70 transition-colors p-1`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
