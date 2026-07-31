import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Box, CheckCircle2, Cloud, Download, Eye, FileText, Image as ImageIcon, LogOut, PackagePlus, Palette, Pencil, Plus, RefreshCw, Save, Search, ShieldCheck, Trash2, Upload, Users, X, XCircle } from "lucide-react";
import { API, request } from "../api/client";
import type { Category, Customer, Product, Role, ToastState } from "../types";
import { Modal } from "./Modal";

export function Design({
  close,
  setToast,
}: {
  close: () => void;
  setToast: (t: ToastState) => void;
}) {
  const [design, setDesign] = useState<any>({
    topBannerUrl: "",
    productPhotoUrl: "",
  });
  const [uploadingKey, setUploadingKey] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    request("/design-settings")
      .then(setDesign)
      .catch(() => {});
  }, []);
  async function upload(key: string, file?: File) {
    if (!file) return;
    const data = new FormData();
    data.append("image", file);
    setUploadingKey(key);
    try {
      const response = await fetch(API + "/uploads/image", {
        method: "POST",
        credentials: "include",
        body: data,
      });
      if (!response.ok) throw new Error();
      const result = await response.json();
      setDesign((v: any) => ({ ...v, [key]: result.imageUrl }));
      setToast({ type: "success", message: "Design image uploaded" });
    } catch {
      setToast({ type: "error", message: "Design image upload failed" });
    } finally {
      setUploadingKey("");
    }
  }
  async function saveDesign() {
    setSaving(true);
    try {
      await request("/design-settings", {
        method: "PATCH",
        body: JSON.stringify(design),
      });
      setToast({ type: "success", message: "Design saved successfully" });
      close();
    } catch {
      setToast({ type: "error", message: "Design could not be saved" });
    } finally {
      setSaving(false);
    }
  }
  const fields = [
    [
      "topBannerUrl",
      "Top Background / Banner Image",
      "A4 Top Half (1240 × 700 px)",
    ],
    [
      "productPhotoUrl",
      "Stock / Product Photo",
      "A4 Middle Fit (1240 × 760 px)",
    ],
  ];
  return (
    <Modal
      title="Design CMS"
      subtitle="PDF front page images. End page uses the top banner automatically."
      onClose={close}
    >
      <div className="modal-body design-body">
        <div className="design-title">
          <h3>Front Page Design</h3>
          <button
            onClick={() =>
              setDesign({
                ...design,
                topBannerUrl: "",
                productPhotoUrl: "",
              })
            }
          >
            Remove Front Images
          </button>
        </div>
        {fields.map(([key, label, size]) => (
          <section className="design-upload" key={key}>
            <div className="design-upload-info">
              <b>{label}</b>
              <small>Recommended: {size}</small>
              <strong className={design[key] ? "uploaded" : ""}>
                {design[key] ? "Uploaded ✓" : "No image uploaded"}
              </strong>
            </div>
            <div className="design-upload-actions">
              <label className="primary">
                {uploadingKey === key ? (
                  <RefreshCw className="spin" />
                ) : (
                  <Upload />
                )}
                {uploadingKey === key
                  ? "Uploading..."
                  : design[key]
                    ? "Change"
                    : "Upload"}
                <input
                  hidden
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={Boolean(uploadingKey)}
                  onChange={(e) => {
                    upload(key, e.target.files?.[0]);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              {design[key] && (
                <button
                  type="button"
                  className="design-remove"
                  onClick={() =>
                    setDesign((current: any) => ({
                      ...current,
                      [key]: "",
                    }))
                  }
                >
                  Remove
                </button>
              )}
            </div>
          </section>
        ))}
      </div>
      <footer>
        <button onClick={close}>Cancel</button>
        <button
          className="primary design-save"
          disabled={saving || Boolean(uploadingKey)}
          onClick={saveDesign}
        >
          {saving ? <RefreshCw className="spin" /> : <Save />}
          {saving ? "Saving..." : "Save Design"}
        </button>
      </footer>
    </Modal>
  );
}
