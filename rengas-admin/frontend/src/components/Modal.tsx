import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Box, CheckCircle2, Cloud, Download, Eye, FileText, Image as ImageIcon, LogOut, PackagePlus, Palette, Pencil, Plus, RefreshCw, Save, Search, ShieldCheck, Trash2, Upload, Users, X, XCircle } from "lucide-react";
import { API, request } from "../api/client";
import type { Category, Customer, Product, Role, ToastState } from "../types";


export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: any;
  wide?: boolean;
}) {
  useEffect(() => {
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
    };
  }, []);
  return (
    <div
      className="backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
