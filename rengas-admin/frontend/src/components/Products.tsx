import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { request } from "../api/client";
import type { Product } from "../types";
import { ProductView } from "./ProductView";
import { EditProduct } from "./EditProduct";

const PAGE_SIZE = 20;

type PageItem = number | "ellipsis";

function getPageItems(
  currentPage: number,
  totalPages: number,
): PageItem[] {
  if (totalPages <= 5) {
    return Array.from(
      { length: totalPages },
      (_, index) => index + 1,
    );
  }

  if (currentPage <= 3) {
    return [1, 2, 3, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [
      1,
      "ellipsis",
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    totalPages,
  ];
}

export function Products({
  selectedCategory,
  refresh,
  setRefresh,
  setModal,
  setToast,
}: any) {
  const [items, setItems] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sort, setSort] = useState("description");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewing, setViewing] = useState<Product | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(q.trim());
    }, 250);

    return () => window.clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);

    request(
      `/products?search=${encodeURIComponent(
        debouncedQuery,
      )}&refresh=${refresh}`,
    )
      .then((products: Product[]) => {
        if (!cancelled) {
          setItems(products);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setToast({
            type: "error",
            message: "Products could not be loaded",
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, refresh, setToast]);

  const shown = useMemo(
    () =>
      [...items]
        .filter(
          (product) =>
            selectedCategory === null ||
            product.category?.id === selectedCategory,
        )
        .sort((a, b) => {
          if (sort === "price") {
            return Number(a.price) - Number(b.price);
          }

          if (sort === "code") {
            return (a.code || "").localeCompare(b.code || "");
          }

          if (sort === "category") {
            return (a.category?.name || "").localeCompare(
              b.category?.name || "",
            );
          }

          if (sort === "uom") {
            return (a.uom || "").localeCompare(b.uom || "");
          }

          return (a.description || "").localeCompare(
            b.description || "",
          );
        }),
    [items, selectedCategory, sort],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(shown.length / PAGE_SIZE),
  );

  const pageItems = useMemo(
    () => getPageItems(currentPage, totalPages),
    [currentPage, totalPages],
  );

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;

    return shown.slice(start, start + PAGE_SIZE);
  }, [shown, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [q, selectedCategory, sort]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  async function remove(id: number) {
    if (!window.confirm("Delete this product?")) {
      return;
    }

    try {
      await request(`/products/${id}`, {
        method: "DELETE",
      });

      setToast({
        type: "success",
        message: "Product deleted successfully",
      });

      setRefresh((value: number) => value + 1);
    } catch {
      setToast({
        type: "error",
        message: "Product could not be deleted",
      });
    }
  }

  async function toggleCatalogueStatus(product: Product) {
    const currentEnabled = product.catalogueEnabled !== false;
    const nextEnabled = !currentEnabled;

    setItems((current) =>
      current.map((item) =>
        item.id === product.id
          ? { ...item, catalogueEnabled: nextEnabled }
          : item,
      ),
    );

    try {
      await request(`/products/${product.id}/catalogue-status`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: nextEnabled }),
      });

      setToast({
        type: "success",
        message: nextEnabled
          ? "Product included in catalogue"
          : "Product excluded from catalogue",
      });
    } catch {
      setItems((current) =>
        current.map((item) =>
          item.id === product.id
            ? { ...item, catalogueEnabled: currentEnabled }
            : item,
        ),
      );

      setToast({
        type: "error",
        message: "Catalogue status could not be saved",
      });
    }
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div className="panel-h3">
          <h3>Product Master</h3>
        </div>

        <button
          type="button"
          className="primary"
          onClick={() => setModal("product")}
        >
          <Plus />
          Add Product / Category
        </button>
      </div>

      <div className="filters">
        <label>
          <Search />

          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search products (code / name / UOM / price)"
          />
        </label>

        <select
          value={sort}
          onChange={(event) => setSort(event.target.value)}
        >
          <option value="code">Sort: Code</option>
          <option value="category">Sort: Category</option>
          <option value="description">
            Sort: Description
          </option>
          <option value="uom">Sort: Uom</option>
          <option value="price">Sort: Price</option>
        </select>
      </div>

      <div className="product-table">
        <div className="product-row head">
          <span>S.NO</span>
          <span>CODE</span>
          <span>CATEGORY</span>
          <span>IMAGE</span>
          <span>DESCRIPTION</span>
          <span>UOM</span>
          <span>PRICE</span>
          <span>ACTION</span>
        </div>

        {loading ? (
          <div className="empty">
            <RefreshCw className="spin" />
            <h3>Loading products...</h3>
          </div>
        ) : shown.length ? (
          paginatedProducts.map((product, index) => {
            const catalogueEnabled =
              product.catalogueEnabled !== false;

            return (
              <div
                className={`product-row ${
                  catalogueEnabled
                    ? ""
                    : "catalogue-disabled"
                }`}
                key={product.id}
              >
                <span className="serial">
                  {(currentPage - 1) * PAGE_SIZE + index + 1}
                </span>

                <b>{product.code || "-"}</b>

                <span>
                  {product.category?.name || "-"}
                </span>

                <img
                  className={`product-image ${
                    product.imageUrl
                      ? ""
                      : "default-product-logo"
                  }`}
                  src={product.imageUrl || "/logo.png"}
                  alt={product.description || "Product"}
                  loading="lazy"
                  decoding="async"
                  onError={(event) => {
                    event.currentTarget.src = "/logo.png";
                    event.currentTarget.classList.add(
                      "default-product-logo",
                    );
                  }}
                />

                <span>{product.description || "-"}</span>

                <span className="uom">
                  {product.uom || "-"}
                </span>

                <b className="product-price">
                  RM {Number(product.price).toFixed(2)}
                </b>

                <span className="actions">
                  <button
                    type="button"
                    onClick={() => setViewing(product)}
                  >
                    <Eye />
                    View
                  </button>

                  <button
                    type="button"
                    title="Edit"
                    onClick={() => setEditing(product)}
                  >
                    <Pencil />
                    Edit
                  </button>

                  <button
                    type="button"
                    className="delete"
                    title="Delete"
                    aria-label={`Delete ${
                      product.description || "product"
                    }`}
                    onClick={() => remove(product.id)}
                  >
                    <Trash2 />
                  </button>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={catalogueEnabled}
                    aria-label={
                      catalogueEnabled
                        ? "Exclude product from catalogue"
                        : "Include product in catalogue"
                    }
                    className={`status-toggle ${
                      catalogueEnabled ? "on" : "off"
                    }`}
                    title={
                      catalogueEnabled
                        ? "Included in catalogue"
                        : "Excluded from catalogue"
                    }
                    onClick={() => toggleCatalogueStatus(product)}
                  >
                    <span
                      className="toggle-track"
                      aria-hidden="true"
                    >
                      <span className="toggle-knob" />
                    </span>

                    <span className="toggle-label">
                      {catalogueEnabled ? "ON" : "OFF"}
                    </span>
                  </button>
                </span>
              </div>
            );
          })
        ) : (
          <div className="empty">
            <Box />
            <h3>No products found</h3>
            <p>
              Search/filter does not match any products.
            </p>
          </div>
        )}
      </div>

      {!loading && shown.length > 0 && totalPages > 1 && (
        <nav
          className="pagination"
          aria-label="Products pagination"
        >
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() =>
              setCurrentPage((page) => page - 1)
            }
          >
            Prev
          </button>

          {pageItems.map((item, index) =>
            item === "ellipsis" ? (
              <span
                className="pagination-ellipsis"
                key={`ellipsis-${index}`}
              >
                …
              </span>
            ) : (
              <button
                type="button"
                key={item}
                className={
                  currentPage === item ? "active" : ""
                }
                aria-current={
                  currentPage === item
                    ? "page"
                    : undefined
                }
                onClick={() => setCurrentPage(item)}
              >
                {item}
              </button>
            ),
          )}

          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() =>
              setCurrentPage((page) => page + 1)
            }
          >
            Next
          </button>
        </nav>
      )}

      {viewing && (
        <ProductView
          product={viewing}
          close={() => setViewing(null)}
        />
      )}

      {editing && (
        <EditProduct
          product={editing}
          close={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setRefresh((value: number) => value + 1);
          }}
          setToast={setToast}
        />
      )}
    </section>
  );
}
