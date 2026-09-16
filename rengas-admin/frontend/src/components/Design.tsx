import { RefreshCw,Save,Upload } from "lucide-react";
import { useEffect,useState } from "react";
import { API,request } from "../api/client";
import { designImages, type DesignImages } from "../api/design-settings";
import type { ToastState } from "../types";
import { Modal } from "./Modal";

export function Design({
  close,
  setToast,
}: {
  close: () => void;
  setToast: (t: ToastState) => void;
}) {
  const [design, setDesign] = useState<DesignImages>({
    topBannerUrl: "",
    productPhotoUrl: "",
  });
  const [uploadingKey, setUploadingKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    let active = true;
    request("/design-settings")
      .then((value) => { if (active) setDesign(designImages(value)); })
      .catch(() => { if (active) setLoadError("Could not load design. Close and reopen to retry."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function upload(key: keyof DesignImages, file?: File) {
    if (!file || loading || loadError || saving || uploadingKey) return;
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
      setDesign((v) => ({ ...v, [key]: result.imageUrl }));
      setToast({ type: "success", message: "Design image uploaded" });
    } catch {
      setToast({ type: "error", message: "Design image upload failed" });
    } finally {
      setUploadingKey("");
    }
  }
  async function saveDesign() {
    if (loading || loadError || saving || uploadingKey) return;
    setSaving(true);
    try {
      await request("/design-settings", {
        method: "PATCH",
        body: JSON.stringify(designImages(design)),
      });
      setToast({ type: "success", message: "Design saved successfully" });
      close();
    } catch {
      setToast({ type: "error", message: "Design could not be saved" });
    } finally {
      setSaving(false);
    }
  }
  const fields: [keyof DesignImages, string, string][] = [
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
      onClose={close}
    >
      <div className="modal-body design-body">
        <div className="design-title">
        <div>
           <h3>Front Page Design</h3>
           <p>Changes take effect when you click Save Design.</p>
        </div>
          <button
            type="button"
            disabled={loading || Boolean(loadError) || saving || Boolean(uploadingKey)}
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
        {loading && <p role="status">Loading saved design...</p>}
        {loadError && <p role="alert">{loadError}</p>}
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
                  disabled={loading || Boolean(loadError) || saving || Boolean(uploadingKey)}
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
                  disabled={loading || Boolean(loadError) || saving || Boolean(uploadingKey)}
                  onClick={() =>
                    setDesign((current) => ({
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
          disabled={loading || Boolean(loadError) || saving || Boolean(uploadingKey)}
          onClick={saveDesign}
        >
          {saving ? <RefreshCw className="spin" /> : <Save />}
          {saving ? "Saving..." : "Save Design"}
        </button>
      </footer>
    </Modal>
  );
}


