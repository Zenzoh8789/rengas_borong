import { CheckCircle2,X,XCircle } from "lucide-react";
import { useEffect } from "react";
import type { ToastState } from "../types";


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
