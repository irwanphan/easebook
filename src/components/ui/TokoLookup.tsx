import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { tokoControlClass } from "@/components/ui/TokoInput";

/**
 * Komponen lookup (combobox / searchable select) generik.
 *
 * Kapan dipakai dibandingkan `TokoSelect`:
 *  - Pakai `TokoSelect` (native `<select>`) bila daftar opsi pendek (< ~10) atau
 *    butuh perilaku native browser (mis. iOS picker).
 *  - Pakai `TokoLookup` bila daftar opsi panjang (puluhan/ratusan) dan user
 *    perlu mengetik untuk memfilter. Mendukung deskripsi sekunder per item,
 *    render kustom, dan navigasi keyboard (↑/↓/Enter/Esc).
 *
 * Komponen ini agnostik terhadap tipe data: cukup berikan accessor `getKey`,
 *  `getLabel`, dan optional `getDescription` / `renderItem` untuk mengontrol
 *  tampilan.
 *
 * Positioning: panel dropdown dirender lewat React Portal ke `document.body`
 *  dengan `position: fixed`, jadi tidak ter-clip oleh container ber-`overflow:
 *  hidden` (mis. Modal). Posisi otomatis flip ke atas bila ruang di bawah
 *  trigger tidak cukup.
 */

const labelMdClass = "block text-sm font-medium text-zinc-700";
const labelSmClass = "block text-xs font-medium text-zinc-600";
const hintClass = "mt-1 text-xs text-zinc-500";
const errorClass = "mt-1 text-xs text-red-600";

type LabelSize = "sm" | "md";

export type TokoLookupProps<T> = {
  /** Daftar opsi yang bisa dipilih. */
  options: T[];
  /** Kunci opsi yang sedang dipilih. Cocokkan dengan hasil `getKey`. */
  value: string | null | undefined;
  /** Accessor kunci unik per opsi (biasanya kode). */
  getKey: (option: T) => string;
  /** Accessor label utama (tampil di trigger & item dropdown). */
  getLabel: (option: T) => string;
  /** Accessor deskripsi sekunder (hanya tampil di item dropdown). */
  getDescription?: (option: T) => string | undefined;
  /** Filter custom. Default: substring case-insensitive ke label + description. */
  filter?: (option: T, query: string) => boolean;
  /** Render custom untuk item dropdown. Default: label + (opsional) description. */
  renderItem?: (
    option: T,
    ctx: { active: boolean; selected: boolean },
  ) => ReactNode;
  /** Render custom untuk nilai di trigger button. Default: `getLabel`. */
  renderValue?: (option: T) => ReactNode;
  /** Dipanggil saat user memilih. `null` = pilihan dikosongkan. */
  onChange: (option: T | null) => void;

  // Field meta
  label?: ReactNode;
  labelSize?: LabelSize;
  hint?: ReactNode;
  error?: ReactNode;
  wrapperClassName?: string;
  className?: string;

  // Behavior
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** Bila true, tampilkan ikon "X" untuk mengosongkan nilai. */
  clearable?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Tinggi maksimum daftar dalam piksel. Default 280. */
  maxListHeight?: number;
  id?: string;
  name?: string;
  required?: boolean;
};

const WIDTH_CLASS_RE = /\b(w-|max-w-|min-w-)/;

function mergeControlClassName(className: string, fullWidth: boolean): string {
  const useFullWidth = fullWidth && !WIDTH_CLASS_RE.test(className);
  return [tokoControlClass, useFullWidth ? "w-full" : "", className]
    .filter(Boolean)
    .join(" ");
}

