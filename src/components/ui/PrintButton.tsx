import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Printer, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { printHtmlInBrowser } from "@/lib/print";
import {
  DEFAULT_PAPER_SIZES,
  buildCustomPaperSize,
  formatPaperDimensionsLabel,
  paperSizeToDimensions,
  type PaperSize,
  type PaperSizeOption,
} from "@/lib/paperSize";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type CommonProps = {
  label?: string;
  className?: string;
  variant?: ButtonVariant;
  ariaLabel?: string;
};

/**
 * Mode "window": panggil `window.print()` langsung pada window aktif.
 * Tidak reliabel di Tauri 2 build macOS (WKWebView). Pakai untuk halaman simpel
 * yang tidak terlalu kritikal kalau gagal dicetak.
 */
type WindowModeProps = CommonProps & {
  mode?: "window";
};

/**
 * Mode "browser": kirim HTML hasil `htmlBuilder` ke temp file lalu buka di
 * browser default. Browser yang handle dialog cetak (reliabel cross-platform).
 *
 * Bisa ditambah dropdown pilihan ukuran kertas dengan `paperSizes`.
 */
type BrowserModeProps = CommonProps & {
  mode: "browser";
  htmlBuilder: (opts: { paperSize: PaperSize }) => string | Promise<string>;
  filenameHint: string;
  onError?: (message: string) => void;
  /** Daftar preset ukuran kertas. Default: `DEFAULT_PAPER_SIZES`. Kirim `[]` untuk sembunyikan dropdown. */
  paperSizes?: PaperSizeOption[];
  /** ID preset default yang dipilih saat halaman pertama dibuka. Default: id pertama. */
  defaultPaperSizeId?: string;
  /** Tampilkan opsi ukuran kustom (mm × mm). Default: true. */
  allowCustom?: boolean;
};

type PrintButtonProps = WindowModeProps | BrowserModeProps;

/**
 * Tombol cetak reusable. Sembunyikan dirinya saat halaman sedang dicetak
 * (`print:hidden`) sehingga aman dipakai di area yang juga ikut dicetak.
 *
 * Untuk mode `browser` + `paperSizes`, jadi split-button:
 * - Tombol utama: cetak dengan ukuran yang sedang dipilih
 * - Tombol panah: buka menu ukuran kertas + input custom
 */
export function PrintButton(props: PrintButtonProps) {
  if (props.mode === "browser") {
    return <BrowserPrintButton {...props} />;
  }
  return <WindowPrintButton {...(props as WindowModeProps)} />;
}

function WindowPrintButton({
  label = "Cetak",
  className = "",
  variant = "ghost",
  ariaLabel,
}: WindowModeProps) {
  return (
    <Button
      type="button"
      variant={variant}
      onClick={() => window.print()}
      aria-label={ariaLabel ?? `Cetak ${label.toLowerCase()}`}
      className={`print:hidden ${className}`}
    >
      <Printer className="h-4 w-4" aria-hidden />
      {label}
    </Button>
  );
}

