import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Box, CheckCircle2, Cloud, Download, Eye, FileText, Image as ImageIcon, LogOut, PackagePlus, Palette, Pencil, Plus, RefreshCw, Save, Search, ShieldCheck, Trash2, Upload, Users, X, XCircle } from "lucide-react";
import { API, request } from "../api/client";
import type { Category, Customer, Product, Role, ToastState } from "../types";


export function Orders({ view, setModal }: any) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  useEffect(() => {
    request("/customers")
      .then(setCustomers)
      .catch(() => {});
  }, []);
  return (
    <>
      <div className="stats">
        {[
          ["100", "Total Customers"],
          ["0", "Today Received"],
          ["0", "Weekly Orders"],
          ["0", "Monthly Orders"],
        ].map(([n, l]) => (
          <div key={l}>
            <Users />
            <b>{n}</b>
            <span>{l}</span>
          </div>
        ))}
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{view === "orders" ? "Order Details" : "Customer Details"}</h2>
            <p>
              {view === "orders"
                ? "100 orders found"
                : "Manage customer records"}
            </p>
          </div>
          <button className="primary" onClick={() => setModal("customer")}>
            <Plus />
            {view === "orders" ? "Modify Order" : "Add Customer"}
          </button>
        </div>
        <div className="order-list">
          {view === "customers"
            ? customers.map((c, i) => (
                <div className="order-row" key={c.id}>
                  <b>{i + 1}</b>
                  <div>
                    <strong>{c.name}</strong>
                    <small>
                      {c.phoneNumber} · {c.address}
                    </small>
                  </div>
                  <span>{c.tinNumber || "No TIN"}</span>
                  <button>Edit</button>
                </div>
              ))
            : Array.from({ length: 5 }, (_, i) => (
                <div className="order-row" key={i}>
                  <b>{i + 1}</b>
                  <strong>ORD-{1001 + i}</strong>
                  <div>
                    <strong>Customer {String(i + 1).padStart(3, "0")}</strong>
                    <small>011-7000 100{i} · Selangor, Malaysia</small>
                  </div>
                  <span>2026-05-0{i + 1}</span>
                  <b>RM {(180 + i * 37.5).toFixed(2)}</b>
                  <em>{["View", "Modified", "Printed"][i % 3]}</em>
                  <button>Edit</button>
                </div>
              ))}
        </div>
      </section>
    </>
  );
}
