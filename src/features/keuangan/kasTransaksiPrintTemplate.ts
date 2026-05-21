import type {
  KasTransaksiDetailData,
  KasTransaksiDetailVariant,
} from "@/features/keuangan/KasTransaksiDetailView";
import { escapeHtml, wrapPrintableDocument } from "@/lib/print";

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
 * Layout invoice-style: header dokumen + ringkasan + tabel rincian + footer.
 * Tidak bergantung Tailwind — pakai CSS inline dari `wrapPrintableDocument`.
 */
export function buildKasTransaksiPrintHtml(
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
          <div class="mono muted">${escapeHtml(line.akunKode)}</div>
        </td>
        <td>${line.catatan ? escapeHtml(line.catatan) : "—"}</td>
        <td class="num">${escapeHtml(formatRupiah(line.jumlah))}</td>
      </tr>`,
    )
    .join("");

  const body = `
    <div class="header">
      <h1>${escapeHtml(judulDokumen)}</h1>
      <p class="muted">No. bukti <span class="mono">${escapeHtml(detail.nomor)}</span> · ${escapeHtml(
        formatTanggal(detail.tanggal),
      )}</p>
    </div>

    <div class="grid">
      <div>
        <div class="label">${escapeHtml(variant.kasLabel)}</div>
        <div class="value">${escapeHtml(detail.akunKasNama || detail.akunKasKode)}</div>
        <div class="mono muted">${escapeHtml(detail.akunKasKode)}</div>
      </div>
      <div>
        <div class="label">Total</div>
        <div class="value total">${escapeHtml(formatRupiah(detail.total))}</div>
        <div class="muted">${detail.lines.length} baris akun</div>
      </div>
      <div>
        <div class="label">Tanggal transaksi</div>
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
      <div style="grid-column: span 2;">
        <div class="label">Pengaruh jurnal</div>
        <div class="value">${escapeHtml(variant.arahJurnal)}</div>
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

    <h2>${escapeHtml(variant.baristTitle)}</h2>
    <table>
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

  return wrapPrintableDocument({
    title: `${judulDokumen} ${detail.nomor}`,
    bodyHtml: body,
  });
}
