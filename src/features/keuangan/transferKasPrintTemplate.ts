import { buildPagedCss, pagedjsPolyfill } from "@/features/keuangan/printPaged";
import {
  buildSignatureBlockHtml,
  SIGNATURE_BLOCK_CSS,
  type SignatureColumn,
} from "@/features/keuangan/printSignature";
import { escapeHtml, wrapPrintableDocument } from "@/lib/print";
import {
  isPaperPaged,
  isReceiptPaper,
  paperSizeCss,
  type PaperSize,
} from "@/lib/paperSize";
import type { TransferKasDetail } from "@/data/transferKas";

const JUDUL_DOKUMEN = "Bukti transfer kas";

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
 * Bangun HTML dokumen print-ready untuk transfer antar kas / bank.
 *
 * Layout otomatis menyesuaikan ukuran kertas:
 * - Kertas paged (A4, Letter, ½ continuous): layout invoice (kotak Asal vs
 *   Tujuan + ringkasan nominal) + paged.js untuk header/footer berulang +
 *   page numbering + blok tanda tangan.
 * - Kertas thermal (58/80mm): receipt 1 kolom kompak, flow natural tanpa
 *   paged.js & tanpa blok tanda tangan.
 *
 * @param signatures Optional 2 kolom tanda tangan. Convention untuk transfer:
 *   penanggung jawab kas asal (yang menyerahkan) di kiri, penanggung jawab
 *   kas tujuan (yang menerima) di kanan.
 */
export function buildTransferKasPrintHtml(
  detail: TransferKasDetail,
  paperSize?: PaperSize,
  signatures?: SignatureColumn[],
): string {
  const receipt = paperSize ? isReceiptPaper(paperSize) : false;
  const paged = paperSize ? isPaperPaged(paperSize) : true;
  const usePagedJs = paged && !receipt;
  const showSignatures = !receipt && signatures && signatures.length > 0;

  const body = receipt
    ? buildReceiptBody(detail)
    : buildInvoiceBody(
        detail,
        !usePagedJs,
        showSignatures ? signatures : undefined,
      );

  let extraCss = TRANSFER_EXTRA_CSS;
  let inlineScripts: string[] | undefined;
  let printOn: "load" | "pagedjs-after-rendered" = "load";

  if (paperSize) {
    if (usePagedJs) {
      extraCss += buildPagedCss(
        paperSize,
        JUDUL_DOKUMEN,
        detail.nomor,
        formatTanggal(detail.tanggal),
        formatWaktuSekarang(),
      );
      inlineScripts = [pagedjsPolyfill];
      printOn = "pagedjs-after-rendered";
    } else {
      extraCss += paperSizeCss(paperSize);
    }
  }

  if (showSignatures) {
    extraCss += SIGNATURE_BLOCK_CSS;
  }

  return wrapPrintableDocument({
    title: `${JUDUL_DOKUMEN} ${detail.nomor}`,
    bodyHtml: body,
    extraCss,
    compact: receipt,
    inlineScripts,
    printOn,
  });
}

/**
 * CSS spesifik layout transfer — meniru detail page baru:
 * - `.detail-card`: kartu terkonsolidasi yang membungkus section
 *   "Kas asal → tujuan" + "Ringkasan nominal" dalam satu blok bertepi.
 * - `.section-header`: judul + deskripsi tiap section, dipisah hairline
 *   horizontal.
 * - `.kas-row`: 3 kolom (panel Asal | arrow | panel Tujuan). Tiap panel
 *   horizontal: role di kiri, info akun di kanan (mengikuti `KasPanel`
 *   versi UI yang pakai `justify-between`).
 * - `.summary-list`: dl style — tiap baris flex space-between (label kiri,
 *   nominal kanan). Baris terakhir (`grand-total`) diberi background
 *   subtle + font lebih besar.
 * - `.summary-akun-biaya`: note kecil ter-indent yang muncul tepat di
 *   bawah baris "Biaya transfer".
 */
