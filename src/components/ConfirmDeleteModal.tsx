"use client";

import React from "react";
import { AlertTriangle, X, Loader2 } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteModal({
  isOpen,
  title,
  description,
  confirmLabel = "Delete",
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-sm bg-background border border-border rounded-sm shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-foreground/[0.01] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-error" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/90">
              {title}
            </h2>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="p-1 hover:bg-foreground/5 rounded-sm transition-colors text-foreground/40 hover:text-foreground/80 cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-[10px] font-bold text-foreground/60 uppercase tracking-widest leading-relaxed">
            {description}
          </p>
        </div>

        <div className="px-6 py-4 border-t border-border bg-foreground/[0.01] flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 border border-border rounded-sm text-[9px] font-black uppercase tracking-widest text-foreground/40 hover:text-foreground/80 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 bg-error text-white rounded-sm text-[9px] font-black uppercase tracking-widest hover:bg-error/90 transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {loading ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
