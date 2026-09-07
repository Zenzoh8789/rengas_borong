import { useEffect, useRef, useState } from "react";
import {
  Bell,
  MoreVertical,
  CheckCircle2,
  Cloud,
  FileText,
  LogOut,
  Palette,
  RefreshCw,
  Upload,
  Users,
  X,
} from "lucide-react";
import { API, request } from "../api/client";

export function Topbar({
  role,
  view,
  setView,
  setModal,
  onLogout,
  onImported,
  setToast,
}: any) {
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!headerRef.current?.contains(event.target as Node)) { setMenuOpen(false); setOpen(false); } };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setMenuOpen(false); setOpen(false); menuButtonRef.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [syncTime, setSyncTime] = useState(new Date());
  const [importingPrice, setImportingPrice] = useState(false);
  const loadNotifications = () => {
    request("/notifications")
      .then(setNotifications)
      .catch((error) => console.error("Notification request failed:", error));
    request("/notifications/unread-count")
      .then((d) => setUnread(Math.max(0, Number(d.count) || 0)))
      .catch(() => {});
  };
  useEffect(() => {
    loadNotifications();
    const refreshWhenVisible = () => {
      if (document.visibilityState !== "visible") return;
      loadNotifications();
      setSyncTime(new Date());
    };
    const id = window.setInterval(refreshWhenVisible, 15000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
    };
  }, []);
  async function importPrice(file?: File) {
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["csv", "xlsx"].includes(extension)) {
      setToast({
        type: "error",
        message: "Select a CSV or Excel file with Code and Price columns.",
      });
      return;
    }

    const data = new FormData();
    data.append("file", file);
    setImportingPrice(true);

    try {
      const response = await fetch(API + "/products/import-price", {
        method: "POST",
        credentials: "include",
        body: data,
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || "Price import failed");
      }

      setToast({
        type: "success",
        message:
          `${result.updated ?? 0} prices updated` +
          (result.skipped ? ` • ${result.skipped} rows skipped` : ""),
      });
      onImported();
      loadNotifications();
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Price import failed. Check Code and Price columns.",
      });
    } finally {
      setImportingPrice(false);
    }
  }
  async function toggleBell() {
    setOpen((v) => !v);
    if (!open && unread) {
      try {
        await request("/notifications/read-all", { method: "PATCH" });
        setUnread(0);
        setNotifications(current => current.map(item => ({ ...item, isRead: true })));
      } catch {
        setToast({ type: "error", message: "Could not mark notifications as read. Please try again." });
      }
    }
  }
  return (
    <header ref={headerRef} className={`topbar ${role !== "ADMIN" ? "customer-topbar" : ""}`}>
      {role === "ADMIN" && <div><h2>All Products</h2></div>}
      {role !== "ADMIN" && <div id="order-summary" />}
      {role !== "ADMIN" && <button ref={menuButtonRef} type="button" className="customer-menu-toggle" aria-label="Open navigation" aria-expanded={menuOpen} aria-controls="topbar-actions" onClick={() => { setMenuOpen(!menuOpen); setOpen(false); }}><MoreVertical />{unread > 0 && <span className="notification-dot" aria-hidden="true" />}</button>}
      <nav id="topbar-actions" className={menuOpen ? "customer-menu-open" : ""}>
        {role === "ADMIN" ? (
          <>
            <button className="green" onClick={() => setModal("catalogue")}>
              <FileText />
              Generate Catalogue
            </button>
            <button onClick={() => setModal("design")}>
              <Palette />
              Design
            </button>
            <input
              ref={fileRef}
              hidden
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => {
                importPrice(e.target.files?.[0]);
                e.currentTarget.value = "";
              }}
            />
            <button
              className="primary"
              type="button"
              disabled={importingPrice}
              onClick={() => fileRef.current?.click()}
            >
              {importingPrice ? <RefreshCw className="spin" /> : <Upload />}
              {importingPrice ? "Importing..." : "Import Price"}
            </button>
          </>
        ) : (
          <>
            <button
              className={view === "orders" ? "primary" : ""}
              onClick={() => { setView("orders"); setMenuOpen(false); setOpen(false); }}
            >
              <FileText />
              Orders
            </button>
            <button
              className={view === "customers" ? "primary" : ""}
              onClick={() => { setView("customers"); setMenuOpen(false); setOpen(false); }}
            >
              <Users />
              Customers
            </button>

          </>
        )}
       
        <div className="bell-wrap">
          <button
            type="button"
            className="notice"
            onClick={toggleBell}
            aria-label={`Notifications: ${unread} unread`}
            aria-expanded={open}
            aria-controls="notification-panel"
          >
            <Bell /><span className="customer-menu-label">Notifications</span>
            {unread > 0 && (
              <span className="notification-dot" aria-hidden="true" />
            )}
          </button>

          {open && (
            <div
              id="notification-panel"
              className="notification-panel"
              role="region"
              aria-label="Notifications"
            >
              <header>
                <b>Notifications</b>

                <button type="button" onClick={() => setOpen(false)}>
                  <X />
                </button>
              </header>

              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <article className={n.isRead ? "" : "unread"} key={n.id}>
                    <CheckCircle2 />

                    <div>
                      <b>{n.title}</b>
                      <p>{n.message}</p>
                      <small>{new Date(n.createdAt).toLocaleString()}</small>
                    </div>
                  </article>
                ))
              ) : (
                <p className="notification-empty">No notifications yet</p>
              )}
            </div>
          )}
        </div>
        <button onClick={onLogout}>
          <LogOut />
          Logout
        </button>
      </nav>
    </header>
  );
}
