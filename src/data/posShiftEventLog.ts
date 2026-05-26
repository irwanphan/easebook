/**
 * Tipe data audit log shift POS.
 *
 * Skema event_type + payload sengaja generik supaya menambah jenis event
 * baru tidak menyentuh tabel — cukup tambah konstanta event_type baru dan
 * tulis payload sesuai kontrak di backend.
 */

export const POS_SHIFT_EVENT_OPENED = "POS_SHIFT_OPENED";
export const POS_SHIFT_EVENT_CLOSED = "POS_SHIFT_CLOSED";
export const POS_SHIFT_EVENT_GUDANG_CHANGED = "POS_SHIFT_GUDANG_CHANGED";

export type PosShiftEventType =
  | typeof POS_SHIFT_EVENT_OPENED
  | typeof POS_SHIFT_EVENT_CLOSED
  | typeof POS_SHIFT_EVENT_GUDANG_CHANGED
  | (string & {});

export type PosShiftEventLogRow = {
  id: number;
  shiftId: number;
  shiftKode: string;
  kasirUsername: string;
  kasirNama: string;
  eventType: PosShiftEventType;
  actorUsername: string;
  actorNama: string;
  /** JSON string; gunakan helper `parsePosShiftEventPayload`. */
  payload: string;
  createdAt: number;
};

/** Payload masing-masing jenis event (struktur disepakati dengan backend). */
export type PosShiftEventOpenedPayload = {
  gudangKode: string;
  gudangNama: string;
  modalAwal: number;
};

export type PosShiftEventClosedPayload = {
  uangAkhirAktual: number;
  uangAkhirEkspektasi: number;
  selisih: number;
};

export type PosShiftEventGudangChangedPayload = {
  fromGudangKode: string;
  fromGudangNama: string;
  toGudangKode: string;
  toGudangNama: string;
};

/**
 * Aman-parse payload JSON. Tidak melempar — return `null` bila tidak valid
 * supaya UI cukup menampilkan teks fallback alih-alih meledak.
 */
export function parsePosShiftEventPayload<T = Record<string, unknown>>(
  payload: string,
): T | null {
  if (!payload) return null;
  try {
    return JSON.parse(payload) as T;
  } catch {
    return null;
  }
}

export type PosShiftEventLogFilter = {
  dari?: string;
  sampai?: string;
  eventType?: PosShiftEventType | "";
  actorUsername?: string;
  limit?: number;
};