const TRANSFER_EXTRA_CSS = `
  .detail-card {
    border: 1px solid #e4e4e7;
    border-radius: 3mm;
    padding: 5mm 6mm;
    margin: 4mm 0;
  }
  .detail-card .section-header h2 {
    margin: 0;
    font-size: 11pt;
    font-weight: 600;
    color: #18181b;
    text-transform: none;
    letter-spacing: 0;
  }
  .detail-card .section-header .section-desc {
    margin: 0.5mm 0 0;
    font-size: 8.5pt;
    color: #71717a;
  }
  .detail-card .section-header {
    padding-bottom: 3mm;
  }
  /* Section header berikutnya: garis tipis pemisah di atas. */
  .detail-card .summary-list .section-header,
  .detail-card .kas-row + .section-header {
    border-top: 1px solid #e4e4e7;
    padding-top: 5mm;
    margin-top: 0;
  }

  .detail-card .kas-row {
    display: grid;
    grid-template-columns: 1fr 14mm 1fr;
    gap: 4mm;
    padding: 3mm 1mm;
    border-top: 1px solid #f4f4f5;
    border-bottom: 1px solid #f4f4f5;
  }
  .detail-card .kas-panel {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4mm;
  }
  .detail-card .kas-role .role {
    font-size: 8pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #71717a;
  }
  .detail-card .kas-role .role-hint {
    font-size: 8.5pt;
    color: #71717a;
    margin-top: 0.5mm;
  }
  .detail-card .kas-akun {
    text-align: right;
    min-width: 0;
  }
  .detail-card .kas-akun .akun-nama {
    font-size: 10.5pt;
    font-weight: 600;
    color: #18181b;
    line-height: 1.3;
  }
  .detail-card .kas-akun .akun-kode {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 8.5pt;
    color: #71717a;
    margin-top: 0.5mm;
  }
  .detail-card .kas-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16pt;
    font-weight: 600;
    color: #a1a1aa;
  }

  .detail-card .summary-list {
    margin: 0;
    padding: 0;
  }
  .detail-card .summary-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 6mm;
    padding: 2.5mm 1mm;
    border-bottom: 1px solid #f4f4f5;
    font-size: 10pt;
  }
  .detail-card .summary-row dt {
    margin: 0;
    color: #3f3f46;
  }
  .detail-card .summary-row dd {
    margin: 0;
    font-weight: 600;
    color: #18181b;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .detail-card .summary-row.subtle dt,
  .detail-card .summary-row.subtle dd {
    color: #71717a;
    font-weight: 500;
  }
  .detail-card .summary-akun-biaya {
    padding: 1.5mm 1mm 2.5mm 4mm;
    font-size: 8.5pt;
    color: #52525b;
    border-bottom: 1px solid #f4f4f5;
  }
  .detail-card .summary-akun-biaya .mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 8.5pt;
    color: #3f3f46;
  }
  .detail-card .summary-row.grand-total {
    margin-top: 1mm;
    padding: 3mm 3mm;
    background: #fafafa;
    border-radius: 1.5mm;
    border-bottom: none;
  }
  .detail-card .summary-row.grand-total dt {
    font-weight: 600;
    color: #18181b;
  }
  .detail-card .summary-row.grand-total dd {
    font-size: 12pt;
    font-weight: 700;
    color: #18181b;
  }
`;

/**
 * Layout invoice untuk kertas A4 / Letter / continuous.
 *
 * Strukturnya meniru `TransferKasDetailPage`:
 * 1. Inline header (judul + nomor + tanggal) — hanya kalau paged.js OFF.
 *    Kalau paged.js ON, header dirender lewat @page margin boxes.
 * 2. `.grid` 2 kolom dengan info dasar (Tanggal / Dicatat pada / Catatan).
 * 3. `.detail-card` terkonsolidasi yang berisi:
 *    - Section "Kas asal → tujuan" — judul + deskripsi + panel Asal/Tujuan
 *      dengan arrow di tengah.
 *    - Section "Ringkasan nominal" — judul + deskripsi + list flex
 *      (dikirim − biaya = diterima), dengan note akun biaya tepat di bawah
 *      baris biaya.
 * 4. Blok tanda tangan (kalau diisi caller).
 */
