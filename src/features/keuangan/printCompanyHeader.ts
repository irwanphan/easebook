import { escapeHtml } from "@/lib/print";
import {
  loadInformasiPerusahaan,
  type InformasiPerusahaan,
} from "@/features/pengaturan/informasiPerusahaanStorage";

/**
 * Varian tata letak kop perusahaan untuk dokumen cetak.
 *  - `invoice`  → kop kiri-rata, font normal, untuk A4 / Letter / paged.
 *  - `receipt`  → kop tengah-rata, font kompak, untuk thermal 58/80mm.
 */
export type CompanyHeaderVariant = "invoice" | "receipt";

/**
 * Bangun string baris kontak ("Telp. xxx · email@…") dari `InformasiPerusahaan`.
 * Hanya menyertakan field yang ter-isi supaya separator tidak nyangkut.
 */
function buildContactLine(info: InformasiPerusahaan): string {
  const parts: string[] = [];
  const telp = info.nomorTelepon.trim();
  const email = info.emailPerusahaan.trim();
  if (telp) parts.push(`Telp. ${telp}`);
  if (email) parts.push(email);
  return parts.join(" · ");
}

/**
 * Bangun HTML blok kop perusahaan (nama, alamat, kontak) untuk header
 * cetakan. Data otomatis diambil dari `localStorage` lewat
 * {@link loadInformasiPerusahaan} — caller boleh override dengan param
 * `data` untuk testing atau injeksi sumber lain.
 *
 * Mengembalikan string kosong bila SEMUA field perusahaan kosong, supaya
 * dokumen tidak menampilkan bingkai header yang isinya hampa.
 *
 * Pakai bersama {@link COMPANY_HEADER_CSS} (di-inject ke `extraCss`) untuk
 * varian `invoice`. Varian `receipt` sudah self-contained (inline style).
 */
export function buildCompanyHeaderHtml(
  variant: CompanyHeaderVariant = "invoice",
  data?: InformasiPerusahaan,
): string {
  const info = data ?? loadInformasiPerusahaan();
  const nama = info.namaPerusahaan.trim();
  const alamat = info.alamat.trim();
  const kontak = buildContactLine(info);

  if (!nama && !alamat && !kontak) return "";

  if (variant === "receipt") {
    const blokNama = nama
      ? `<div><strong style="font-size: 12px;">${escapeHtml(nama)}</strong></div>`
      : "";
    const blokAlamat = alamat
      ? `<div style="font-size: 10px; line-height: 1.3;">${escapeHtml(alamat)}</div>`
      : "";
    const blokKontak = kontak
      ? `<div class="muted" style="font-size: 10px;">${escapeHtml(kontak)}</div>`
      : "";
    return `
      <div class="company-header-receipt" style="text-align: center; border-bottom: 1px dashed #18181b; padding-bottom: 4px; margin-bottom: 6px;">
        ${blokNama}${blokAlamat}${blokKontak}
      </div>
    `;
  }

  const blokNama = nama
    ? `<div class="company-header__name">${escapeHtml(nama)}</div>`
    : "";
  const blokAlamat = alamat
    ? `<div class="company-header__meta">${escapeHtml(alamat)}</div>`
    : "";
  const blokKontak = kontak
    ? `<div class="company-header__meta">${escapeHtml(kontak)}</div>`
    : "";

  return `
    <div class="company-header">
      ${blokNama}${blokAlamat}${blokKontak}
    </div>
  `;
}

/**
 * CSS untuk varian `invoice`. Inject ke `extraCss` saat me-wrap dokumen
 * print (cukup sekali walau header dirender beberapa kali).
 */
export const COMPANY_HEADER_CSS = `
  .company-header {
    border-bottom: 1px solid #e4e4e7;
    padding-bottom: 3mm;
    margin-bottom: 4mm;
  }
  .company-header__name {
    font-size: 13pt;
    font-weight: 700;
    color: #18181b;
    line-height: 1.2;
  }
  .company-header__meta {
    font-size: 9pt;
    color: #52525b;
    line-height: 1.4;
    margin-top: 0.5mm;
    white-space: pre-line;
  }
`;
