import { buildPagedCss, pagedjsPolyfill } from "@/features/keuangan/printPaged";
import {
  buildSignatureBlockHtml,
  SIGNATURE_BLOCK_CSS,
  type SignatureColumn,
  type SignatureMode,
} from "@/features/keuangan/printSignature";
import { escapeHtml, wrapPrintableDocument } from "@/lib/print";
import {
  isPaperPaged,
  isReceiptPaper,
  paperSizeCss,
  type PaperSize,
} from "@/lib/paperSize";

/**
 * Shape data pelunasan (hutang atau piutang) untuk keperluan print.
 * Bentuknya generic — dipakai untuk dua jenis pelunasan dengan label
 * yang dibedakan di `PelunasanPrintConfig`.
 */
export type PelunasanPrintData = {
  nomor: string;
  tanggal: string;
  /** Kode pemasok/pelanggan. */
  pihakKode: string;
  /** Nama pemasok/pelanggan. */
  pihakNama: string;
  akunKasKode: string;
  akunKasNama: string;
  total: number;
  catatan: string;
  createdAt: number;
  faktur: Array<{
    fakturNomor: string;
    tanggalFaktur: string;
    jatuhTempo: string;
    jumlah: number;
  }>;
};

/**
 * Label & teks per jenis pelunasan (hutang vs piutang).
 * Pemanggil isi sesuai konteksnya.
 */
export type PelunasanPrintConfig = {
  /** Judul dokumen, mis. "Bukti pembayaran hutang" / "Kuitansi pelunasan piutang". */
  judulDokumen: string;
  /** Label kolom pihak eksternal, mis. "Pemasok" / "Pelanggan". */
  pihakLabel: string;
  /** Label kolom kas, mis. "Dibayar dari kas" / "Diterima ke kas". */
  kasLabel: string;
  /** Judul section tabel faktur, mis. "Faktur pembelian yang dilunasi". */
  fakturTitle: string;
  /** Label kolom nomor faktur, mis. "No. faktur pembelian" / "No. faktur penjualan". */
  fakturNomorLabel: string;
  /** Optional blok tanda tangan untuk serah-terima uang. */
  signatures?: SignatureColumn[];
  /**
   * Mode signature. Default `"tanda-tangan"` (~47mm) untuk dokumen formal.
   * Pakai `"paraf"` (~31mm) supaya signature lebih kompak & seluruh dokumen
   * muat di satu halaman.
   */
  signatureMode?: SignatureMode;
};

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
 * Bangun HTML dokumen print-ready untuk transaksi pelunasan
 * (hutang ke pemasok / piutang dari pelanggan).
 *
 * Layout otomatis menyesuaikan ukuran kertas:
 * - Kertas paged (A4, Letter, ½ continuous): invoice 2 kolom + paged.js untuk
 *   header/footer berulang + page numbering + blok tanda tangan.
 * - Kertas thermal (58/80mm): receipt 1 kolom kompak, flow natural tanpa
 *   paged.js & tanpa blok tanda tangan.
 */
export function buildPelunasanPrintHtml(
  data: PelunasanPrintData,
  config: PelunasanPrintConfig,
  paperSize?: PaperSize,
): string {
  const receipt = paperSize ? isReceiptPaper(paperSize) : false;
  const paged = paperSize ? isPaperPaged(paperSize) : true;
  const usePagedJs = paged && !receipt;
  const showSignatures =
    !receipt && config.signatures && config.signatures.length > 0;

  const body = receipt
    ? buildReceiptBody(data, config)
    : buildInvoiceBody(
        data,
        config,
        !usePagedJs,
        showSignatures ? config.signatures : undefined,
      );

  let extraCss = "";
  let inlineScripts: string[] | undefined;
  let printOn: "load" | "pagedjs-after-rendered" = "load";

  if (paperSize) {
    if (usePagedJs) {
      extraCss = buildPagedCss(
        paperSize,
        config.judulDokumen,
        data.nomor,
        formatTanggal(data.tanggal),
        formatWaktuSekarang(),
      );
      inlineScripts = [pagedjsPolyfill];
      printOn = "pagedjs-after-rendered";
    } else {
      extraCss = paperSizeCss(paperSize);
    }
  }

  if (showSignatures) {
    extraCss += SIGNATURE_BLOCK_CSS;
  }

  return wrapPrintableDocument({
    title: `${config.judulDokumen} ${data.nomor}`,
    bodyHtml: body,
    extraCss,
    compact: receipt,
    inlineScripts,
    printOn,
  });
}

/**
 * Layout invoice (2 kolom) untuk kertas A4/Letter/continuous.
 *
 * - `showInlineHeader=true` saat paged.js NOT aktif: header inline di body.
 * - `showInlineHeader=false` saat paged.js aktif: header di @page margin boxes.
 * - `signatures`: kalau diisi, blok tanda tangan dirender setelah tabel.
 */
