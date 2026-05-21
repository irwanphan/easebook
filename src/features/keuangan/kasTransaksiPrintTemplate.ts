import type {
  KasTransaksiDetailData,
  KasTransaksiDetailVariant,
} from "@/features/keuangan/KasTransaksiDetailView";
import { escapeHtml, wrapPrintableDocument } from "@/lib/print";
import {
  isReceiptPaper,
  paperSizeCss,
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
  const body = receipt
    ? buildReceiptBody(detail, variant, judulDokumen)
    : buildInvoiceBody(detail, variant, judulDokumen);

  return wrapPrintableDocument({
    title: `${judulDokumen} ${detail.nomor}`,
    bodyHtml: body,
    extraCss: paperSize ? paperSizeCss(paperSize) : "",
    compact: receipt,
  });
}

/** Layout invoice (2 kolom) untuk kertas A4 / Letter / continuous. */
function buildInvoiceBody(
  detail: KasTransaksiDetailData,
  variant: KasTransaksiDetailVariant,
  judulDokumen: string,
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

  return `
    <div class="header">
      <h1 style="margin: 0;">${escapeHtml(judulDokumen)}</h1>
      <p class="muted" style="margin: 0;">No. bukti <span class="mono">${escapeHtml(detail.nomor)}</span> · ${escapeHtml(
        formatTanggal(detail.tanggal),
      )}</p>
    </div>

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
