import { invoke } from "@tauri-apps/api/core";
import { tauriErrorMessage } from "@/lib/tauriError";

/**
 * Kirim `html` ke backend Rust → ditulis ke temp file → dibuka di browser default.
 * Browser default selalu punya dialog cetak nativenya, jadi pendekatan ini lebih
 * reliabel daripada `window.print()` di Tauri 2 macOS (WKWebView).
 *
 * `filenameHint` dipakai untuk nama file (tab title + nama default "Save as PDF").
 * Cukup karakter bebas — backend akan menyaring ke karakter aman.
 *
 * Throw `Error` dengan pesan ramah kalau backend menolak (mis. permission).
 */
export async function printHtmlInBrowser(html: string, filenameHint: string): Promise<void> {
  try {
    await invoke<string>("print_open_html", { html, filenameHint });
  } catch (e) {
    throw new Error(tauriErrorMessage(e));
  }
}

/**
 * Dokumen HTML print-ready yang berdiri sendiri — CSS inline minimal,
 * font system, tabel/header siap cetak. Pakai bersama `printHtmlInBrowser`.
 *
 * - `bodyHtml`: konten inti (sudah dalam markup HTML aman).
 * - `title`: muncul di tab browser dan nama default "Save as PDF".
 * - `extraCss`: ditambahkan setelah CSS bawaan. Untuk paged docs, biasanya
 *   berisi `@page { size: ...; margin: ...; @top-left { ... } ... }`.
 * - `compact`: memperkecil padding/font untuk kertas thermal/nota.
 * - `inlineScripts`: konten script (TANPA tag `<script>`) yang di-inline di body.
 *   Dipakai mis. untuk paged.js polyfill.
 * - `printOn`: event yang memicu auto-print. Default `"load"`. Pakai
 *   `"pagedjs-after-rendered"` saat menyertakan paged.js polyfill di
 *   `inlineScripts`, supaya print menunggu paged.js selesai paginate.
 *
 * Catatan pagedj.s: kalau `printOn === "pagedjs-after-rendered"`, kita JUGA
 * sembunyikan `.actions` & `.footer` default karena paged.js akan mengambil
 * alih body dan me-render preview paginated-nya sendiri (action button &
 * footer default jadi tidak relevan).
 */
