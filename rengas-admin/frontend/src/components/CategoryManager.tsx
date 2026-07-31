import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Box, CheckCircle2, Cloud, Download, Eye, FileText, Image as ImageIcon, LogOut, PackagePlus, Palette, Pencil, Plus, RefreshCw, Save, Search, ShieldCheck, Trash2, Upload, Users, X, XCircle } from "lucide-react";
import { API, request } from "../api/client";
import type { Category, Customer, Product, Role, ToastState } from "../types";


export function CategoryManager({
  initial,
  changed,
  setToast,
}: {
  initial: Category[];
  changed: () => void;
  setToast: (t: ToastState) => void;
}) {
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const shown = initial.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()),
  );
  async function add() {
    if (!name.trim()) {
      setToast({ type: "error", message: "Enter a category name" });
      return;
    }
    try {
      await request("/categories", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      setName("");
      changed();
      setToast({ type: "success", message: "Category added successfully" });
    } catch {
      setToast({
        type: "error",
        message: "Category already exists or could not be added",
      });
    }
  }
  async function remove(id: number) {
    try {
      await request("/categories/" + id, { method: "DELETE" });
      changed();
      setToast({ type: "success", message: "Category deleted" });
    } catch {
      setToast({
        type: "error",
        message: "Category contains products and cannot be deleted",
      });
    }
  }
  return (
    <section className="card-form category-manager">
      <h3>
        <PackagePlus />
        Category Management
      </h3>
      <label className="stacked">
        Category Name
        <div className="add-category">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter category name"
          />
          <button type="button" className="primary" onClick={add}>
            <Plus />
            Add
          </button>
        </div>
      </label>
      <label className="stacked">
        Search Category
        <div className="category-search">
          <Search />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search category"
          />
        </div>
      </label>
      <div className="category-tools">
        <button
          type="button"
          onClick={() =>
            setSelected(
              selected.length === initial.length
                ? []
                : initial.map((c) => c.id),
            )
          }
        >
          Select / Clear All
        </button>
        <button
          type="button"
          className="delete-selected"
          disabled={!selected.length}
          onClick={() => selected.forEach(remove)}
        >
          <Trash2 />
          Delete Selected ({selected.length})
        </button>
      </div>
      <div className="category-list">
        {shown.map((c) => {
          const isSelected = selected.includes(c.id);

          return (
            <div
              className={`category-item ${isSelected ? "selected" : ""}`}
              key={c.id}
            >
              <input
                type="checkbox"
                checked={isSelected}
                aria-label={`Select ${c.name}`}
                onChange={() =>
                  setSelected((current) =>
                    current.includes(c.id)
                      ? current.filter((id) => id !== c.id)
                      : [...current, c.id],
                  )
                }
              />

              <div className="category-info">
                <b>{c.name}</b>
                <small>{c.products?.length || 0} products</small>
              </div>

              <button type="button" onClick={() => remove(c.id)}>
                <Trash2 />
                <span>Delete</span>
              </button>
            </div>
          );
        })}

        {!shown.length && <p className="side-empty">No categories found</p>}
      </div>
    </section>
  );
}
