import { invoke } from "@tauri-apps/api/core";
import type {
  ProduksiDetail,
  ProduksiHppSnapshot,
  ProduksiInsertPayload,
  ProduksiListRow,
  ProduksiStatus,
} from "@/data/produksi";

export function produksiList(args: {
  tanggalDari?: string;
  tanggalSampai?: string;
  status?: ProduksiStatus | "";
  query?: string;
}) {
  return invoke<ProduksiListRow[]>("produksi_list", args);
}

export function produksiDetail(nomor: string) {
  return invoke<ProduksiDetail>("produksi_detail", { nomor });
}

export function produksiHppSnapshot(barangKode: string) {
  return invoke<ProduksiHppSnapshot>("produksi_hpp_snapshot", { barangKode });
}

export function produksiInsert(payload: ProduksiInsertPayload) {
  return invoke<string>("produksi_insert", { payload });
}

export function produksiUpdate(nomor: string, payload: ProduksiInsertPayload) {
  return invoke<void>("produksi_update", { nomor, payload });
}

export function produksiDelete(nomor: string) {
  return invoke<void>("produksi_delete", { nomor });
}

export function produksiTandaiSelesai(nomor: string) {
  return invoke<void>("produksi_tandai_selesai", { nomor });
}

export function produksiBatalkan(nomor: string) {
  return invoke<void>("produksi_batalkan", { nomor });
}