export function wrapPrintableDocument(opts: {
  title: string;
  bodyHtml: string;
  extraCss?: string;
  compact?: boolean;
  inlineScripts?: string[];
  printOn?: "load" | "pagedjs-after-rendered";
}): string {
  const {
    title,
    bodyHtml,
    extraCss = "",
    compact = false,
    inlineScripts = [],
    printOn = "load",
  } = opts;
  const bodyPadding = compact ? "0 0" : "8px 12px";
  const baseFontSize = compact ? "10px" : "12px";

  const inlineScriptTags = inlineScripts
    .map((s) => `<script>${s}</script>`)
    .join("\n");

  // Trigger print:
  // - `load`: tunggu window load (dokumen biasa).
  // - `pagedjs-after-rendered`: paged.js polyfill auto-run saat DOM ready,
  //   menggunakan `window.PagedConfig.after` sebagai callback ketika paginasi
  //   selesai. Config HARUS di-set sebelum polyfill di-load → kita inject di
  //   `<head>`. Trigger di body tidak perlu.
  //
  // Bonus: di `after` kita juga inject banner reminder Chrome Scale = 100.
  // Banner muncul di preview (di belakang dialog print, terlihat kalau user
  // close/cancel dialog), dan otomatis hidden di @media print sehingga
  // TIDAK ikut tercetak di kertas. Tujuannya membantu user yang punya
  // Chrome Scale ≠ 100 sticky di preferensi mereka — tanpa edukasi ini,
  // mereka sering bingung kenapa hasil terpotong dan menyalahkan layoutnya.
  const headTriggerScript =
    printOn === "pagedjs-after-rendered"
      ? `<script>
          window.PagedConfig = window.PagedConfig || {};
          window.PagedConfig.after = function () {
            try {
              var banner = document.createElement("aside");
              banner.className = "print-scale-reminder";
              banner.innerHTML =
                'Tip: kalau hasil cetak terpotong di kanan/bawah, ubah ' +
                '<strong>Scale</strong> menjadi <strong>"Fit to page width"</strong> ' +
                '(atau angka 100) di dialog Cetak. Chrome akan mengingat ' +
                'preferensi ini untuk dokumen berikutnya.';
              document.body.insertBefore(banner, document.body.firstChild);
            } catch (_) { /* non-fatal */ }
            setTimeout(function () { window.print(); }, 350);
          };
        </script>`
      : "";

  const bodyTriggerScript =
    printOn === "load"
      ? `<script>
          window.addEventListener("load", function () {
            setTimeout(function () { window.print(); }, 250);
          });
        </script>`
      : "";

  // Saat paged.js aktif, sembunyikan .actions/.footer default — paged.js akan
  // me-render preview paginated yang berdiri sendiri, .actions/.footer default
  // jadi noise.
  //
  // Banner `.print-scale-reminder` (di-inject via PagedConfig.after) di-style
  // jadi fixed di top dengan high z-index sehingga muncul di atas paged.js
  // preview pages. Di-hidden saat @media print supaya tidak ikut tercetak.
  const pagedjsHideStyle =
    printOn === "pagedjs-after-rendered"
      ? `
        .actions, .footer { display: none !important; }
        .print-scale-reminder {
          position: fixed;
          top: 12px;
          left: 12px;
          right: 12px;
          z-index: 2147483647;
          background: #fef3c7;
          color: #78350f;
          border: 1px solid #f59e0b;
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 13px;
          line-height: 1.45;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .print-scale-reminder strong { color: #451a03; }
        @media print {
          .print-scale-reminder { display: none !important; }
        }
      `
      : "";

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
${headTriggerScript}
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: ${bodyPadding};
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
      Arial, "Noto Sans", sans-serif;
    color: #18181b;
    background: #ffffff;
    font-size: ${baseFontSize};
    line-height: 1.5;
  }
  h1 { font-size: 18px; margin: 0 0 4px; font-weight: 700; letter-spacing: -0.01em; }
  h2 { font-size: 12px; margin: 12px 0 4px; font-weight: 600; }
  .muted { color: #71717a; font-size: 12px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
  .header { border-bottom: 1px solid #e4e4e7; padding-bottom: 4px; margin-bottom: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
  .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #71717a; }
  .value { margin-top: 2px; }
  .total { font-size: 18px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { padding: 2px 4px; border-bottom: 1px solid #e4e4e7; text-align: left; vertical-align: top; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #52525b; background: #fafafa; }
  td.num, th.num { text-align: right; }
  tfoot td { border-top: 2px solid #18181b; border-bottom: none; font-weight: 700; background: #fafafa; }
  .footer { margin-top: 24px; padding-top: 8px; border-top: 1px dashed #d4d4d8; font-size: 11px; color: #71717a; }
  .actions { margin-bottom: 16px; }
  .actions button {
    appearance: none; border: 1px solid #d4d4d8; background: #fafafa; color: #18181b;
    padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
  }
  .actions button:hover { background: #f4f4f5; }
  @media print {
    body { padding: 0; }
    .actions { display: none; }
    tr { page-break-inside: avoid; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
  }
  ${pagedjsHideStyle}
  /* CSS dari pemanggil — @page rules, dll. */
  ${extraCss}
</style>
</head>
<body>
  <div class="actions">
    <button type="button" onclick="window.print()">Cetak / Save as PDF</button>
  </div>
  ${bodyHtml}
  <p class="footer">Dicetak dari EasyBook · ${new Date().toLocaleString("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
  })}</p>
  ${inlineScriptTags}
  ${bodyTriggerScript}
</body>
</html>`;
}

/** Escape teks untuk dimasukkan aman ke dalam HTML/attribute. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