function buildInvoiceBody(
  detail: TransferKasDetail,
  showInlineHeader: boolean,
  signatures?: SignatureColumn[],
): string {
  const inlineHeader = showInlineHeader
    ? `
    <div class="header">
      <h1 style="margin: 0;">${escapeHtml(JUDUL_DOKUMEN)}</h1>
      <p class="muted" style="margin: 0;">No. <span class="mono">${escapeHtml(detail.nomor)}</span> · ${escapeHtml(
        formatTanggal(detail.tanggal),
      )}</p>
    </div>
    `
    : "";

  const adaBiaya = detail.biayaTransfer > 0;

  const biayaRow = adaBiaya
    ? `
      <div class="summary-row subtle">
        <dt>Biaya transfer (admin / bank)</dt>
        <dd>− ${escapeHtml(formatRupiah(detail.biayaTransfer))}</dd>
      </div>
      <div class="summary-akun-biaya">
        Akun biaya:
        ${
          detail.akunBiayaKode
            ? `<span class="mono">${escapeHtml(detail.akunBiayaKode)}</span>${
                detail.akunBiayaNama
                  ? ` — ${escapeHtml(detail.akunBiayaNama)}`
                  : ""
              }`
            : `<em style="color:#a1a1aa;">tidak diset</em>`
        }
      </div>
    `
    : "";

  return `
    ${inlineHeader}
    <div class="grid">
      <div>
        <div class="label">Tanggal transfer</div>
        <div class="value">${escapeHtml(formatTanggal(detail.tanggal))}</div>
      </div>
      <div>
        <div class="label">Dicatat pada</div>
        <div class="value">${escapeHtml(formatWaktu(detail.createdAt))}</div>
        ${
          detail.updatedAt > detail.createdAt
            ? `<div class="muted">Diperbarui ${escapeHtml(formatWaktu(detail.updatedAt))}</div>`
            : ""
        }
      </div>
      ${
        detail.catatan.trim()
          ? `<div style="grid-column: span 2;">
              <div class="label">Catatan</div>
              <div class="value" style="white-space: pre-wrap;">${escapeHtml(detail.catatan)}</div>
            </div>`
          : ""
      }
    </div>

    <div class="detail-card">
      <div class="section-header">
        <h2>Kas asal → tujuan</h2>
        <p class="section-desc">Saldo dipindahkan antar rekening kas / bank.</p>
      </div>
      <div class="kas-row">
        <div class="kas-panel">
          <div class="kas-role">
            <div class="role">Kas asal</div>
            <div class="role-hint">Yang menyerahkan saldo</div>
          </div>
          <div class="kas-akun">
            <div class="akun-nama">${escapeHtml(detail.akunSumberNama || detail.akunSumberKode)}</div>
            <div class="akun-kode">${escapeHtml(detail.akunSumberKode)}</div>
          </div>
        </div>
        <div class="kas-arrow" aria-hidden="true">→</div>
        <div class="kas-panel">
          <div class="kas-role">
            <div class="role">Kas tujuan</div>
            <div class="role-hint">Yang menerima saldo</div>
          </div>
          <div class="kas-akun">
            <div class="akun-nama">${escapeHtml(detail.akunTujuanNama || detail.akunTujuanKode)}</div>
            <div class="akun-kode">${escapeHtml(detail.akunTujuanKode)}</div>
          </div>
        </div>
      </div>

      <div class="section-header" style="padding-top: 5mm; border-top: 1px solid #e4e4e7;">
        <h2>Ringkasan nominal</h2>
        <p class="section-desc">Selisih kirim &amp; terima dibebankan ke akun biaya admin / bank.</p>
      </div>
      <dl class="summary-list">
        <div class="summary-row">
          <dt>Nominal dikirim dari kas asal</dt>
          <dd>${escapeHtml(formatRupiah(detail.nominalKirim))}</dd>
        </div>
        ${biayaRow}
        <div class="summary-row grand-total">
          <dt>Nominal diterima di kas tujuan</dt>
          <dd>${escapeHtml(formatRupiah(detail.nominalTerima))}</dd>
        </div>
      </dl>
    </div>

    ${signatures ? buildSignatureBlockHtml(signatures) : ""}
  `;
}

