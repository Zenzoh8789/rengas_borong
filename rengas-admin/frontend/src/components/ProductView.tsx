import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Box, CheckCircle2, Cloud, Download, Eye, FileText, Image as ImageIcon, LogOut, PackagePlus, Palette, Pencil, Plus, RefreshCw, Save, Search, ShieldCheck, Trash2, Upload, Users, X, XCircle } from "lucide-react";
import { API, request } from "../api/client";
import type { Category, Customer, Product, Role, ToastState } from "../types";
import { Modal } from "./Modal";

export function ProductView({
  product,
  close,
}: {
  product: Product;
  close: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showNoImage = !product.imageUrl || imageFailed;

  return (
    <Modal
      title="View Product"
      subtitle="Product details preview"
      onClose={close}
      wide
    >
      <div className="product-view">
        <section className="product-view-image-card">
          <div className="product-view-image">
            {showNoImage ? (
              <div className="no-image-layer">
                <img src="/logo.png" alt="" aria-hidden="true" />
                <span>No image uploaded</span>
              </div>
            ) : (
              <img
                src={product.imageUrl}
                alt={product.description}
                onError={() => setImageFailed(true)}
              />
            )}
          </div>

          <b>Product Image</b>

          <p>
            Optional. Product can be saved
            <br />
            without image.
          </p>
        </section>

        <dl className="product-view-details">
          <div>
            <dt>Code</dt>
            <dd>{product.code || "-"}</dd>
          </div>

          <div>
            <dt>Description</dt>
            <dd>{product.description || "-"}</dd>
          </div>

          <div>
            <dt>Category</dt>
            <dd>{product.category?.name || "-"}</dd>
          </div>

          <div>
            <dt>UOM</dt>
            <dd>{product.uom || "-"}</dd>
          </div>

          <div>
            <dt>Price</dt>
            <dd>RM {Number(product.price || 0).toFixed(2)}</dd>
          </div>
        </dl>
      </div>

      <footer className="product-view-footer">
        <button type="button" onClick={close}>
          Cancel
        </button>
      </footer>
    </Modal>
  );
}

