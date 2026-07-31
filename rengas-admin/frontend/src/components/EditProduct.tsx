import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Box, CheckCircle2, Cloud, Download, Eye, FileText, Image as ImageIcon, LogOut, PackagePlus, Palette, Pencil, Plus, RefreshCw, Save, Search, ShieldCheck, Trash2, Upload, Users, X, XCircle } from "lucide-react";
import { API, request } from "../api/client";
import type { Category, Customer, Product, Role, ToastState } from "../types";
import { Modal } from "./Modal";

export function EditProduct({
  product,
  close,
  onSaved,
  setToast,
}: {
  product: Product;
  close: () => void;
  onSaved: () => void;
  setToast: (toast: ToastState) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(product.imageUrl || "");
  const [form, setForm] = useState({
    code: product.code || "",
    description: product.description || "",
    categoryId: String(product.category?.id || ""),
    uom: product.uom || "PKT",
    price: String(product.price || 0),
    imageUrl: product.imageUrl || "",
  });

  useEffect(() => {
    request("/categories")
      .then(setCategories)
      .catch(() =>
        setToast({
          type: "error",
          message: "Categories could not be loaded",
        }),
      );
  }, [setToast]);

  async function chooseImage(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setToast({ type: "error", message: "Use a JPG, PNG or WEBP image" });
      return;
    }

    const temporaryPreview = URL.createObjectURL(file);
    setPreview(temporaryPreview);
    const data = new FormData();
    data.append("image", file);

    try {
      const response = await fetch(API + "/uploads/image", {
        method: "POST",
        credentials: "include",
        body: data,
      });
      if (!response.ok) throw new Error();
      const result = await response.json();
      setForm((current) => ({ ...current, imageUrl: result.imageUrl }));
      setToast({ type: "success", message: "Product image uploaded" });
    } catch {
      setPreview(product.imageUrl || "");
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
      await request(`/products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          code: form.code.trim(),
          description: form.description.trim(),
          categoryId: Number(form.categoryId),
          uom: form.uom,
          price: Number(form.price),
          imageUrl: form.imageUrl || null,
        }),
      });
      setToast({ type: "success", message: "Product updated successfully" });
      onSaved();
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error
            ? `Product could not be updated: ${error.message}`
            : "Product could not be updated",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Edit Product"
      subtitle="Edit product with image upload"
      onClose={close}
    >
      <form onSubmit={save}>
        <div className="edit-product">
          <section className="edit-product-image-card">
            <div className="edit-product-image">
              {preview ? (
                <img
                  src={preview}
                  alt="Product preview"
                  onError={() => setPreview("")}
                />
              ) : (
                <div className="no-image-layer">
                  <img src="/logo.png" alt="" aria-hidden="true" />
                  <span>No image uploaded</span>
                </div>
              )}
            </div>
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
              className="primary upload-edit-image"
              onClick={() => fileRef.current?.click()}
            >
              <Upload />
              Upload Image
            </button>
          </section>

          <div className="edit-product-fields">
            <label>
              <span>Code</span>
              <input
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </label>
            <label>
              <span>Description</span>
              <input
                required
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>
            <label>
              <span>Category</span>
              <select
                required
                value={form.categoryId}
                onChange={(e) =>
                  setForm({ ...form, categoryId: e.target.value })
                }
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>UOM</span>
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
                ].map((uom) => (
                  <option key={uom}>{uom}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Price</span>
              <input
                required
                min="0"
                step=".01"
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </label>
          </div>
        </div>

        <footer className="edit-product-footer">
          <button type="button" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={saving}>
            <Save />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

