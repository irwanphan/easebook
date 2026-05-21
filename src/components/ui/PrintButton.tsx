import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { printHtmlInBrowser } from "@/lib/print";

type CommonProps = {
  label?: string;
  className?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  ariaLabel?: string;
};

/**
 * Mode "window": panggil `window.print()` langsung pada window aktif.
 * Cocok untuk dev dan halaman sederhana — tapi tidak reliabel di Tauri 2 build
 * macOS (WKWebView). Untuk dokumen penting, pakai mode "browser".
 */
type WindowModeProps = CommonProps & {
  mode?: "window";
};

/**
 * Mode "browser": minta caller menyediakan `htmlBuilder` yang menghasilkan
 * dokumen HTML siap cetak. Dokumen ditulis ke temp file dan dibuka di browser
 * default user → dialog cetak browser dipakai. Reliabel cross-platform.
 */
type BrowserModeProps = CommonProps & {
  mode: "browser";
  htmlBuilder: () => string | Promise<string>;
  filenameHint: string;
  onError?: (message: string) => void;
};

type PrintButtonProps = WindowModeProps | BrowserModeProps;

/**
 * Tombol cetak reusable. Sembunyikan dirinya saat halaman sedang dicetak
 * (`print:hidden`) sehingga aman dipakai di area yang juga ikut dicetak.
 */
export function PrintButton(props: PrintButtonProps) {
  const { label = "Cetak", className = "", variant = "outline", ariaLabel } = props;
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (props.mode === "browser") {
      setBusy(true);
      try {
        const html = await props.htmlBuilder();
        await printHtmlInBrowser(html, props.filenameHint);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (props.onError) {
          props.onError(message);
        } else {
          console.error("[PrintButton] gagal membuka dokumen cetak:", message);
          window.alert(`Gagal membuka dokumen cetak.\n${message}`);
        }
      } finally {
        setBusy(false);
      }
      return;
    }
    window.print();
  }

  return (
    <Button
      type="button"
      variant={variant}
      onClick={handleClick}
      disabled={busy}
      aria-label={ariaLabel ?? `Cetak ${label.toLowerCase()}`}
      className={`print:hidden ${className}`}
    >
      <Printer className="h-4 w-4" aria-hidden />
      {busy ? "Menyiapkan…" : label}
    </Button>
  );
}
