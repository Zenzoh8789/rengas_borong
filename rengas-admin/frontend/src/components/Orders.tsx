import { useEffect, useMemo, useState } from "react";
import {
  Box,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { API, request } from "../api/client";
import type { Customer, Order, Product, ToastState } from "../types";

const PAGE_SIZE = 20;
const money = (n: number) =>
  `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const total = (o: Order) =>
  o.items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unitPrice), 0);

export function Orders({
  view,
  setModal,
  setToast,
}: {
  view: "orders" | "customers";
  setModal: (v: string | null) => void;
  setToast: (v: ToastState) => void;
}) {
  const [orders, setOrders] = useState<Order[]>([]),
    [customers, setCustomers] = useState<Customer[]>([]),
    [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState(""),
    [month, setMonth] = useState(""),
    [page, setPage] = useState(1);
  const [modifyOpen, setModifyOpen] = useState(false),
    [selectedOrder, setSelectedOrder] = useState<Order | null>(null),
    [customerView, setCustomerView] = useState<Customer | null>(null),
    [customerEdit, setCustomerEdit] = useState<Customer | null>(null),
    [exportOpen, setExportOpen] = useState(false);
  const load = () =>
    Promise.all([
      request("/orders"),
      request("/customers"),
      request("/products"),
    ]).then(([o, c, p]) => {
      setOrders(o);
      setCustomers(c);
      setProducts(p);
    });
  useEffect(() => {
    load().catch(() =>
      setToast({ type: "error", message: "Order data could not be loaded" }),
    );
  }, []);
  useEffect(() => {
    const run = () => setExportOpen(true);
    window.addEventListener("export-orders", run);
    return () => window.removeEventListener("export-orders", run);
  }, []);
  useEffect(() => setPage(1), [query, month, view]);
  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          (!month || o.orderDate.startsWith(month)) &&
          [
            o.orderNo,
            o.customer?.name,
            o.customer?.phoneNumber,
            o.customer?.tinNumber,
            o.customer?.address,
            o.orderDate,
            o.status,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),
    [orders, query, month],
  );
  const filteredCustomers = useMemo(
    () =>
      customers.filter((c) =>
        [c.name, c.address, c.tinNumber, c.phoneNumber, c.whatsappNumber]
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [customers, query],
  );
  const rows = view === "orders" ? filteredOrders : filteredCustomers,
    pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE)),
    visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const stats = {
    customers: customers.length,
    today: orders.filter(
      (o) => o.orderDate === new Date().toISOString().slice(0, 10),
    ).length,
    week: orders.filter(
      (o) => Date.now() - new Date(o.orderDate).getTime() < 604800000,
    ).length,
    month: orders.filter(
      (o) => o.orderDate.slice(0, 7) === new Date().toISOString().slice(0, 7),
    ).length,
  };
  async function exportOrders(params: URLSearchParams, fileName: string) {
    try {
      const queryString = params.toString();
      const r = await fetch(
        API + "/orders-export" + (queryString ? `?${queryString}` : ""),
        { credentials: "include" },
      );
      if (!r.ok) throw new Error();
      const url = URL.createObjectURL(await r.blob()),
        a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      setToast({
        type: "success",
        message: "Filtered order details exported to Excel",
      });
      setExportOpen(false);
    } catch {
      setToast({ type: "error", message: "Excel export failed" });
    }
  }
  async function printOrder(order: Order) {
    const escapeHtml = (value: unknown) =>
      String(value ?? "—")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const rows = order.items
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.product.code)} — ${escapeHtml(item.product.description)}</td>
            <td>${escapeHtml(item.product.uom)}</td>
            <td>${escapeHtml(Number(item.quantity).toFixed(2))}</td>
            <td>${escapeHtml(money(Number(item.unitPrice)))}</td>
            <td>${escapeHtml(money(Number(item.quantity) * Number(item.unitPrice)))}</td>
          </tr>`,
      )
      .join("");

    const frame = document.createElement("iframe");
    frame.setAttribute("title", "Print order");
    frame.style.position = "fixed";
    frame.style.left = "-10000px";
    frame.style.top = "0";
    frame.style.width = "1px";
    frame.style.height = "1px";
    frame.style.border = "0";
    document.body.appendChild(frame);

    const printDocument = frame.contentDocument;
    if (!printDocument || !frame.contentWindow) {
      frame.remove();
      setToast({ type: "error", message: "Unable to open the print document." });
      return;
    }

    printDocument.open();
    printDocument.write(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Rengas Borong Admin - ${escapeHtml(order.orderNo)}</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; background: #fff; color: #111; }
            body { padding: 10mm; font: 12px Arial, sans-serif; }
            .sheet { width: 100%; max-width: 190mm; margin: 0 auto; }
            header { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 0 0 12px; border-bottom: 2px solid #111; }
            h1 { margin: 0; text-align: left; font-size: 22px; }
            header p { margin: 4px 0 0; font-size: 14px; font-weight: 700; }
            header > b { font-size: 14px; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 28px; margin: 16px 0; }
            .details p { margin: 0; line-height: 1.4; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #777; padding: 7px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
            th:first-child, td:first-child { width: 52%; }
            th:nth-child(2), td:nth-child(2) { width: 10%; }
            th:nth-child(3), td:nth-child(3) { width: 8%; }
            th:nth-child(4), td:nth-child(4), th:nth-child(5), td:nth-child(5) { width: 15%; }
            tr { break-inside: avoid; page-break-inside: avoid; }
            tfoot { font-weight: 800; }
          </style>
        </head>
        <body>
          <main class="sheet">
            <header>
              <div><h1>RENGAS BORONG</h1><p>Order Details</p></div>
              <b>${escapeHtml(order.orderNo)}</b>
            </header>
            <section class="details">
              <p><b>Customer:</b> ${escapeHtml(order.customer?.name)}</p>
              <p><b>Phone:</b> ${escapeHtml(order.customer?.phoneNumber)}</p>
              <p><b>Company:</b> ${escapeHtml(order.customer?.companyName)}</p>
              <p><b>WhatsApp:</b> ${escapeHtml(order.customer?.whatsappNumber)}</p>
              <p><b>Address:</b> ${escapeHtml(order.customer?.address)}</p>
              <p><b>TIN:</b> ${escapeHtml(order.customer?.tinNumber)}</p>
              <p><b>Date:</b> ${escapeHtml(order.orderDate)}</p>
            </section>
            <table>
              <thead><tr><th>Product</th><th>UOM</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
              <tbody>${rows}</tbody>
              <tfoot><tr><td colspan="4">Grand Total</td><td>${escapeHtml(money(total(order)))}</td></tr></tfoot>
            </table>
          </main>
        </body>
      </html>`);
    printDocument.close();

    try {
      frame.contentWindow.focus();
      frame.contentWindow.print();
      setToast({
        type: "success",
        message: "Print dialog closed. Change the order status from Edit if required.",
      });
    } catch (error) {
      console.error("Print order failed:", error);
      setToast({
        type: "error",
        message: "Unable to update the printed status. Please try again.",
      });
    } finally {
      window.setTimeout(() => frame.remove(), 500);
    }
  }

  function formatAddress(address?: string) {
      if (!address) return "—";

      return address
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/(.{25})/g, "$1\n");
  }
  return (
    <>
      <div className="stats order-stats">
        {[
          [stats.customers, "Total Customers"],
          [stats.today, "Today Received"],
          [stats.week, "Weekly Orders"],
          [stats.month, "Monthly Orders"],
        ].map(([n, l]) => (
          <div key={String(l)}>
            <Users />
            <b>{n}</b>
            <span>{l}</span>
          </div>
        ))}
      </div>
      <section className="panel order-panel">
        <div className="panel-heading order-heading">
          <div>
            <h2>{view === "orders" ? "Order Details" : "Customer Details"}</h2>
            <p>
              {rows.length} {view} found
            </p>
          </div>
          <div className="order-tools">
            {view === "orders" && (
              <>
                <label className="month-filter">
                  <CalendarDays />
                  <span>Month Filter</span>
                  <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    aria-label="Month Filter"
                  />
                  {month && (
                    <button onClick={() => setMonth("")}>
                      <X />
                    </button>
                  )}
                </label>
                <button
                  className="primary"
                  onClick={() => {
                    setSelectedOrder(orders[0] || null);
                    setModifyOpen(true);
                  }}
                >
                  <Pencil />
                  Modify Order
                </button>
              </>
            )}
            {view === "customers" && (
              <>
                <span className="entry-count">
                  <Users />
                  20 Entry / Page
                </span>
                <button
                  className="primary"
                  onClick={() => setModal("customer")}
                >
                  <Plus />
                  Add Customer
                </button>
              </>
            )}
          </div>
        </div>
        <label className="order-search">
          <Search />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              view === "orders"
                ? "Search orders by ID, customer, phone, date, status..."
                : "Search customers by name, address, TIN, phone..."
            }
          />
          {query && (
            <button onClick={() => setQuery("")}>
              <X />
            </button>
          )}
        </label>
        <div className="admin-scroll-table">
          {view === "orders" ? (
            <div className="data-table order-table">
              <div className="data-head">
                <span>S.NO</span>
                <span>ORDER ID</span>
                <span>CUSTOMER DETAILS</span>
                <span>DATE</span>
                <span>ITEMS</span>
                <span>AMOUNT</span>
                <span>STATUS</span>
                <span>ACTION</span>
              </div>
              {(visible as Order[]).map((o, i) => (
                <div className="data-row" key={o.id}>
                  <b className="serial">{(page - 1) * PAGE_SIZE + i + 1}</b>
                  <strong className="order-id">{o.orderNo}</strong>
                  <div className="customer-cell">
                    <strong>{o.customer?.name}</strong>
                    <small>{o.customer?.phoneNumber || "—"}</small>
                    <small className="address-text">
                      {formatAddress(o.customer?.address)}
                    </small>
                    <small>TIN: {o.customer?.tinNumber || "—"}</small>
                  </div>
                  <span>{o.orderDate}</span>
                  <span>{o.items.length}</span>
                  <b>{money(total(o))}</b>
                  <em className={`status ${o.status.toLowerCase()}`}>
                    {o.status[0] + o.status.slice(1).toLowerCase()}
                  </em>
                  <div className="row-actions">
                    <button
                      onClick={() => {
                        setSelectedOrder(o);
                        setModifyOpen(true);
                      }}
                    >
                      <Pencil />
                      Edit
                    </button>
                    <button onClick={() => printOrder(o)}>
                      <Printer />
                      Print
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="data-table customer-table">
              <div className="data-head">
                <span>S.NO</span>
                <span>NAME</span>
                <span>ADDRESS</span>
                <span>TIN NUMBER</span>
                <span>PHONE NUMBER</span>
                <span>WHATSAPP NUMBER</span>
                <span>ACTION</span>
              </div>
              {(visible as Customer[]).map((c, i) => (
                <div className="data-row" key={c.id}>
                  <b className="serial">{(page - 1) * PAGE_SIZE + i + 1}</b>
                  <strong className="order-id">{c.name}</strong>
                  <span className="address-text">
                    {formatAddress(c.address)}
                  </span>
                  <span>{c.tinNumber || "—"}</span>
                  <span>{c.phoneNumber || "—"}</span>
                  <span>{c.whatsappNumber || "—"}</span>
                  <div className="row-actions">
                    <button onClick={() => setCustomerView(c)}>
                      <Eye />
                      View
                    </button>
                    <button onClick={() => setCustomerEdit(c)}>
                      <Pencil />
                      Edit
                    </button>
                    <button
                      className="danger-icon"
                      onClick={async () => {
                        if (confirm(`Delete customer ${c.name}?`)) {
                          try {
                            await request(`/customers/${c.id}`, {
                              method: "DELETE",
                            });
                            load();
                          } catch {
                            setToast({
                              type: "error",
                              message: "Customer with orders cannot be deleted",
                            });
                          }
                        }
                      }}
                    >
                      <Trash2 />
                       Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {!visible.length && (
          <div className="empty-state">
            <Box />
            <b>
              {view === "orders" ? "No orders available" : "No customers found"}
            </b>
            <span>
              {query || month
                ? "No records match the current search/filter."
                : "New records will appear here."}
            </span>
          </div>
        )}
        <Pagination page={page} pages={pages} setPage={setPage} />
      </section>
      {modifyOpen && (
        <ModifyOrder
          orders={orders}
          initial={selectedOrder}
          customers={customers}
          products={products}
          close={() => setModifyOpen(false)}
          changed={() => {
            load();
            setToast({
              type: "success",
              message: "Orders updated successfully",
            });
          }}
        />
      )}
      {customerView && (
        <CustomerDetailsModal
          customer={customerView}
          mode="view"
          close={() => setCustomerView(null)}
          saved={() => {}}
        />
      )}
      {customerEdit && (
        <CustomerDetailsModal
          customer={customerEdit}
          mode="edit"
          close={() => setCustomerEdit(null)}
          saved={() => {
            setCustomerEdit(null);
            load();
            setToast({
              type: "success",
              message: "Customer updated successfully",
            });
          }}
        />
      )}
      {exportOpen && (
        <OrderExportModal
          customers={customers}
          close={() => setExportOpen(false)}
          download={exportOrders}
        />
      )}
    </>
  );
}

type ExportFilter = "date" | "range" | "month" | "customer";

function OrderExportModal({
  customers,
  close,
  download,
}: {
  customers: Customer[];
  close: () => void;
  download: (params: URLSearchParams, fileName: string) => Promise<void>;
}) {
  const [filter, setFilter] = useState<ExportFilter>("date");
  const [date, setDate] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [downloading, setDownloading] = useState(false);

  async function submit() {
    const params = new URLSearchParams();
    let suffix = "orders";

    if (filter === "date") {
      if (!date) return alert("Please select a date.");
      params.set("date", date);
      suffix = date;
    } else if (filter === "range") {
      if (!from || !to) return alert("Please select Date From and Date To.");
      if (from > to) return alert("Date From cannot be after Date To.");
      params.set("from", from);
      params.set("to", to);
      suffix = `${from}-to-${to}`;
    } else if (filter === "month") {
      if (!selectedMonth) return alert("Please select a month.");
      params.set("month", selectedMonth);
      suffix = selectedMonth;
    } else {
      if (!customerId) return alert("Please select a customer.");
      params.set("customerId", customerId);
      const customer = customers.find((item) => item.id === Number(customerId));
      suffix = (customer?.name || "customer").replace(/[^a-z0-9]+/gi, "-");
    }

    setDownloading(true);
    try {
      await download(params, `order-details-${suffix}.xlsx`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="backdrop">
      <div className="modal order-export-dialog">
        <header>
          <div>
            <h2>Export Order Management</h2>
            <p>Select one filter and download the Excel sheet.</p>
          </div>
          <button className="modal-x" onClick={close} aria-label="Close">
            <X />
          </button>
        </header>

        <div className="export-filter-options">
          {([
            ["date", "Single Date"],
            ["range", "Date From / To"],
            ["month", "Month"],
            ["customer", "Customer"],
          ] as const).map(([value, label]) => (
            <label className={filter === value ? "active" : ""} key={value}>
              <input
                type="radio"
                name="export-filter"
                checked={filter === value}
                onChange={() => setFilter(value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <div className="export-filter-fields">
          {filter === "date" && (
            <label>
              <span>Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
          )}

          {filter === "range" && (
            <div className="export-date-range">
              <label>
                <span>Date From</span>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label>
                <span>Date To</span>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </label>
            </div>
          )}

          {filter === "month" && (
            <label>
              <span>Month</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </label>
          )}

          {filter === "customer" && (
            <label>
              <span>Customer</span>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Select customer</option>
                {[...customers]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((customer) => (
                    <option value={customer.id} key={customer.id}>
                      {customer.name}{customer.companyName ? ` — ${customer.companyName}` : ""}
                    </option>
                  ))}
              </select>
            </label>
          )}
        </div>

        <footer>
          <button onClick={close} disabled={downloading}>Cancel</button>
          <button className="primary" onClick={submit} disabled={downloading}>
            {downloading ? "Downloading..." : "Download Excel"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Pagination({
  page,
  pages,
  setPage,
}: {
  page: number;
  pages: number;
  setPage: (p: number) => void;
}) {
  const nums = Array.from(new Set([1, page - 1, page, page + 1, pages])).filter(
    (n) => n > 0 && n <= pages,
  );
  return (
    <div className="pagination order-pagination">
      <button disabled={page === 1} onClick={() => setPage(page - 1)}>
        <ChevronLeft />
        Prev
      </button>
      {nums.map((n, i) => (
        <span key={n}>
          {i > 0 && n - nums[i - 1] > 1 && <i>…</i>}
          <button
            className={n === page ? "active" : ""}
            onClick={() => setPage(n)}
          >
            {n}
          </button>
        </span>
      ))}
      <button disabled={page === pages} onClick={() => setPage(page + 1)}>
        Next
        <ChevronRight />
      </button>
    </div>
  );
}

function CustomerDetailsModal({
  customer,
  mode,
  close,
  saved,
}: {
  customer: Customer;
  mode: "view" | "edit";
  close: () => void;
  saved: () => void;
}) {
  const [form, setForm] = useState({ ...customer });
  const editable = mode === "edit";
  async function save() {
    try {
      await request(`/customers/${customer.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          companyName: form.companyName,
          address: form.address,
          tinNumber: form.tinNumber,
          phoneNumber: form.phoneNumber,
          whatsappNumber: form.whatsappNumber,
        }),
      });

      saved();
    } catch (error) {
      console.error("Customer update failed:", error);
      alert("Unable to update the customer.");
    }
  }
  const fields = [
    ["name", "Name"],
    ["companyName", "Company Name"],
    ["address", "Address"],
    ["tinNumber", "TIN Number"],
    ["phoneNumber", "Phone Number"],
    ["whatsappNumber", "WhatsApp Number"],
  ] as const;
  return (
    <div className="backdrop">
      <div className="modal customer-details-dialog">
        <header>
          <div>
            <h2>{editable ? "Edit Customer" : "View Customer"}</h2>
            <p>Customer full details</p>
          </div>
          <button className="modal-x" onClick={close} aria-label="Close">
            <X />
          </button>
        </header>
        <div className="customer-details-fields">
          {fields.map(([key, label]) => (
            <label key={key}>
              <span>{label}</span>
              {editable ? (
                key === "address" ? (
                  <textarea
                    value={form[key] || ""}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                  />
                ) : (
                  <input
                    value={form[key] || ""}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                  />
                )
              ) : (
                <div
                  className={`readonly-value ${key === "address" ? "address-value" : ""}`}
                >
                  {form[key] || "—"}
                </div>
              )}
            </label>
          ))}
        </div>
        <footer>
          <button onClick={close}>{editable ? "Cancel" : "Close"}</button>
          {editable && (
            <button className="primary" onClick={save}>
              <Save />
              Save
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function OrderPrint({ order }: { order: Order }) {
  return (
    <article className="order-print-sheet">
      <header className="order-print-header">
        <div>
          <h1>RENGAS BORONG</h1>
          <p>Order Details</p>
        </div>
        <b>{order.orderNo}</b>
      </header>
      <section>
        <p>
          <b>Customer:</b> {order.customer?.name}
        </p>
        <p>
          <b>Phone:</b> {order.customer?.phoneNumber || "—"}
        </p>
        <p>
          <b>Address:</b> {order.customer?.address || "—"}
        </p>
        <p>
          <b>TIN:</b> {order.customer?.tinNumber || "—"}
        </p>
        <p>
          <b>Date:</b> {order.orderDate}
        </p>
      </section>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>UOM</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i) => (
            <tr key={i.id}>
              <td>
                {i.product.code} — {i.product.description}
              </td>
              <td>{i.product.uom}</td>
              <td>{i.quantity}</td>
              <td>{money(Number(i.unitPrice))}</td>
              <td>{money(Number(i.quantity) * Number(i.unitPrice))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4}>Grand Total</td>
            <td>{money(total(order))}</td>
          </tr>
        </tfoot>
      </table>
    </article>
  );
}

function ModifyOrder({
  orders,
  initial,
  customers,
  products,
  close,
  changed,
}: {
  orders: Order[];
  initial: Order | null;
  customers: Customer[];
  products: Product[];
  close: () => void;
  changed: () => void;
}) {
  const [selected, setSelected] = useState<Order | null>(initial);

  const [draft, setDraft] = useState<Order | null>(
    initial
      ? {
          ...initial,
          items: initial.items.map((item) => ({ ...item })),
        }
      : null,
  );

  const [orderQuery, setOrderQuery] = useState("");
  const [removeOrders, setRemoveOrders] = useState<number[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [removeItems, setRemoveItems] = useState<number[]>([]);

  const shownOrders = orders.filter((order) =>
    [
      order.orderNo,
      order.customer?.name,
      order.customer?.phoneNumber,
    ]
      .join(" ")
      .toLowerCase()
      .includes(orderQuery.toLowerCase()),
  );

  const choose = (order: Order) => {
    setSelected(order);
    setDraft({
      ...order,
      items: order.items.map((item) => ({ ...item })),
    });
    setRemoveItems([]);
  };

  const deleteIds = async (ids: number[]) => {
    if (!ids.length) return;
    if (!confirm(`Remove ${ids.length} order${ids.length > 1 ? "s" : ""}?`)) return;

    await Promise.all(
      ids.map((id) => request(`/orders/${id}`, { method: "DELETE" })),
    );
    setRemoveOrders([]);
    if (selected && ids.includes(selected.id)) {
      setSelected(null);
      setDraft(null);
    }
    changed();
  };

  const matches = products
    .filter((product) =>
      [product.code, product.description]
        .join(" ")
        .toLowerCase()
        .includes(productQuery.toLowerCase()),
    )
    .slice(0, 6);

  async function save() {
    if (!draft) {
      return;
    }

    try {
      await request(`/orders/${draft.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          customerId: draft.customer.id,
          orderDate: draft.orderDate,
          status: draft.status,
          items: draft.items.map((item) => ({
            productId: item.product.id,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
          })),
        }),
      });

      changed();
      close();
    } catch (error) {
      console.error("Modify order failed:", error);
      alert("Unable to save the modified order.");
    }
  }

  return (
    <div className="backdrop">
      <div className="modal modify-order">
        <header>
          <div>
            <h2>Modify Order</h2>
            <p>
              Search an order, update its delivery status, and modify products.
            </p>
          </div>
          <button className="modal-x" onClick={close}>
            <X />
          </button>
        </header>
        {orders.length === 0 ? (
          <div className="modify-empty">
            <Box />
            <b>No orders available.</b>
            <span>No products found</span>
            <p>New orders will appear here when customers place an order.</p>
          </div>
        ) : (
          <div className="modify-body">
            <aside className="order-selector">
              <h3>
                <Search />
                Select Order
              </h3>
              <label className="selector-search">
                <Search />
                <input
                  value={orderQuery}
                  onChange={(e) => setOrderQuery(e.target.value)}
                  placeholder="Search order ID / customer / phone"
                />
              </label>
              <div className="select-order-list">
                {shownOrders.map((o) => (
                  <label key={o.id}>
                    <input
                      type="radio"
                      checked={selected?.id === o.id}
                      onChange={() => choose(o)}
                    />
                    <span>
                      <b>{o.orderNo}</b>
                      <small>
                        {o.customer?.name} • {o.orderDate}
                      </small>
                    </span>
                  </label>
                ))}
              </div>
              <div className="remove-orders">
                <h4>Remove Orders</h4>
                <button onClick={() => selected && deleteIds([selected.id])}>
                  <Trash2 />
                  Remove This Order
                </button>
                <div className="remove-order-list">
                  {orders.map((o) => (
                    <label key={o.id}>
                      <input
                        type="checkbox"
                        checked={removeOrders.includes(o.id)}
                        onChange={(e) =>
                          setRemoveOrders(
                            e.target.checked
                              ? [...removeOrders, o.id]
                              : removeOrders.filter((id) => id !== o.id),
                          )
                        }
                      />
                      <span>
                        <b>{o.orderNo}</b>
                        <small>{o.customer?.name}</small>
                      </span>
                    </label>
                  ))}
                </div>
                <button
                  disabled={!removeOrders.length}
                  onClick={() => deleteIds(removeOrders)}
                >
                  <Trash2 />
                  Remove Selected Orders
                </button>
              </div>
            </aside>
            <section>
              {!draft ? (
                <div className="modify-empty">
                  <Box />
                  <b>Select an order</b>
                  <p>Use the search list on the left.</p>
                </div>
              ) : (
                <>
                  <h3>
                    <Pencil />
                    Order Modify
                  </h3>
                  <div className="order-fields">
                    <label>
                      CUSTOMER
                      <select
                        value={draft.customer.id}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            customer: customers.find(
                              (c) => c.id === Number(e.target.value),
                            )!,
                          })
                        }
                      >
                        {customers.map((c) => (
                          <option value={c.id} key={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      PHONE
                      <input
                        value={draft.customer.phoneNumber || ""}
                        readOnly
                      />
                    </label>
                    <label>
                      DATE
                      <input
                        type="date"
                        value={draft.orderDate}
                        onChange={(e) =>
                          setDraft({ ...draft, orderDate: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      STATUS
                      <select
                        value={draft.status}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            status: e.target.value as Order["status"],
                          })
                        }
                      >
                        <option value="ACCEPTED">Accepted</option>
                        <option value="PACKED">Packed</option>
                        <option value="SHIPPED">Shipped</option>
                        <option value="DELIVERED">Delivered</option>
                      </select>
                    </label>
                  </div>
                  <label className="product-search">
                    <Search />
                    <input
                      value={productQuery}
                      onChange={(e) => setProductQuery(e.target.value)}
                      placeholder="Search product to add..."
                    />
                  </label>
                  {productQuery && (
                    <div className="product-results">
                      {matches.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            if (!draft.items.some((i) => i.product.id === p.id))
                              setDraft({
                                ...draft,
                                items: [
                                  ...draft.items,
                                  {
                                    id: -Date.now(),
                                    product: p,
                                    quantity: 1,
                                    unitPrice: p.price,
                                  },
                                ],
                              });
                            setProductQuery("");
                          }}
                        >
                          <Plus />
                          {p.code} — {p.description}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="modify-items">
                    <div className="modify-head">
                      <span></span>
                      <span>Product</span>
                      <span>UOM</span>
                      <span>Qty</span>
                      <span>Price</span>
                      <span>Action</span>
                    </div>
                    {draft.items.map((i, idx) => (
                      <div className="modify-item" key={i.id}>
                        <input
                          type="checkbox"
                          checked={removeItems.includes(i.id)}
                          onChange={(e) =>
                            setRemoveItems(
                              e.target.checked
                                ? [...removeItems, i.id]
                                : removeItems.filter((id) => id !== i.id),
                            )
                          }
                        />
                        <div>
                          <b>{i.product.code}</b>
                          <small>{i.product.description}</small>
                        </div>
                        <span>{i.product.uom}</span>
                        <input
                          type="number"
                          min=".01"
                          step=".01"
                          value={i.quantity}
                          onChange={(e) => {
                            const items = [...draft.items];
                            items[idx] = {
                              ...i,
                              quantity: Number(e.target.value),
                            };
                            setDraft({ ...draft, items });
                          }}
                        />
                        <span>{money(Number(i.unitPrice))}</span>
                        <button
                          onClick={() =>
                            setDraft({
                              ...draft,
                              items: draft.items.filter((x) => x.id !== i.id),
                            })
                          }
                        >
                          <Trash2 />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    className="remove-selected-products"
                    disabled={!removeItems.length}
                    onClick={() => {
                      setDraft({
                        ...draft,
                        items: draft.items.filter(
                          (i) => !removeItems.includes(i.id),
                        ),
                      });
                      setRemoveItems([]);
                    }}
                  >
                    <Trash2 />
                    Remove Selected Products
                  </button>
                </>
              )}
            </section>
          </div>
        )}
        <footer>
          <button onClick={close}>{orders.length ? "Cancel" : "Close"}</button>
          {orders.length > 0 && (
            <button className="primary" disabled={!draft} onClick={save}>
              Save Modified Order
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