/** Layout receipt 1 kolom untuk thermal printer 58/80mm. */
function buildReceiptBody(detail: TransferKasDetail): string {
  const adaBiaya = detail.biayaTransfer > 0;
  return `
    <div style="text-align: center; border-bottom: 1px dashed #18181b; padding-bottom: 4px; margin-bottom: 6px;">
      <strong style="font-size: 13px;">${escapeHtml(JUDUL_DOKUMEN)}</strong>
      <div class="mono">${escapeHtml(detail.nomor)}</div>
      <div class="muted" style="font-size: 10px;">${escapeHtml(formatTanggal(detail.tanggal))}</div>
    </div>

    <div style="margin-bottom: 6px;">
      <div><span class="muted">Kas asal:</span></div>
      <div><strong>${escapeHtml(detail.akunSumberNama || detail.akunSumberKode)}</strong></div>
      <div class="mono muted" style="font-size: 10px;">${escapeHtml(detail.akunSumberKode)}</div>
    </div>

    <div style="text-align: center; font-size: 14px; margin: 2px 0;">↓</div>

    <div style="margin-bottom: 6px;">
      <div><span class="muted">Kas tujuan:</span></div>
      <div><strong>${escapeHtml(detail.akunTujuanNama || detail.akunTujuanKode)}</strong></div>
      <div class="mono muted" style="font-size: 10px;">${escapeHtml(detail.akunTujuanKode)}</div>
    </div>

    <table style="font-size: 11px;">
      <tbody>
        <tr>
          <td style="padding: 2px;">Dikirim</td>
          <td style="padding: 2px;" class="num">${escapeHtml(formatRupiah(detail.nominalKirim))}</td>
        </tr>
        ${
          adaBiaya
            ? `<tr>
                <td style="padding: 2px;">Biaya</td>
                <td style="padding: 2px;" class="num">− ${escapeHtml(formatRupiah(detail.biayaTransfer))}</td>
              </tr>`
            : ""
        }
      </tbody>
      <tfoot>
        <tr>
          <td style="padding: 4px 2px; border-top: 1px dashed #18181b;"><strong>Diterima</strong></td>
          <td style="padding: 4px 2px; border-top: 1px dashed #18181b;" class="num"><strong>${escapeHtml(formatRupiah(detail.nominalTerima))}</strong></td>
        </tr>
      </tfoot>
    </table>

    ${
      adaBiaya && detail.akunBiayaKode
        ? `<div style="margin-top: 4px; font-size: 10px;">
            <span class="muted">Akun biaya: </span>
            <span class="mono">${escapeHtml(detail.akunBiayaKode)}</span>
            ${detail.akunBiayaNama ? ` · ${escapeHtml(detail.akunBiayaNama)}` : ""}
          </div>`
        : ""
    }

    ${
      detail.catatan.trim()
        ? `<div style="margin-top: 6px; border-top: 1px dashed #d4d4d8; padding-top: 4px; font-size: 11px; white-space: pre-wrap;">
            <span class="muted">Catatan: </span>${escapeHtml(detail.catatan)}
          </div>`
        : ""
    }
  `;
}
