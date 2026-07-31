import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Box, CheckCircle2, Cloud, Download, Eye, FileText, Image as ImageIcon, LogOut, PackagePlus, Palette, Pencil, Plus, RefreshCw, Save, Search, ShieldCheck, Trash2, Upload, Users, X, XCircle } from "lucide-react";
import { API, request } from "../api/client";
import type { Category, Customer, Product, Role, ToastState } from "../types";
import { Topbar } from "./Topbar";
import { Products } from "./Products";
import { Orders } from "./Orders";
import { ProductModal } from "./ProductModal";
import { CustomerModal } from "./CustomerModal";
import { Catalogue } from "./Catalogue";
import { Design } from "./Design";
import { Toast } from "./Toast";

export function Shell({
  role,
  onLogout,
  loginToast,
  onLoginToastShown,
}: {
  role: Role;
  onLogout: () => void;
  loginToast: ToastState;
  onLoginToastShown: () => void;
}) {
  const [view, setView] = useState<"products" | "orders" | "customers">(
    role === "ADMIN" ? "products" : "orders",
  );
  const [modal, setModal] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sideQuery, setSideQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [toast, setToast] = useState<ToastState>(loginToast);
  useEffect(() => {
    if (loginToast) onLoginToastShown();
  }, [loginToast, onLoginToastShown]);
  const loadCategories = () =>
    request("/categories")
      .then(setCategories)
      .catch(() =>
        setToast({ type: "error", message: "Categories could not be loaded" }),
      );
  useEffect(() => {
    if (role === "ADMIN") loadCategories();
  }, [role, refresh]);
  const filteredCategories = useMemo(
    () =>
      categories.filter((c) =>
        c.name.toLowerCase().includes(sideQuery.trim().toLowerCase()),
      ),
    [categories, sideQuery],
  );
  const fakeCustomers = useMemo(
    () =>
      Array.from(
        { length: 16 },
        (_, i) => `Customer ${String(i + 1).padStart(3, "0")}`,
      ).filter((n) => n.toLowerCase().includes(sideQuery.toLowerCase())),
    [sideQuery],
  );
  return (
    <div className="app">
      <aside>
        <div className="brand">
          <img src="/logo.png" alt="Rengas logo" />
          <div>
            <b>{role === "ADMIN" ? "RENGA BORONG" : "Order Admin"}</b>
            <small>
              {role === "ADMIN" ? "Admin" : "Order Management Admin"}
            </small>
          </div>
        </div>
        <label className="side-search">
          <Search />
          <input
            value={sideQuery}
            onChange={(e) => setSideQuery(e.target.value)}
            placeholder={`Search ${role === "ADMIN" ? "category" : "customer"}...`}
          />
          {sideQuery && (
            <button onClick={() => setSideQuery("")} aria-label="Clear">
              <X />
            </button>
          )}
        </label>
        <div className="side-title">
          <b>{role === "ADMIN" ? "Categories" : "Customer Details"}</b>
          <span>
            {role === "ADMIN" ? categories.length : fakeCustomers.length}{" "}
            {role === "ADMIN" ? "categories" : ""}
          </span>
        </div>
        <button
          className={`side-link ${selectedCategory === null ? "active" : ""}`}
          onClick={() => setSelectedCategory(null)}
        >
          {role === "ADMIN" ? "ALL PRODUCTS" : "All Customers"}
          <span>
            {role === "ADMIN"
              ? categories.reduce((n, c) => n + (c.products?.length || 0), 0)
              : 100}
          </span>
        </button>
        {role === "ADMIN"
          ? filteredCategories.map((c) => (
              <button
                className={`side-link ${selectedCategory === c.id ? "active" : ""}`}
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
              >
                {c.name}
                <span>{c.products?.length || 0}</span>
              </button>
            ))
          : fakeCustomers.map((name) => (
              <button className="side-link" key={name}>
                {name}
                <span>1</span>
              </button>
            ))}
        {(role === "ADMIN" ? filteredCategories : fakeCustomers).length ===
          0 && <p className="side-empty">No matches found</p>}
      </aside>
      <main className="content">
        <Topbar
          role={role}
          view={view}
          setView={setView}
          setModal={setModal}
          onLogout={onLogout}
          onImported={() => setRefresh((v) => v + 1)}
          setToast={setToast}
        />
        {role === "ADMIN" ? (
          <Products
            selectedCategory={selectedCategory}
            refresh={refresh}
            setRefresh={setRefresh}
            setModal={setModal}
            setToast={setToast}
          />
        ) : (
          <Orders view={view} setModal={setModal} />
        )}
      </main>
      {modal === "product" && (
        <ProductModal
          categories={categories}
          close={() => setModal(null)}
          onChanged={() => {
            setSelectedCategory(null);
            setRefresh((v) => v + 1);
          }}
          setToast={setToast}
        />
      )}{" "}
      {modal === "catalogue" && (
        <Catalogue
          categories={categories}
          close={() => setModal(null)}
          setToast={setToast}
        />
      )}{" "}
      {modal === "design" && (
        <Design close={() => setModal(null)} setToast={setToast} />
      )}{" "}
      {modal === "customer" && (
        <CustomerModal close={() => setModal(null)} setToast={setToast} />
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
