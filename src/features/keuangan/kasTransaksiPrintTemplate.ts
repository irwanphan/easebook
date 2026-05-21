import type {
  KasTransaksiDetailData,
  KasTransaksiDetailVariant,
} from "@/features/keuangan/KasTransaksiDetailView";
import { escapeHtml, wrapPrintableDocument } from "@/lib/print";
import {
  isPaperPaged,
  isReceiptPaper,
  paperSizeCss,
  paperSizeToDimensions,
  paperSizeValue,
  type PaperSize,
} from "@/lib/paperSize";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatTanggal(iso: string) {
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatWaktu(ts: number) {
  const d = new Date(ts * 1000);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatWaktuSekarang() {
  return new Date().toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * CSS + HTML untuk header/footer berulang per halaman pada kertas paged
 * (A4, Letter, ½ continuous).
 *
 * Strategi: `<thead>` wrapping table (untuk header) + `position: fixed`
 * (untuk footer).
 *
 * KENAPA TIDAK `@page` margin boxes:
 * Chromium issue 24913 — margin box sering di-drop diam-diam.
 *
 * KENAPA HEADER PAKAI `<thead>` REPEAT, BUKAN `position: fixed`:
 * - `position: fixed top: 0` muncul di SETIAP halaman di posisi yang sama,
 *   TAPI konten di halaman 2+ tetap mengalir dari atas page area → tertimpa
 *   oleh fixed header (background putih cuma "menutupi" konten, secara
 *   visual masih terpotong).
 * - `<thead>` (dengan `display: table-header-group`) DI-REPEAT browser di
 *   setiap halaman, dan konten setelahnya mengalir di BAWAH thead pada
 *   tiap halaman — tidak ada overlap. Ini behavior table HTML standar yang
 *   well-supported di semua browser.
 *
 * KENAPA FOOTER MASIH `position: fixed` (bukan `<tfoot>`):
 * - `<tfoot>` di Chrome cuma muncul di akhir tabel (halaman terakhir),
 *   tidak repeat seperti `<thead>`. Untuk footer berulang di setiap halaman
 *   harus pakai cara lain.
 * - `position: fixed bottom: 0` cukup reliable untuk footer karena konten
 *   biasanya tidak meluap sampai paling bawah (ada padding-bottom di
 *   `.page-content`). Background putih jaga visual tetap clean.
 *
 * Page numbering (`Halaman X dari Y`):
 * Tetap tidak bisa via mekanisme di atas. User bisa centang "Print headers
 * and footers" di dialog print Chrome — Chrome akan tambah page number
 * natif.
 */
function buildPagedHeaderFooterCss(paperSize: PaperSize): string {
  const sizeValue = paperSizeValue(paperSize);

  return `
    @page {
      size: ${sizeValue};
      /* Setting "Margins" di dialog print Chrome yang pegang kendali utama.
         @bottom-right hanya bonus — kalau Chrome merender margin box, user
         dapat "Hal X / Y" otomatis di pojok kanan bawah. Kalau tidak
         (Chrome bug 24913), .print-page-total di .print-footer (di-update JS)
         tetap menampilkan total halaman. */
      @bottom-right {
        content: "Hal " counter(page) " / " counter(pages);
        font-size: 8pt;
        color: #a1a1aa;
      }
    }

    /* Outer table — di screen tetap visible (preview), di print thead-nya
       di-repeat per halaman oleh browser. */
    .page-table {
      width: 100%;
      border-collapse: collapse;
    }
    /* Reset border global (dari wrapPrintableDocument) di sel-sel outer. */
    .page-table > thead > tr > td,
    .page-table > tbody > tr > td {
      padding: 0;
      border: none;
      background: transparent;
    }

    .print-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8mm;
      padding: 4mm 14mm 4mm;
      font-size: 9pt;
      color: #3f3f46;
      background: #ffffff;
      border-bottom: 0.4pt solid #d4d4d8;
    }
    .print-header-judul {
      font-weight: 600;
      font-size: 10pt;
    }
    .print-header-ref {
      color: #71717a;
    }

    .print-footer {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8mm;
      padding: 3mm 14mm 4mm;
      font-size: 8pt;
      color: #71717a;
      background: #ffffff;
      border-top: 0.4pt solid #e4e4e7;
    }

    /* Footer auto dari wrapPrintableDocument redundan saat .print-footer aktif. */
    .footer { display: none; }

    @media print {
      body { padding: 0; margin: 0; }
      .actions { display: none; }

      /* Aktifkan thead repeat per halaman. */
      .page-table thead { display: table-header-group; }

      /* PENTING: izinkan tbody row outer table untuk dipecah antar halaman.
         Base CSS dari wrapPrintableDocument set 'tr { page-break-inside: avoid; }'
         yang akan memaksa seluruh konten ke 1 halaman — kalau tidak muat,
         Chrome akan men-skip halaman 1 dan pindahkan semua ke halaman 2.
         Untuk outer tbody row, kita izinkan break supaya konten mengisi dari
         halaman 1 secara natural. */
      .page-table > tbody > tr,
      .page-table > tbody > tr > td {
        page-break-inside: auto;
      }

      /* Footer ditempel di bawah tiap halaman saat print. */
      .print-footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 9999;
      }

      /* Konten utama: padding kiri/kanan + bottom (kasih jarak ke fixed
         footer). Tidak butuh padding-top karena thead sudah tepat di atasnya. */
      .page-content {
        padding: 6mm 14mm 16mm;
      }
    }
  `;
}

/** Render <header class="print-header"> untuk paged layout. */
function buildPrintHeaderHtml(detail: KasTransaksiDetailData, judulDokumen: string): string {
  return `
    <header class="print-header">
      <span class="print-header-judul">${escapeHtml(judulDokumen)}</span>
      <span class="print-header-ref">No. ${escapeHtml(detail.nomor)} · ${escapeHtml(
        formatTanggal(detail.tanggal),
      )}</span>
    </header>
  `;
}

/** Render <footer class="print-footer"> untuk paged layout. */
function buildPrintFooterHtml(): string {
  return `
    <footer class="print-footer">
      <span>Dicetak dari EasyBook · ${escapeHtml(formatWaktuSekarang())}</span>
      <span>Total <span class="print-page-total">—</span> halaman</span>
    </footer>
  `;
}

/**
 * Bangun `<script>` yang menghitung perkiraan total halaman cetak lalu
 * meng-update teks di `.print-page-total`.
 *
 * Algoritma:
 * - Ambil tinggi body (`scrollHeight`) saat dokumen ter-layout.
 * - Bagi dengan tinggi konten per halaman (paperHeight - asumsi margin Chrome ~20mm).
 * - Round up jadi total halaman.
 *
 * Akurasi: bergantung pada setting Margins di Chrome. Default kira-kira pas;
 * "None" akan over-estimate dikit; "Custom" bisa lebih jauh. Tetap lebih
 * informatif daripada tidak ada angka sama sekali.
 *
 * Di-jalankan saat `load` dan `beforeprint` supaya angka up-to-date sebelum
 * dialog cetak terbuka.
 */
function buildPagedScript(paperSize: PaperSize): string {
  const { heightMm } = paperSizeToDimensions(paperSize);
  if (heightMm === "auto") return "";

  return `
    <script>
      (function () {
        var pageHeightMm = ${heightMm};
        var pxPerMm = 96 / 25.4;
        var marginAllowanceMm = 20; // perkiraan margin Chrome default (top+bottom)
        function update() {
          var totalHeightPx = document.body.scrollHeight;
          var perPagePx = (pageHeightMm - marginAllowanceMm) * pxPerMm;
          var total = Math.max(1, Math.ceil(totalHeightPx / perPagePx));
          var nodes = document.getElementsByClassName('print-page-total');
          for (var i = 0; i < nodes.length; i++) nodes[i].textContent = String(total);
        }
        if (document.readyState === 'complete') update();
        else window.addEventListener('load', update);
        window.addEventListener('beforeprint', update);
      })();
    </script>
  `;
}

/**
 * Bangun HTML dokumen print-ready untuk transaksi kas (penerimaan/pengeluaran).
 * Layout otomatis menyesuaikan ukuran kertas:
 * - Kertas normal (A4, Letter, ½ continuous): invoice-style 2 kolom
 * - Kertas sempit (nota thermal 58/80mm): receipt-style 1 kolom kompak
 *
 * Tidak bergantung Tailwind — pakai CSS inline dari `wrapPrintableDocument`.
 */
export function buildKasTransaksiPrintHtml(
  detail: KasTransaksiDetailData,
  variant: KasTransaksiDetailVariant,
  judulDokumen: string,
  paperSize?: PaperSize,
): string {
  const receipt = paperSize ? isReceiptPaper(paperSize) : false;
  const paged = paperSize ? isPaperPaged(paperSize) : true;
  // Margin boxes @page hanya cocok untuk kertas paged & non-thermal.
  // Thermal/continuous tidak punya konsep "halaman" jadi pakai footer di-body.
  const useMarginBoxes = paged && !receipt;

  const body = receipt
    ? buildReceiptBody(detail, variant, judulDokumen)
    : buildInvoiceBody(detail, variant, judulDokumen, useMarginBoxes);

  // Untuk paged non-thermal: ada wrap table thead-repeat + position:fixed footer
  // (CSS dari buildPagedHeaderFooterCss). Untuk thermal/continuous: cukup
  // paperSizeCss (footer mengalir natural di body).
  let extraCss = "";
  let bodyHtml = body;
  if (paperSize) {
    if (useMarginBoxes) {
      extraCss = buildPagedHeaderFooterCss(paperSize);
      bodyHtml = `${body}${buildPagedScript(paperSize)}`;
    } else {
      extraCss = paperSizeCss(paperSize);
    }
  }

  return wrapPrintableDocument({
    title: `${judulDokumen} ${detail.nomor}`,
    bodyHtml,
    extraCss,
    compact: receipt,
  });
}

/**
 * Layout invoice (2 kolom) untuk kertas A4 / Letter / continuous.
 *
 * Kalau `useMarginBoxes=true`:
 * - Konten dibungkus `<table class="page-table">` dengan `<thead>` yang
 *   berisi `.print-header`. Browser akan repeat `<thead>` di setiap halaman
 *   saat tabel melewati page break — konten halaman 2+ mengalir natural di
 *   bawah thead, tidak ada overlap.
 * - Setelah tabel, tempel `<footer class="print-footer">` yang via CSS
 *   `@media print` di-set `position: fixed; bottom: 0`.
 * - Header inline di body dihilangkan supaya tidak dobel dengan
 *   `.print-header` di thead.
 */
function buildInvoiceBody(
  detail: KasTransaksiDetailData,
  variant: KasTransaksiDetailVariant,
  judulDokumen: string,
  useMarginBoxes: boolean,
): string {
  const baris = detail.lines
    .map(
      (line) => `
      <tr>
        <td style="border: 1px solid #d4d4d8;">
          <div><strong>${escapeHtml(line.akunNama || line.akunKode)}</strong></div>
          <div class="mono muted">${escapeHtml(line.akunKode)}</div>
        </td>
        <td>${line.catatan ? escapeHtml(line.catatan) : "—"}</td>
        <td class="num">${escapeHtml(formatRupiah(line.jumlah))}</td>
      </tr>`,
    )
    .join("");

  const inlineHeader = useMarginBoxes
    ? ""
    : `
    <div class="header">
      <h1 style="margin: 0;">${escapeHtml(judulDokumen)}</h1>
      <p class="muted" style="margin: 0;">No. bukti <span class="mono">${escapeHtml(detail.nomor)}</span> · ${escapeHtml(
        formatTanggal(detail.tanggal),
      )}</p>
    </div>
    `;

  const inner = `
    <div class="grid">
      <div>
        <div class="label">${escapeHtml(variant.kasLabel)}</div>
        <div class="value">${escapeHtml(detail.akunKasNama || detail.akunKasKode)}</div>
        <div class="mono muted">${escapeHtml(detail.akunKasKode)}</div>
      </div>
      <!-- <div>
        <div class="label">Total</div>
        <div class="value total">${escapeHtml(formatRupiah(detail.total))}</div>
        <div class="muted">${detail.lines.length} baris akun</div>
      </div>
      <div>
        <div class="label">Tanggal transaksi</div>
        <div class="value">${escapeHtml(formatTanggal(detail.tanggal))}</div>
      </div> -->
      
      <div>
        <div class="label">Dicatat pada</div>
        <div class="value">${escapeHtml(formatWaktu(detail.createdAt))}</div>
        ${
          detail.updatedAt > detail.createdAt
            ? `<div class="muted">Diperbarui ${escapeHtml(formatWaktu(detail.updatedAt))}</div>`
            : ""
        }
      </div>
      <!-- <div style="grid-column: span 2;">
        <div class="label">Pengaruh jurnal</div>
        <div class="value">${escapeHtml(variant.arahJurnal)}</div>
      </div> -->
      ${
        detail.catatan.trim()
          ? `<div style="grid-column: span 2;">
              <div class="label">Catatan</div>
              <div class="value" style="white-space: pre-wrap;">${escapeHtml(detail.catatan)}</div>
            </div>`
          : ""
      }
    </div>

    <h2>${escapeHtml(variant.baristTitle)}</h2>
    <table style="border: 1px solid #d4d4d8;">
      <thead>
        <tr>
          <th>${escapeHtml(variant.akunBarisLabel)}</th>
          <th>Catatan baris</th>
          <th class="num">Jumlah</th>
        </tr>
      </thead>
      <tbody>
        ${baris || `<tr><td colspan="3" style="text-align:center; color:#71717a;">Tidak ada baris.</td></tr>`}
      </tbody>
      ${
        detail.lines.length > 0
          ? `<tfoot>
              <tr>
                <td colspan="2" class="num">Total</td>
                <td class="num">${escapeHtml(formatRupiah(detail.total))}</td>
              </tr>
            </tfoot>`
          : ""
      }
    </table>
  `;

  if (useMarginBoxes) {
    // Header dibungkus <thead> outer table (browser repeat di tiap halaman).
    // Footer tetap position:fixed bottom:0 (lihat buildPagedHeaderFooterCss).
    return `
      <table class="page-table">
        <thead>
          <tr><td>
            ${buildPrintHeaderHtml(detail, judulDokumen)}
          </td></tr>
        </thead>
        <tbody>
          <tr><td>
            <div class="page-content">
              ${inner}
            </div>
          </td></tr>
        </tbody>
      </table>
      ${buildPrintFooterHtml()}
    `;
  }

  return `
    ${inlineHeader}
    ${inner}
  `;
}

/** Layout receipt 1 kolom untuk thermal printer 58/80mm. */
function buildReceiptBody(
  detail: KasTransaksiDetailData,
  variant: KasTransaksiDetailVariant,
  judulDokumen: string,
): string {
  const baris = detail.lines
    .map(
      (line) => `
      <tr>
        <td>
          <div><strong>${escapeHtml(line.akunNama || line.akunKode)}</strong></div>
          ${
            line.catatan
              ? `<div class="muted" style="font-size: 10px;">${escapeHtml(line.catatan)}</div>`
              : ""
          }
        </td>
        <td class="num">${escapeHtml(formatRupiah(line.jumlah))}</td>
      </tr>`,
    )
    .join("");

  return `
    <div style="text-align: center; border-bottom: 1px dashed #18181b; padding-bottom: 4px; margin-bottom: 6px;">
      <strong style="font-size: 13px;">${escapeHtml(judulDokumen)}</strong>
      <div class="mono">${escapeHtml(detail.nomor)}</div>
      <div class="muted" style="font-size: 10px;">${escapeHtml(formatTanggal(detail.tanggal))}</div>
    </div>

    <div style="margin-bottom: 6px;">
      <div><span class="muted">${escapeHtml(variant.kasLabel)}:</span></div>
      <div><strong>${escapeHtml(detail.akunKasNama || detail.akunKasKode)}</strong></div>
      <div class="mono muted" style="font-size: 10px;">${escapeHtml(detail.akunKasKode)}</div>
    </div>

    <table style="font-size: 11px;">
      <thead>
        <tr>
          <th style="padding: 4px 2px;">${escapeHtml(variant.akunBarisLabel)}</th>
          <th class="num" style="padding: 4px 2px;">Jumlah</th>
        </tr>
      </thead>
      <tbody>
        ${baris || `<tr><td colspan="2" style="text-align:center;">—</td></tr>`}
      </tbody>
      <tfoot>
        <tr>
          <td style="padding: 4px 2px;" class="num"><strong>Total</strong></td>
          <td style="padding: 4px 2px;" class="num"><strong>${escapeHtml(formatRupiah(detail.total))}</strong></td>
        </tr>
      </tfoot>
    </table>

    ${
      detail.catatan.trim()
        ? `<div style="margin-top: 6px; border-top: 1px dashed #d4d4d8; padding-top: 4px; font-size: 11px; white-space: pre-wrap;">
            <span class="muted">Catatan: </span>${escapeHtml(detail.catatan)}
          </div>`
        : ""
    }
  `;
  // Footer "Dicetak dari EasyBook · DATE" otomatis ditambahkan oleh
  // wrapPrintableDocument dan akan stick ke bawah halaman (margin-top: auto).
}