function defaultFilter<T>(
  option: T,
  query: string,
  getLabel: (o: T) => string,
  getDescription?: (o: T) => string | undefined,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [getLabel(option), getDescription?.(option) ?? ""]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

type PanelPosition = {
  /** y koordinat tepi atas trigger (viewport). */
  triggerTop: number;
  /** y koordinat tepi bawah trigger (viewport). */
  triggerBottom: number;
  left: number;
  width: number;
  /** Tinggi viewport saat posisi dihitung. */
  viewportHeight: number;
  /** Flip ke atas trigger bila ruang di bawah tidak cukup. */
  flipAbove: boolean;
};

export function TokoLookup<T>({
  options,
  value,
  getKey,
  getLabel,
  getDescription,
  filter,
  renderItem,
  renderValue,
  onChange,
  label,
  labelSize = "md",
  hint,
  error,
  wrapperClassName = "",
  className = "",
  placeholder = "Pilih…",
  searchPlaceholder = "Cari…",
  emptyMessage = "Tidak ada hasil.",
  clearable = false,
  disabled = false,
  fullWidth = true,
  maxListHeight = 280,
  id,
  name,
  required,
}: TokoLookupProps<T>) {
  const autoId = useId();
  const hintId = useId();
  const errorId = useId();
  const listId = useId();
  const controlId = id ?? autoId;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelPos, setPanelPos] = useState<PanelPosition | null>(null);

  const selected = useMemo<T | null>(() => {
    if (value == null) return null;
    return options.find((o) => getKey(o) === value) ?? null;
  }, [options, value, getKey]);

  const filtered = useMemo<T[]>(() => {
    const fn = filter ?? ((o: T, q: string) => defaultFilter(o, q, getLabel, getDescription));
    return options.filter((o) => fn(o, query));
  }, [options, query, filter, getLabel, getDescription]);

  // Reset state setiap kali dropdown dibuka
  useEffect(() => {
    if (!open) return;
    setQuery("");
    // Aktifkan baris yang sedang dipilih (jika ada di daftar), else baris pertama
    const selKey = value;
    const idx = selKey != null ? options.findIndex((o) => getKey(o) === selKey) : -1;
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [open, value, options, getKey]);

  // Saat query berubah, reset active index ke 0
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Posisi panel: hitung saat open, dan saat resize/scroll → tutup.
  const computePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return null;
    const rect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    // ~ tinggi panel = search (~52px) + list (maxListHeight) + padding
    const estPanelHeight = maxListHeight + 60;
    const flipAbove = spaceBelow < estPanelHeight && spaceAbove > spaceBelow;
    return {
      triggerTop: rect.top,
      triggerBottom: rect.bottom,
      left: rect.left,
      width: rect.width,
      viewportHeight,
      flipAbove,
    } satisfies PanelPosition;
  }, [maxListHeight]);

  useLayoutEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }
    setPanelPos(computePosition());
  }, [open, computePosition]);

  useEffect(() => {
    if (!open) return;
    function handleScroll(e: Event) {
      // Tutup bila scroll di luar panel (mis. scroll halaman). Scroll di dalam
      // panel sendiri tidak menutup (mis. user scroll daftar opsi).
      if (panelRef.current && e.target instanceof Node && panelRef.current.contains(e.target)) {
        return;
      }
      setOpen(false);
    }
    function handleResize() {
      setOpen(false);
    }
    document.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [open]);

  // Klik di luar trigger + panel → tutup
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (triggerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Esc untuk tutup
  useEffect(() => {
    if (!open) return;
    function handleKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  // Auto-focus search saat panel siap
  useEffect(() => {
    if (open && panelPos) {
      const t = window.setTimeout(() => searchRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
  }, [open, panelPos]);

  // Scroll active item ke view
  useEffect(() => {
    if (!open) return;
    const list = panelRef.current?.querySelector<HTMLElement>(
      `[data-active-option="true"]`,
    );
    list?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, filtered]);

  function commitOption(option: T | null) {
    onChange(option);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleTriggerKeydown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  }

  function handleSearchKeydown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[activeIndex];
      if (opt) commitOption(opt);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(filtered.length - 1);
    }
  }

  const triggerLabel = selected ? (renderValue ? renderValue(selected) : getLabel(selected)) : null;

  return (
    <div className={wrapperClassName}>
      {label != null ? (
        <label htmlFor={controlId} className={labelSize === "sm" ? labelSmClass : labelMdClass}>
          {label}
        </label>
      ) : null}

      <div className={label != null ? "mt-1" : ""}>
        <button
          ref={triggerRef}
          id={controlId}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? listId : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          disabled={disabled}
          onClick={() => !disabled && setOpen((v) => !v)}
          onKeyDown={handleTriggerKeydown}
          className={`${mergeControlClassName(className, fullWidth)} flex items-center justify-between gap-2 cursor-pointer text-left`}
        >
          <span
            className={`min-w-0 flex-1 truncate ${
              selected ? "text-zinc-900" : "text-zinc-400"
            }`}
          >
            {selected ? triggerLabel : placeholder}
          </span>
          <div className="flex items-center gap-1">
            {clearable && selected && !disabled ? (
              <span
                role="button"
                tabIndex={-1}
                aria-label="Kosongkan pilihan"
                onClick={(e) => {
                  e.stopPropagation();
                  commitOption(null);
                }}
                className="flex h-5 w-5 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </span>
            ) : null}
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${
                open ? "rotate-180" : ""
              }`}
              aria-hidden
            />
          </div>
        </button>

        {/* Hidden input untuk integrasi form HTML (name + required) */}
        {name ? (
          <input
            type="hidden"
            name={name}
            value={value ?? ""}
            required={required}
            // disabled mengikuti agar form submission tidak terbaca saat disabled
            disabled={disabled}
          />
        ) : null}
      </div>

      {error ? (
        <p id={errorId} className={errorClass} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className={hintClass}>
          {hint}
        </p>
      ) : null}

      {open && panelPos
        ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-[1000] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl shadow-zinc-950/10"
              style={{
                ...(panelPos.flipAbove
                  ? { bottom: panelPos.viewportHeight - panelPos.triggerTop + 4 }
                  : { top: panelPos.triggerBottom + 4 }),
                left: panelPos.left,
                width: panelPos.width,
                minWidth: 240,
              }}
              role="presentation"
            >
              <div className="border-b border-zinc-100 bg-zinc-50/60 p-2">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400"
                    aria-hidden
                  />
                  <input
                    ref={searchRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleSearchKeydown}
                    placeholder={searchPlaceholder}
                    className="w-full rounded-lg border border-zinc-200 bg-white py-1.5 pl-8 pr-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    aria-autocomplete="list"
                    aria-controls={listId}
                  />
                </div>
              </div>

              <ul
                id={listId}
                role="listbox"
                className="overflow-y-auto py-1"
                style={{
                  maxHeight: Math.max(
                    120,
                    Math.min(
                      maxListHeight,
                      (panelPos.flipAbove
                        ? panelPos.triggerTop - 16
                        : panelPos.viewportHeight - panelPos.triggerBottom - 16) - 60,
                    ),
                  ),
                }}
              >
                {filtered.length === 0 ? (
                  <li className="px-3 py-6 text-center text-sm text-zinc-500">
                    {emptyMessage}
                  </li>
                ) : (
                  filtered.map((option, idx) => {
                    const key = getKey(option);
                    const isSelected = key === value;
                    const isActive = idx === activeIndex;
                    return (
                      <li
                        key={key}
                        role="option"
                        aria-selected={isSelected}
                        data-active-option={isActive ? "true" : undefined}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onMouseDown={(e) => {
                          // mousedown supaya tidak kalah race dengan blur → close
                          e.preventDefault();
                          commitOption(option);
                        }}
                        className={`flex cursor-pointer items-start gap-2 px-3 py-2 text-sm transition ${
                          isActive ? "bg-brand-50 text-brand-900" : "text-zinc-700"
                        } ${isSelected ? "font-semibold" : ""}`}
                      >
                        {renderItem ? (
                          renderItem(option, { active: isActive, selected: isSelected })
                        ) : (
                          <>
                            <div className="min-w-0 flex-1">
                              <div className="truncate">{getLabel(option)}</div>
                              {getDescription?.(option) ? (
                                <div className="mt-0.5 truncate text-xs font-normal text-zinc-500">
                                  {getDescription(option)}
                                </div>
                              ) : null}
                            </div>
                          </>
                        )}
                        {isSelected ? (
                          <Check
                            className="mt-0.5 h-4 w-4 shrink-0 text-brand-600"
                            aria-hidden
                          />
                        ) : null}
                      </li>
                    );
                  })
                )}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
