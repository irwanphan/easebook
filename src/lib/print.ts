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
 * `bodyHtml` adalah konten inti (sudah dalam markup HTML aman).
 * `title` muncul di tab browser dan nama default "Save as PDF".
 */
export function wrapPrintableDocument(opts: { title: string; bodyHtml: string }): string {
  const { title, bodyHtml } = opts;
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px 32px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
      Arial, "Noto Sans", sans-serif;
    color: #18181b;
    background: #ffffff;
    font-size: 13px;
    line-height: 1.5;
  }
  h1 { font-size: 20px; margin: 0 0 4px; font-weight: 700; letter-spacing: -0.01em; }
  h2 { font-size: 14px; margin: 24px 0 8px; font-weight: 600; }
  .muted { color: #71717a; font-size: 12px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
  .header { border-bottom: 1px solid #e4e4e7; padding-bottom: 12px; margin-bottom: 16px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
  .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #71717a; }
  .value { margin-top: 2px; }
  .total { font-size: 18px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { padding: 8px 10px; border-bottom: 1px solid #e4e4e7; text-align: left; vertical-align: top; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #52525b; background: #fafafa; }
  td.num, th.num { text-align: right; }
  tfoot td { border-top: 2px solid #18181b; border-bottom: none; font-weight: 700; background: #fafafa; }
  .footer { margin-top: 24px; padding-top: 12px; border-top: 1px dashed #d4d4d8; font-size: 11px; color: #71717a; }
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
  <script>
    // Auto-trigger print preview saat halaman siap. User bisa close tanpa cetak
    // kalau hanya mau lihat.
    window.addEventListener("load", () => {
      setTimeout(() => window.print(), 250);
    });
  </script>
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
