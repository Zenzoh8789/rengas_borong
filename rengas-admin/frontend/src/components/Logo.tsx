import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Box, CheckCircle2, Cloud, Download, Eye, FileText, Image as ImageIcon, LogOut, PackagePlus, Palette, Pencil, Plus, RefreshCw, Save, Search, ShieldCheck, Trash2, Upload, Users, X, XCircle } from "lucide-react";
import { API, request } from "../api/client";
import type { Category, Customer, Product, Role, ToastState } from "../types";


export function Logo() {
  return (
    <div className="logo-wrap">
      <span className="logo-ring" />
      <img
        src="/logo.png"
        className="brand-logo"
        alt="Rengas Trading and Manufacturing"
      />
    </div>
  );
}