function BrowserPrintButton({
  label = "Cetak",
  className = "",
  variant = "ghost",
  ariaLabel,
  htmlBuilder,
  filenameHint,
  onError,
  paperSizes = DEFAULT_PAPER_SIZES,
  defaultPaperSizeId,
  allowCustom = true,
}: BrowserModeProps) {
  const menuId = useId();
  const hasMenu = paperSizes.length > 0 || allowCustom;

  const initialOption = paperSizes.find((o) => o.id === defaultPaperSizeId) ?? paperSizes[0] ?? null;
  const [selectedOption, setSelectedOption] = useState<PaperSizeOption | null>(initialOption);
  const [customSize, setCustomSize] = useState<PaperSize | null>(null);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sumber kebenaran ukuran yang sedang dipakai untuk cetak.
  const activeSize: PaperSize = customSize ?? selectedOption?.paperSize ?? { kind: "preset", preset: "A4" };
  const activeLabel = customSize
    ? `Custom ${formatPaperDimensionsLabel(customSize)}`
    : selectedOption?.label ?? "Cetak";

  const triggerPrint = useCallback(
    async (size: PaperSize) => {
      setMenuOpen(false);
      setCustomMode(false);
      setBusy(true);
      try {
        const html = await htmlBuilder({ paperSize: size });
        await printHtmlInBrowser(html, filenameHint);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (onError) {
          onError(message);
        } else {
          console.error("[PrintButton] gagal membuka dokumen cetak:", message);
          window.alert(`Gagal membuka dokumen cetak.\n${message}`);
        }
      } finally {
        setBusy(false);
      }
    },
    [filenameHint, htmlBuilder, onError],
  );

  // Klik di luar menu / Escape → tutup.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointer(ev: MouseEvent | TouchEvent) {
      if (!containerRef.current) return;
      if (containerRef.current.contains(ev.target as Node)) return;
      setMenuOpen(false);
      setCustomMode(false);
    }
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") {
        setMenuOpen(false);
        setCustomMode(false);
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const mainLabel = busy ? "Menyiapkan…" : label;
  const titleAttr = `${label} (${activeLabel})`;

  if (!hasMenu) {
    return (
      <Button
        type="button"
        variant={variant}
        onClick={() => void triggerPrint(activeSize)}
        disabled={busy}
        aria-label={ariaLabel ?? `Cetak ${label.toLowerCase()}`}
        className={`print:hidden ${className}`}
        title={titleAttr}
      >
        <Printer className="h-4 w-4" aria-hidden />
        {mainLabel}
      </Button>
    );
  }

  return (
    <div ref={containerRef} className={`relative print:hidden ${className}`}>
      <div className="inline-flex rounded-lg shadow-sm border border-zinc-200 bg-white" role="group">
        <Button
          type="button"
          variant={variant}
          onClick={() => void triggerPrint(activeSize)}
          disabled={busy}
          aria-label={ariaLabel ?? `${label} dengan ukuran ${activeLabel}`}
          className="rounded-r-none shadow-none border-r border-zinc-200"
          title={titleAttr}
        >
          <Printer className="h-4 w-4" aria-hidden />
          {mainLabel}
        </Button>
        <Button
          type="button"
          variant={variant}
          onClick={() => setMenuOpen((v) => !v)}
          disabled={busy}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label="Pilih ukuran kertas"
          className="rounded-l-none border-l border-zinc-200/40 shadow-none"
        >
          <ChevronDown className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      {menuOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Pilihan ukuran kertas"
          className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg"
        >
          <div className="border-b border-zinc-100 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Ukuran kertas</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Sedang aktif:&nbsp;<span className="font-medium text-zinc-700">{activeLabel}</span>
            </p>
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {paperSizes.map((opt) => {
              const isActive = !customSize && selectedOption?.id === opt.id;
              return (
                <li key={opt.id}>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={isActive}
                    className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition hover:bg-zinc-50 ${
                      isActive ? "bg-brand-50/60 text-brand-800" : "text-zinc-700"
                    }`}
                    onClick={() => {
                      setSelectedOption(opt);
                      setCustomSize(null);
                      void triggerPrint(opt.paperSize);
                    }}
                  >
                    <Check
                      className={`mt-0.5 h-4 w-4 shrink-0 ${isActive ? "text-brand-600" : "text-transparent"}`}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{opt.label}</span>
                      <span className="block text-xs text-zinc-500">{opt.description}</span>
                    </span>
                  </button>
                </li>
              );
            })}
            {allowCustom ? (
              <li className="border-t border-zinc-100">
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                  onClick={() => setCustomMode((v) => !v)}
                  aria-expanded={customMode}
                >
                  <Settings2 className="h-4 w-4 text-zinc-500" aria-hidden />
                  Ukuran kustom (mm)
                  <ChevronDown
                    className={`ml-auto h-4 w-4 text-zinc-400 transition-transform ${customMode ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </button>
                {customMode ? (
                  <CustomPaperSizeForm
                    initial={customSize}
                    onCancel={() => setCustomMode(false)}
                    onApply={(size) => {
                      setCustomSize(size);
                      setSelectedOption(null);
                      void triggerPrint(size);
                    }}
                  />
                ) : null}
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

type CustomPaperSizeFormProps = {
  initial: PaperSize | null;
  onCancel: () => void;
  onApply: (size: PaperSize) => void;
};

function CustomPaperSizeForm({ initial, onCancel, onApply }: CustomPaperSizeFormProps) {
  const initDim = initial ? paperSizeToDimensions(initial) : { widthMm: 210, heightMm: 297 as number | "auto" };
  const [width, setWidth] = useState(String(initDim.widthMm));
  const [autoHeight, setAutoHeight] = useState(initDim.heightMm === "auto");
  const [height, setHeight] = useState(initDim.heightMm === "auto" ? "" : String(initDim.heightMm));
  const [err, setErr] = useState<string | null>(null);

  function submit() {
    const w = parseFloat(width.replace(",", "."));
    const h = autoHeight ? "auto" : parseFloat(height.replace(",", "."));
    const result = buildCustomPaperSize(w, h as number | "auto");
    if ("error" in result) {
      setErr(result.error);
      return;
    }
    setErr(null);
    onApply(result);
  }

  return (
    <div className="border-t border-zinc-100 bg-zinc-50/50 px-3 py-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          Lebar (mm)
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            max="1000"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          Tinggi (mm)
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            max="2000"
            disabled={autoHeight}
            value={autoHeight ? "" : height}
            onChange={(e) => setHeight(e.target.value)}
            placeholder={autoHeight ? "auto" : ""}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-zinc-100 disabled:text-zinc-400"
          />
        </label>
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs text-zinc-600">
        <input
          type="checkbox"
          checked={autoHeight}
          onChange={(e) => setAutoHeight(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
        />
        Tinggi auto (untuk continuous / thermal roll)
      </label>
      {err ? <p className="mt-2 text-xs text-rose-600">{err}</p> : null}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={submit}
          className="rounded-md bg-brand-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          Pakai & cetak
        </button>
      </div>
    </div>
  );
}
