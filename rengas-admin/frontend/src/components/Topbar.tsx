import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Cloud,
  Download,
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [syncTime, setSyncTime] = useState(new Date());
  const [importingPrice, setImportingPrice] = useState(false);
  const loadNotifications = () => {
    request("/notifications")
      .then(setNotifications)
      .catch(() => {});
    request("/notifications/unread-count")
      .then((d) => setUnread(d.count))
      .catch(() => {});
  };
  useEffect(() => {
    loadNotifications();
    const id = setInterval(() => {
      loadNotifications();
      setSyncTime(new Date());
    }, 15000);
    return () => clearInterval(id);
  }, []);
  async function importPrice(file?: File) {
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["csv", "xlsx", "xls"].includes(extension)) {
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
      await request("/notifications/read-all", { method: "PATCH" });
      setUnread(0);
    }
  }
  return (
    <header className="topbar">
      <div>
        <h2>{role === "ADMIN" ? "All Products" : "All Customers"}</h2>
      </div>
      <nav>
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
              accept=".csv,.xlsx,.xls"
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
              onClick={() => setView("orders")}
            >
              <FileText />
              Orders
            </button>
            <button
              className={view === "customers" ? "primary" : ""}
              onClick={() => setView("customers")}
            >
              <Users />
              Customers
            </button>
            <button className="green">
              <Download />
              Export
            </button>
          </>
        )}
        <button
          onClick={() => {
            onImported();
            setSyncTime(new Date());
          }}
        >
          <RefreshCw />
          Refresh
        </button>
       
        <div className="bell-wrap">
          <button
            type="button"
            className="notice"
            onClick={toggleBell}
            aria-label={`Notifications: ${unread} unread`}
            aria-expanded={open}
            aria-controls="notification-panel"
          >
            <Bell />
            {unread > 0 && (
              <span className="notice-badge" aria-hidden="true">
                {unread > 99 ? "99+" : unread}
              </span>
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
