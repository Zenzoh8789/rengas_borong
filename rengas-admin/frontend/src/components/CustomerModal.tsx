import { ChangeEvent, DragEvent, FormEvent, useRef, useState } from "react";
import { Save, Trash2, Upload, Users } from "lucide-react";
import { API, request } from "../api/client";
import type { ToastState } from "../types";
import { Modal } from "./Modal";

export function CustomerModal({ close, setToast }: { close: () => void; setToast: (t: ToastState) => void }) {
  const [form, setForm] = useState({ name: "", address: "", tinNumber: "", phoneNumber: "", whatsappNumber: "" });
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const data = new FormData(); data.append("file", file);
      const response = await fetch(API + "/customers/bulk-upload", { method: "POST", credentials: "include", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setToast({ type: "success", message: `${result.imported} customers imported` }); close();
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Customer upload failed" });
    } finally { setBusy(false); }
  }

  async function saveCustomer(event: FormEvent) {
    event.preventDefault();
    try {
      await request("/customers", { method: "POST", body: JSON.stringify(form) });
      setToast({ type: "success", message: "Customer saved successfully" }); close();
    } catch { setToast({ type: "error", message: "Customer could not be saved" }); }
  }

  async function deleteAll() {
    if (!confirm("Delete all customers? This requires all related orders to be removed first.")) return;
    try {
      await request("/customers/all", { method: "DELETE" });
      setToast({ type: "success", message: "All customers deleted" }); close();
    } catch { setToast({ type: "error", message: "Customers with existing orders cannot be deleted" }); }
  }

  const fields = [["name", "Name", "Customer name"], ["address", "Address", "Customer address"], ["tinNumber", "TIN Number", "TIN number"], ["phoneNumber", "Phone Number", "Phone number"], ["whatsappNumber", "WhatsApp Number", "WhatsApp number"]] as const;
  return <Modal title="Add Customer / Bulk Upload" subtitle="Add customer manually or upload customer list in bulk." onClose={close} wide>
    <div className="customer-modal-body">
      <form className="customer-add-card" onSubmit={saveCustomer}>
        <h2><Users />Add Customer</h2>
        {fields.map(([key, label, placeholder]) => <label key={key}><span>{label}</span><input required={key === "name"} value={form[key]} placeholder={placeholder} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>)}
        <button className="primary"><Save />Save Customer</button>
      </form>
      <section className="customer-bulk-card">
        <h2><Upload />Bulk Upload</h2>
        <input ref={fileRef} hidden type="file" accept=".csv,.xlsx" onChange={(e: ChangeEvent<HTMLInputElement>) => upload(e.target.files?.[0])} />
        <button className="customer-drop" disabled={busy} onClick={() => fileRef.current?.click()} onDragOver={(e: DragEvent) => e.preventDefault()} onDrop={(e: DragEvent) => { e.preventDefault(); upload(e.dataTransfer.files[0]); }}>
          <Upload /><b>{busy ? "Uploading..." : "Drag & Drop Customer CSV / Excel"}</b><span>Click here or drop customer file to upload in bulk.</span><small>Format: Name, Address, TIN Number, Phone Number, WhatsApp Number</small>
        </button>
        <button className="delete-all-customers" onClick={deleteAll}><Trash2 />Delete All Customers</button>
      </section>
    </div>
  </Modal>;
}
