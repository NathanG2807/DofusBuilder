"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import React, { useEffect } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Largeur max Tailwind (ex. "max-w-md"). */
  widthClassName?: string;
};

/** Modale "Atelier d'artisan" — remplace les portails ad hoc dupliqués par page. */
export function Modal({ open, onClose, title, children, className, widthClassName = "max-w-md" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className={cn("plaque w-full p-5", widthClassName, className)}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {title && (
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-[17px] font-medium text-[#f0d78c]">{title}</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md p-1 text-[#666] transition hover:bg-white/[0.06] hover:text-[#ccc]"
                  aria-label="Fermer"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
