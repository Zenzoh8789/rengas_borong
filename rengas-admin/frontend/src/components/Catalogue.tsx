import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { CalendarDays, FileText, RefreshCw, Search } from "lucide-react";
import { API } from "../api/client";
import type { Category, ToastState } from "../types";
import { Modal } from "./Modal";
type DateFieldProps = {
  label: string;
  value: string;
  onChange: (isoDate: string) => void;
};

const DISPLAY_DATE = /^\d{2}\/\d{2}\/\d{4}$/;

function isoToDisplay(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function displayToIso(value: string) {
  if (!DISPLAY_DATE.test(value)) return "";
  const [day, month, year] = value.split("/").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "";
  }
  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function formatDateTyping(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function DateField({ label, value, onChange }: DateFieldProps) {
  const [display, setDisplay] = useState(() => isoToDisplay(value));
  const pickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDisplay(isoToDisplay(value)), [value]);

  function updateDisplay(event: ChangeEvent<HTMLInputElement>) {
    const next = formatDateTyping(event.target.value);
    setDisplay(next);
    onChange(next.length === 10 ? displayToIso(next) : "");
  }

  function openPicker() {
    const picker = pickerRef.current;
    if (!picker) return;
    picker.showPicker();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && event.altKey) openPicker();
  }

  return (
    <label className="catalogue-date-label">
      <span>{label}</span>
      <div className="catalogue-date-field">
        <CalendarDays aria-hidden="true" />
        <input
          type="text"
          value={display}
          onChange={updateDisplay}
          onKeyDown={handleKeyDown}
          placeholder="DD/MM/YYYY"
          inputMode="numeric"
          maxLength={10}
          aria-label={`${label} date, DD/MM/YYYY`}
        />
        <button
          type="button"
          className="catalogue-calendar-button"
          onClick={openPicker}
          aria-label={`Choose ${label.toLowerCase()} date`}
        >
          <CalendarDays aria-hidden="true" />
        </button>
        <input
          ref={pickerRef}
          className="catalogue-native-picker"
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
    </label>
  );
}

export function Catalogue({
  categories,
  close,
  setToast,
}: {
  categories: Category[];
  close: () => void;
  setToast: (toast: ToastState) => void;
}) {
  const [title, setTitle] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number[]>(
    categories.map((category) => category.id),
  );
  const [generating, setGenerating] = useState(false);
  const shown = categories.filter((category) =>
    category.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const allSelected =
    categories.length > 0 && selected.length === categories.length;

  function toggleCategory(id: number) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    );
  }

async function generateCatalogue() {
  if (
    !title.trim() ||
    !from ||
    !to ||
    !selected.length
  ) {
    setToast({
      type: "error",
      message:
        "Enter a title, valid date range and select categories",
    });

    return;
  }

  if (from > to) {
    setToast({
      type: "error",
      message:
        "From date must be before To date",
    });

    return;
  }

  setGenerating(true);

  try {
    // Let the browser receive the PDF stream directly. The previous fetch +
    // Blob flow waited for the entire (potentially hundreds-page) PDF and kept
    // a second full copy in browser memory before showing the download.
    const params = new URLSearchParams({
      title: title.trim(),
      from,
      to,
      categoryIds: selected.join(","),
    });
    const link = document.createElement("a");
    link.href = `${API}/catalogues/download?${params.toString()}`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();

    setToast({
      type: "success",
      message: `Catalogue "${title.trim()}" download started`,
    });

    close();
  } catch (error) {
    setToast({
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "Catalogue generation failed",
    });
  } finally {
    setGenerating(false);
  }
}

  return (
    <Modal
      title="Generate Catalogue"
      onClose={close}
    >
      <div className="modal-body catalogue-form">
        <label className="catalogue-title-label">
          <span>TITLE</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Enter catalogue title"
          />
        </label>

        <div className="catalogue-date-grid">
          <DateField label="FROM" value={from} onChange={setFrom} />
          <DateField label="TO" value={to} onChange={setTo} />
        </div>

        <section className="catalogue-categories">
          <div className="catalogue-search">
            <Search aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search category..."
              aria-label="Search categories"
            />
            <span>{selected.length} selected</span>
          </div>

          <label className="catalogue-check catalogue-check-all">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() =>
                setSelected(
                  allSelected ? [] : categories.map((category) => category.id),
                )
              }
            />
            <span>All Categories</span>
          </label>

          <div className="catalogue-category-grid">
            {shown.map((category) => (
              <label className="catalogue-check" key={category.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(category.id)}
                  onChange={() => toggleCategory(category.id)}
                />
                <span>{category.name}</span>
                <i>{category.products?.length ?? 0}</i>
              </label>
            ))}
          </div>

          {shown.length === 0 && (
            <p className="catalogue-empty">No categories found.</p>
          )}
        </section>
      </div>

      <footer className="catalogue-footer">
        <button type="button" onClick={close}>
          Cancel
        </button>
        <button
          type="button"
          className="primary"
          disabled={generating}
          onClick={generateCatalogue}
        >
          {generating ? (
            <RefreshCw className="spin" aria-hidden="true" />
          ) : (
            <FileText aria-hidden="true" />
          )}
          {generating ? "Generating PDF..." : "Generate Catalogue"}
        </button>
      </footer>
    </Modal>
  );
}
