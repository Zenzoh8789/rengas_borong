import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Box, CheckCircle2, Cloud, Download, Eye, FileText, Image as ImageIcon, LogOut, PackagePlus, Palette, Pencil, Plus, RefreshCw, Save, Search, ShieldCheck, Trash2, Upload, Users, X, XCircle } from "lucide-react";
import { API, request } from "../api/client";
import type { Category, Customer, Product, Role, ToastState } from "../types";
import { Modal } from "./Modal";

export function CustomerModal({
  close,
  setToast,
}: {
  close: () => void;
  setToast: (t: ToastState) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    address: "",
    tinNumber: "",
    phoneNumber: "",
    whatsappNumber: "",
  });
  return (
    <Modal
      title="Add Customer / Bulk Upload"
      subtitle="Add customer manually or upload customer list in bulk."
      onClose={close}
      wide
    >
      <div className="two modal-body">
        <form
          className="card-form"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await request("/customers", {
                method: "POST",
                body: JSON.stringify(form),
              });
              setToast({
                type: "success",
                message: "Customer saved successfully",
              });
              close();
            } catch {
              setToast({
                type: "error",
                message: "Customer could not be saved",
              });
            }
          }}
        >
          <h2>
            <Users />
            Add Customer
          </h2>
          {Object.entries(form).map(([k, v]) => (
            <label key={k}>
              {k.replace(/([A-Z])/g, " $1")}
              <input
                value={v}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              />
            </label>
          ))}
          <button className="primary">
            <Save />
            Save Customer
          </button>
        </form>
        <div className="card-form">
          <h2>
            <Upload />
            Bulk Upload
          </h2>
          <div className="drop">
            <Upload />
            <b>Drag & Drop Customer CSV / Excel</b>
            <small>
              Format: Name, Address, TIN Number, Phone Number, WhatsApp Number
            </small>
          </div>
        </div>
      </div>
    </Modal>
  );
}
