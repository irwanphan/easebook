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
 * CSS spesifik layout transfer (Asal vs Tujuan + ringkasan nominal).
 * - `.transfer-arrows`: panel 2 kolom yang menampilkan kas asal & tujuan
 *   dengan tanda panah di tengah.
 * - `.summary-table`: tabel kanan-rata untuk daftar nominal.
 */
const TRANSFER_EXTRA_CSS = `
  .transfer-arrows {
    display: grid;
    grid-template-columns: 1fr 16mm 1fr;
    align-items: stretch;
    gap: 0;
    margin: 4mm 0 6mm;
    border: 1px solid #d4d4d8;
    border-radius: 2mm;
    overflow: hidden;
  }
  .transfer-arrows .col {
    padding: 4mm 5mm;
    background: #fafafa;
  }
  .transfer-arrows .col + .arrow + .col {
    border-left: 1px dashed #d4d4d8;
  }
  .transfer-arrows .arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18pt;
    font-weight: 700;
    color: #a1a1aa;
    background: #ffffff;
    border-left: 1px dashed #d4d4d8;
    border-right: 1px dashed #d4d4d8;
  }
  .transfer-arrows .role {
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #71717a;
    margin-bottom: 1mm;
  }
  .transfer-arrows .akun-nama {
    font-weight: 600;
    font-size: 11pt;
    color: #18181b;
    line-height: 1.3;
  }
  .transfer-arrows .akun-kode {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 9pt;
    color: #71717a;
    margin-top: 1mm;
  }
  .summary-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 2mm;
  }
  .summary-table th,
  .summary-table td {
    padding: 2mm 3mm;
    font-size: 10pt;
    border-bottom: 1px dashed #e4e4e7;
  }
  .summary-table th {
    text-align: left;
    font-weight: 500;
    color: #52525b;
    width: 50%;
  }
  .summary-table td {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .summary-table tr.grand-total th,
  .summary-table tr.grand-total td {
    border-bottom: none;
    border-top: 1px solid #18181b;
    padding-top: 3mm;
    font-weight: 700;
    font-size: 11pt;
    color: #18181b;
  }
  .summary-table tr.subtle td {
    color: #71717a;
  }
`;

/**
 * Layout invoice untuk kertas A4 / Letter / continuous.
 *
 * - `showInlineHeader=true` saat paged.js NOT aktif: header inline di body.
 * - `showInlineHeader=false` saat paged.js aktif: header dipindah ke
 *   @page margin boxes (lihat `buildPagedCss`).
 * - `signatures`: kalau diisi, blok tanda tangan dirender setelah ringkasan.
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
  const akunBiayaLine =
    adaBiaya && detail.akunBiayaKode
      ? `<div class="muted" style="font-size: 9pt; margin-top: 1mm;">
          Akun biaya:
          <span class="mono">${escapeHtml(detail.akunBiayaKode)}</span>
          ${detail.akunBiayaNama ? ` · ${escapeHtml(detail.akunBiayaNama)}` : ""}
        </div>`
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

    <div class="transfer-arrows">
      <div class="col">
        <div class="role">Kas asal</div>
        <div class="akun-nama">${escapeHtml(detail.akunSumberNama || detail.akunSumberKode)}</div>
        <div class="akun-kode">${escapeHtml(detail.akunSumberKode)}</div>
      </div>
      <div class="arrow" aria-hidden="true">→</div>
      <div class="col">
        <div class="role">Kas tujuan</div>
        <div class="akun-nama">${escapeHtml(detail.akunTujuanNama || detail.akunTujuanKode)}</div>
        <div class="akun-kode">${escapeHtml(detail.akunTujuanKode)}</div>
      </div>
    </div>

    <h2>Ringkasan nominal</h2>
    <table class="summary-table">
      <tbody>
        <tr>
          <th>Nominal dikirim dari kas asal</th>
          <td>${escapeHtml(formatRupiah(detail.nominalKirim))}</td>
        </tr>
        ${
          adaBiaya
            ? `<tr class="subtle">
                <th>Biaya transfer (admin / bank)</th>
                <td>− ${escapeHtml(formatRupiah(detail.biayaTransfer))}</td>
              </tr>`
            : ""
        }
        <tr class="grand-total">
          <th>Nominal diterima di kas tujuan</th>
          <td>${escapeHtml(formatRupiah(detail.nominalTerima))}</td>
        </tr>
      </tbody>
    </table>
    ${akunBiayaLine}

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
