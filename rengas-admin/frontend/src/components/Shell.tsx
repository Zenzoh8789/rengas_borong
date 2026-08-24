import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import { request } from "../api/client";
import type { Category, Customer, Role, ToastState } from "../types";
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
  const [view, setView] = useState<
    "products" | "orders" | "customers"
  >(role === "ADMIN" ? "products" : "orders");

  const [modal, setModal] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sideQuery, setSideQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(
    null,
  );

  const [sidebarOpen, setSidebarOpen] = useState(
    () =>
      typeof window === "undefined" ||
      !window.matchMedia("(max-width: 900px)").matches,
  );

  const [refresh, setRefresh] = useState(0);
  const [toast, setToast] = useState<ToastState>(loginToast);
  const [orderCustomers, setOrderCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    if (loginToast) {
      onLoginToastShown();
    }
  }, [loginToast, onLoginToastShown]);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 900px)");

    const handleBreakpointChange = (event: MediaQueryListEvent) => {
      setSidebarOpen(!event.matches);
    };

    mobileQuery.addEventListener("change", handleBreakpointChange);

    return () => {
      mobileQuery.removeEventListener("change", handleBreakpointChange);
    };
  }, []);

  const loadCategories = () =>
    request("/categories")
      .then(setCategories)
      .catch(() =>
        setToast({
          type: "error",
          message: "Categories could not be loaded",
        }),
      );

  useEffect(() => {
    if (role === "ADMIN") {
      loadCategories();
    } else {
      request("/customers")
        .then(setOrderCustomers)
        .catch(() => setOrderCustomers([]));
    }
  }, [role, refresh]);

  const filteredCategories = useMemo(
    () =>
      categories.filter((category) =>
        category.name
          .toLowerCase()
          .includes(sideQuery.trim().toLowerCase()),
      ),
    [categories, sideQuery],
  );

  const visibleCustomers = useMemo(
    () =>
      orderCustomers.filter((customer) =>
        [
          customer.name,
          customer.phoneNumber,
          customer.address,
        ]
          .join(" ")
          .toLowerCase()
          .includes(sideQuery.trim().toLowerCase()),
      ),
    [orderCustomers, sideQuery],
  );

  const closeSidebarOnMobile = () => {
    if (window.matchMedia("(max-width: 900px)").matches) {
      setSidebarOpen(false);
    }
  };

  const selectAll = () => {
    setSelectedCategory(null);
    closeSidebarOnMobile();
  };

  const selectCategory = (categoryId: number) => {
    setSelectedCategory(categoryId);
    closeSidebarOnMobile();
  };

  return (
    <div
      className={`app ${
        sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"
      }`}
    >
      <aside
        id="admin-sidebar"
        className={`sidebar ${sidebarOpen ? "open" : "closed"}`}
        aria-hidden={!sidebarOpen}
      >
        <div className="brand">
          <img src="/logo.png" alt="Rengas logo" />

          <div className="brand-text">
            <b>{role === "ADMIN" ? "RENGA BORONG" : "Order Admin"}</b>

            <small>
              {role === "ADMIN"
                ? "Admin"
                : "Order Management Admin"}
            </small>
          </div>

          <button
            type="button"
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            title="Close sidebar"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
        </div>

        <label className="side-search">
          <Search aria-hidden="true" />

          <input
            value={sideQuery}
            onChange={(event) => setSideQuery(event.target.value)}
            placeholder={`Search ${
              role === "ADMIN" ? "category" : "customer"
            }...`}
          />

          {sideQuery && (
            <button
              type="button"
              onClick={() => setSideQuery("")}
              aria-label="Clear search"
            >
              <X aria-hidden="true" />
            </button>
          )}
        </label>

        <div className="side-title">
          <b>
            {role === "ADMIN" ? "Categories" : "Customer Details"}
          </b>

          <span>
            {role === "ADMIN"
              ? categories.length
              : visibleCustomers.length}{" "}
            {role === "ADMIN" ? "categories" : ""}
          </span>
        </div>

        <button
          type="button"
          className={`side-link ${
            selectedCategory === null ? "active" : ""
          }`}
          onClick={selectAll}
        >
          {role === "ADMIN" ? "ALL PRODUCTS" : "All Customers"}

          <span>
            {role === "ADMIN"
              ? categories.reduce(
                  (total, category) =>
                    total + (category.products?.length || 0),
                  0,
                )
              : orderCustomers.length}
          </span>
        </button>

        {role === "ADMIN"
          ? filteredCategories.map((category) => (
              <button
                type="button"
                className={`side-link ${
                  selectedCategory === category.id ? "active" : ""
                }`}
                key={category.id}
                onClick={() => selectCategory(category.id)}
              >
                {category.name}

                <span>{category.products?.length || 0}</span>
              </button>
            ))
          : visibleCustomers.map((customer) => (
              <button
                type="button"
                className="side-link"
                key={customer.id}
                onClick={closeSidebarOnMobile}
              >
                {customer.name}

                <span>{customer.id}</span>
              </button>
            ))}

        {(role === "ADMIN"
          ? filteredCategories
          : visibleCustomers
        ).length === 0 && (
          <p className="side-empty">No matches found</p>
        )}
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
          tabIndex={-1}
        />
      )}

      {!sidebarOpen && (
        <button
          type="button"
          className="sidebar-open"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
          title="Open sidebar"
        >
          <ChevronRight aria-hidden="true" />
        </button>
      )}

      <main className="content">
        <Topbar
          role={role}
          view={view}
          setView={setView}
          setModal={setModal}
          onLogout={onLogout}
          onImported={() => setRefresh((value) => value + 1)}
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
          <Orders
            view={view as "orders" | "customers"}
            setModal={setModal}
            setToast={setToast}
          />
        )}
      </main>

      {modal === "product" && (
        <ProductModal
          categories={categories}
          close={() => setModal(null)}
          onChanged={() => {
            setSelectedCategory(null);
            setRefresh((value) => value + 1);
          }}
          setToast={setToast}
        />
      )}

      {modal === "catalogue" && (
        <Catalogue
          categories={categories}
          close={() => setModal(null)}
          setToast={setToast}
        />
      )}

      {modal === "design" && (
        <Design
          close={() => setModal(null)}
          setToast={setToast}
        />
      )}

      {modal === "customer" && (
        <CustomerModal
          close={() => setModal(null)}
          setToast={setToast}
        />
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}