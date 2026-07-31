import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Box, CheckCircle2, Cloud, Download, Eye, FileText, Image as ImageIcon, LogOut, PackagePlus, Palette, Pencil, Plus, RefreshCw, Save, Search, ShieldCheck, Trash2, Upload, Users, X, XCircle } from "lucide-react";
import { API, request } from "../api/client";
import type { Category, Customer, Product, Role, ToastState } from "../types";
import { Modal } from "./Modal";
import { BulkUpload } from "./BulkUpload";
import { CategoryManager } from "./CategoryManager";

export function ProductModal({
  categories,
  close,
  onChanged,
  setToast,
}: {
  categories: Category[];
  close: () => void;
  onChanged: () => void;
  setToast: (t: ToastState) => void;
}) {
  const [form, setForm] = useState({
    code: "",
    description: "",
    categoryId: "",
    uom: "PKT",
    price: "",
    imageUrl: "",
  });
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  async function chooseImage(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setToast({ type: "error", message: "Use a JPG, PNG or WEBP image" });
      return;
    }
    setPreview(URL.createObjectURL(file));
    const data = new FormData();
    data.append("image", file);
    try {
      const r = await fetch(API + "/uploads/image", {
        method: "POST",
        credentials: "include",
        body: data,
      });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setForm((v) => ({ ...v, imageUrl: d.imageUrl }));
      setToast({ type: "success", message: "Product image uploaded" });
    } catch {
      setToast({ type: "error", message: "Image upload failed" });
    }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form.categoryId) {
      setToast({ type: "error", message: "Please select a category" });
      return;
    }
    setSaving(true);
    try {
      await request("/products", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setToast({ type: "success", message: "Product saved successfully" });
      onChanged();
      close();
    } catch {
      setToast({ type: "error", message: "Product could not be saved" });
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      title="Add Product / Category"
      
      onClose={close}
      wide
    >
      <div className="three-col">
        <form className="card-form product-form" onSubmit={save}>
          <h3>
            <Box />
            Product Details
          </h3>
          <div className="image-upload">
            <div className="preview">
              <img
                src={preview || "/logo.png"}
                alt={preview ? "Product preview" : "Default product logo"}
                className={!preview ? "default-preview-logo" : ""}
                onError={(e) => {
                  e.currentTarget.src = "/logo.png";
                  e.currentTarget.classList.add("default-preview-logo");
                }}
              />
            </div>
            <div>
              <b>Product Image</b>
              <p>Optional. Product can be saved without image.</p>
              <input
                ref={fileRef}
                hidden
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => chooseImage(e.target.files?.[0])}
              />
              <button
                type="button"
                className="primary"
                onClick={() => fileRef.current?.click()}
              >
                <Upload />
                Upload Image
              </button>
            </div>
          </div>
          <label>
            Code
            <input
              required
              placeholder="RG0001"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </label>
          <label>
            Description
            <input
              required
              value={form.description}
              placeholder="Enter product description"
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          <label>
            Category
            <select
              required
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            UOM
            <select
              value={form.uom}
              onChange={(e) => setForm({ ...form, uom: e.target.value })}
            >
              {[
                "PKT",
                "BOTTLE",
                "PCS",
                "BOX",
                "CTN",
                "KG",
                "GM",
                "ML",
                "LTR",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Price
            <input
              required
              min="0"
              step=".01"
              type="number"
              placeholder="RM 0.00"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </label>
          <button className="primary save-product" disabled={saving}>
            <Save />
            {saving ? "Saving..." : "Save Product"}
          </button>
        </form>
        <BulkUpload
          setToast={setToast}
          onChanged={() => {
            onChanged();
            close();
          }}
        />
        <CategoryManager
          initial={categories}
          changed={onChanged}
          setToast={setToast}
        />
      </div>
    </Modal>
  );
}
