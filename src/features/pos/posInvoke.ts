import { invoke } from "@tauri-apps/api/core";
import type {
  PosCatalogItem,
  PosMetodeBayar,
  PosPembayaranInput,
  PosShift,
  PosShiftRekap,
  PosTransaksiResult,
} from "@/data/pos";

export function metodeBayarList(hanyaAktif = false) {
  return invoke<PosMetodeBayar[]>("pos_metode_bayar_list", { hanyaAktif });
}

export function shiftActiveFor(username: string) {
  return invoke<PosShift | null>("pos_shift_active_for", { username });
}

export function shiftCarryModal(username: string) {
  return invoke<number>("pos_shift_carry_modal", { username });
}

export function shiftOpen(payload: {
  kasirUsername: string;
  gudangKode: string;
  modalAwal: number;
  catatan?: string;
}) {
  return invoke<PosShift>("pos_shift_open", { payload });
}

export function shiftClose(payload: {
  id: number;
  uangAkhirAktual: number;
  catatan?: string;
}) {
  return invoke<PosShiftRekap>("pos_shift_close", { payload });
}

export function shiftChangeGudang(payload: { id: number; gudangKode: string }) {
  return invoke<PosShift>("pos_shift_change_gudang", { payload });
}

export function shiftRekap(id: number) {
  return invoke<PosShiftRekap>("pos_shift_rekap", { id });
}

export function catalogList(args: {
  gudangKode: string;
  kategoriKode?: string;
  query?: string;
}) {
  return invoke<PosCatalogItem[]>("pos_catalog_list", args);
}

export type PosTransaksiCreateInput = {
  shiftId: number;
  pelangganKode?: string;
  gudangKode: string;
  kasirUsername: string;
  tanggal: string;
  catatan?: string;
  diskonFaktur?: number;
  pajak?: number;
  lines: Array<{
    barangKode: string;
    qty: number;
    satuanTingkat: number;
    hargaSatuan: number;
    diskon?: number;
    catatan?: string;
  }>;
  pembayaran: PosPembayaranInput[];
};

export function transaksiCreate(payload: PosTransaksiCreateInput) {
  return invoke<PosTransaksiResult>("pos_transaksi_create", { payload });
}
