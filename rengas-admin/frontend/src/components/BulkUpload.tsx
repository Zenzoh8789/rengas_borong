import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Box, CheckCircle2, Cloud, Download, Eye, FileText, Image as ImageIcon, LogOut, PackagePlus, Palette, Pencil, Plus, RefreshCw, Save, Search, ShieldCheck, Trash2, Upload, Users, X, XCircle } from "lucide-react";
import { API, request } from "../api/client";
import type { Category, Customer, Product, Role, ToastState } from "../types";


export function BulkUpload({
  setToast,
  onChanged,
}: {
  setToast: (toast: ToastState) => void;
  onChanged?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [imagesZip, setImagesZip] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [removing, setRemoving] = useState(false);

  function uploadFile() {
    if (!file || uploading || uploaded) return;

    const data = new FormData();
    data.append("file", file);
    if (imagesZip) {
      data.append("images", imagesZip);
    }

    const xhr = new XMLHttpRequest();

    setUploading(true);
    setUploaded(false);
    setProgress(0);

    xhr.open("POST", API + "/products/bulk-upload");
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;

      const percentage = Math.round((event.loaded / event.total) * 100);

      setProgress(percentage);
    };

    xhr.onload = () => {
      setUploading(false);

      if (xhr.status >= 200 && xhr.status < 300) {
        setProgress(100);
        setUploaded(true);

        let result: any = {};

        try {
          result = JSON.parse(xhr.responseText);
        } catch {
          // Response body is optional.
        }

        const created = Number(result.created || 0);
        const updated = Number(result.updated || 0);
        const skipped = Number(result.skipped || 0);
        const firstError = result.errors?.[0];

        if (created + updated === 0) {
          setUploaded(false);
          setProgress(0);
          setToast({
            type: "error",
            message: `No products imported. ${skipped} rows were skipped. Check the Code column.`,
          });
          return;
        }

        setToast({
          type: "success",
          message:
            `${created} created, ${updated} updated, ${skipped} skipped` +
            (firstError
              ? `. Row ${firstError.row}: ${firstError.message}`
              : ""),
        });

        onChanged?.();
      } else {
        setProgress(0);
        setUploaded(false);

        setToast({
          type: "error",
          message: xhr.responseText || "Bulk upload failed",
        });
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      setUploaded(false);
      setProgress(0);

      setToast({
        type: "error",
        message: "Bulk upload failed. Check the server connection.",
      });
    };

    xhr.send(data);
  }

  async function removeAllProducts() {
    const confirmed = window.confirm(
      "Are you sure you want to remove all products? This action cannot be undone.",
    );

    if (!confirmed) return;

    setRemoving(true);

    try {
      await request("/products/all", {
        method: "DELETE",
      });

      setFile(null);
      setImagesZip(null);
      setProgress(0);
      setUploaded(false);

      if (fileRef.current) {
        fileRef.current.value = "";
      }
      if (zipRef.current) {
        zipRef.current.value = "";
      }

      setToast({
        type: "success",
        message: "All products removed successfully",
      });

      onChanged?.();
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Products could not be removed",
      });
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="bulk-upload-section">
      <section className="bulk-upload-card">
        <h3>
          <Upload />
          Bulk Upload
        </h3>
        <div className="bulk-upload-form-card">
          <label className="file-choice">
            <PackagePlus />
            <span>Choose Excel / CSV</span>

            <input
              ref={fileRef}
              hidden
              type="file"
              accept=".csv,.xlsx"
              disabled={uploading || removing}
              onChange={(e) => {
                const selectedFile = e.target.files?.[0] || null;

                setFile(selectedFile);
                setProgress(0);
                setUploaded(false);
              }}
            />
          </label>

          <div className="file-name">{file?.name || "No file selected"}</div>

          <label className="file-choice zip-choice">
            <ImageIcon />
            <span>Choose Product Images ZIP</span>

            <input
              ref={zipRef}
              hidden
              type="file"
              accept=".zip,application/zip"
              disabled={uploading || removing}
              onChange={(e) => {
                setImagesZip(e.target.files?.[0] || null);
                setProgress(0);
                setUploaded(false);
              }}
            />
          </label>

          <div className="file-name">
            {imagesZip?.name || "No image ZIP selected (optional)"}
          </div>

          <button
            type="button"
            disabled={!file || uploading || uploaded || removing}
            className={`bulk-button ${uploaded ? "uploaded" : ""}`}
            onClick={uploadFile}
          >
            {uploading ? (
              <RefreshCw className="spin" />
            ) : uploaded ? (
              <CheckCircle2 />
            ) : (
              <Upload />
            )}

            {uploading
              ? "Uploading..."
              : uploaded
                ? "Uploaded Successfully"
                : "Upload"}
          </button>

          {file && progress > 0 && (
            <div className="upload-progress-card">
              <div className="upload-progress-info">
                <span title={file.name}>{file.name}</span>
                <b>{progress}%</b>
              </div>

              <div className="upload-progress-track">
                <div
                  className="upload-progress-bar"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <p className="format">
            Excel: Code, Description, Category, UOM, Price.
            <br />
            ZIP: name each image with its product code, for example 0013.jpg.
          </p>
        </div>
      </section>

      <button
        type="button"
        className="remove-all-products"
        disabled={removing || uploading}
        onClick={removeAllProducts}
      >
        {removing ? <RefreshCw className="spin" /> : <Trash2 />}

        {removing ? "Removing Products..." : "Remove All Products"}
      </button>
    </div>
  );
}