function buildInvoiceBody(
  data: PelunasanPrintData,
  config: PelunasanPrintConfig,
  showInlineHeader: boolean,
  signatures?: SignatureColumn[],
): string {
  const baris = data.faktur
    .map(
      (f) => `
      <tr>
        <td class="mono">${escapeHtml(f.fakturNomor)}</td>
        <td>${escapeHtml(formatTanggal(f.tanggalFaktur))}</td>
        <td>${escapeHtml(formatTanggal(f.jatuhTempo))}</td>
        <td class="num">${escapeHtml(formatRupiah(f.jumlah))}</td>
      </tr>`,
    )
    .join("");

  const inlineHeader = showInlineHeader
    ? `
    <div class="header">
      <h1 style="margin: 0;">${escapeHtml(config.judulDokumen)}</h1>
      <p class="muted" style="margin: 0;">No. <span class="mono">${escapeHtml(data.nomor)}</span> · ${escapeHtml(
        formatTanggal(data.tanggal),
      )}</p>
    </div>
    `
    : "";

  return `
    ${inlineHeader}
    <div class="grid">
      <div class="flex">
        <span class="label">${escapeHtml(config.pihakLabel)}: </span>
        <!-- <span class="mono">${escapeHtml(data.pihakKode)}</span> -->
        ${data.pihakNama ? `<span class="mono"> — ${escapeHtml(data.pihakNama)}</span>` : ""}
      </div>
      <div class="flex">
        <span class="label">${escapeHtml(config.kasLabel)}: </span>
        <!-- <span class="mono">${escapeHtml(data.akunKasKode)}</span> -->
        ${data.akunKasNama ? `<span class="mono"> — ${escapeHtml(data.akunKasNama)}</span>` : ""}
      </div>
      <div class="flex">
        <span class="label">Dicatat pada: </span>
        <span class="mono">${escapeHtml(formatWaktu(data.createdAt))}</span>
      </div>
      <div class="flex">
        <span class="label">Total pelunasan: </span>
        <span class="mono">${escapeHtml(formatRupiah(data.total))}</span>
        <span class="muted"> (${data.faktur.length} faktur)</span>
      </div>
      ${
        data.catatan.trim()
          ? `<div style="grid-column: span 2;">
              <div class="label">Catatan</div>
              <div class="value" style="white-space: pre-wrap;">${escapeHtml(data.catatan)}</div>
            </div>`
          : ""
      }
    </div>

    <h2>${escapeHtml(config.fakturTitle)}</h2>
    <table style="border: 1px solid #d4d4d8;">
      <thead>
        <tr>
          <th>${escapeHtml(config.fakturNomorLabel)}</th>
          <th>Tanggal faktur</th>
          <th>Jatuh tempo</th>
          <th class="num">Jumlah dilunasi</th>
        </tr>
      </thead>
      <tbody>
        ${baris || `<tr><td colspan="4" style="text-align:center; color:#71717a;">Tidak ada faktur.</td></tr>`}
      </tbody>
      ${
        data.faktur.length > 0
          ? `<tfoot>
              <tr>
                <td colspan="3" class="num">Total</td>
                <td class="num">${escapeHtml(formatRupiah(data.total))}</td>
              </tr>
            </tfoot>`
          : ""
      }
    </table>

    ${signatures ? buildSignatureBlockHtml(signatures, { mode: config.signatureMode }) : ""}
  `;
}

/** Layout receipt 1 kolom untuk thermal printer 58/80mm. */
function buildReceiptBody(
  data: PelunasanPrintData,
  config: PelunasanPrintConfig,
): string {
  const baris = data.faktur
    .map(
      (f) => `
      <tr>
        <td>
          <div class="mono"><strong>${escapeHtml(f.fakturNomor)}</strong></div>
          <div class="muted" style="font-size: 10px;">${escapeHtml(formatTanggal(f.tanggalFaktur))}</div>
        </td>
        <td class="num">${escapeHtml(formatRupiah(f.jumlah))}</td>
      </tr>`,
    )
    .join("");

  return `
    <div style="text-align: center; border-bottom: 1px dashed #18181b; padding-bottom: 4px; margin-bottom: 6px;">
      <strong style="font-size: 13px;">${escapeHtml(config.judulDokumen)}</strong>
      <div class="mono">${escapeHtml(data.nomor)}</div>
      <div class="muted" style="font-size: 10px;">${escapeHtml(formatTanggal(data.tanggal))}</div>
    </div>

    <div style="margin-bottom: 6px;">
      <div><span class="muted">${escapeHtml(config.pihakLabel)}:</span></div>
      <div><strong>${escapeHtml(data.pihakNama || data.pihakKode)}</strong></div>
      <div class="mono muted" style="font-size: 10px;">${escapeHtml(data.pihakKode)}</div>
    </div>

    <div style="margin-bottom: 6px;">
      <div><span class="muted">${escapeHtml(config.kasLabel)}:</span></div>
      <div><strong>${escapeHtml(data.akunKasNama || data.akunKasKode)}</strong></div>
      <div class="mono muted" style="font-size: 10px;">${escapeHtml(data.akunKasKode)}</div>
    </div>

    <table style="font-size: 11px;">
      <thead>
        <tr>
          <th style="padding: 4px 2px;">${escapeHtml(config.fakturNomorLabel)}</th>
          <th class="num" style="padding: 4px 2px;">Jumlah</th>
        </tr>
      </thead>
      <tbody>
        ${baris || `<tr><td colspan="2" style="text-align:center;">—</td></tr>`}
      </tbody>
      <tfoot>
        <tr>
          <td style="padding: 4px 2px;" class="num"><strong>Total</strong></td>
          <td style="padding: 4px 2px;" class="num"><strong>${escapeHtml(formatRupiah(data.total))}</strong></td>
        </tr>
      </tfoot>
    </table>

    ${
      data.catatan.trim()
        ? `<div style="margin-top: 6px; border-top: 1px dashed #d4d4d8; padding-top: 4px; font-size: 11px; white-space: pre-wrap;">
            <span class="muted">Catatan: </span>${escapeHtml(data.catatan)}
          </div>`
        : ""
    }
  `;
}
