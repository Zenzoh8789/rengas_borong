import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Box, CheckCircle2, Cloud, Download, Eye, FileText, Image as ImageIcon, LogOut, PackagePlus, Palette, Pencil, Plus, RefreshCw, Save, Search, ShieldCheck, Trash2, Upload, Users, X, XCircle } from "lucide-react";
import { API, request } from "../api/client";
import type { Category, Customer, Product, Role, ToastState } from "../types";


export function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(onClose, 3500);
    return () => clearTimeout(id);
  }, [toast, onClose]);
  if (!toast) return null;
  return (
    <div className={`toast ${toast.type}`} role="status">
      {toast.type === "success" ? <CheckCircle2 /> : <XCircle />}
      <span>{toast.message}</span>
      <button onClick={onClose}>
        <X />
      </button>
    </div>
  );
}
