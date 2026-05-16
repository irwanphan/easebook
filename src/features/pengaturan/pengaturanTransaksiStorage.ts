export type PengaturanTransaksi = {
  /** Tarif PPN dalam persen (contoh: 11 = 11%). */
  ppnPersen: number;
};

export const defaultPengaturanTransaksi: PengaturanTransaksi = {
  ppnPersen: 11,
};

const STORAGE_KEY = "easybook-pengaturan-transaksi";

function clampPpnPersen(n: number): number {
  if (!Number.isFinite(n)) return defaultPengaturanTransaksi.ppnPersen;
  return Math.min(100, Math.max(0, Math.round(n * 100) / 100));
}

export function loadPengaturanTransaksi(): PengaturanTransaksi {
  if (typeof window === "undefined") return { ...defaultPengaturanTransaksi };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultPengaturanTransaksi };
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return { ...defaultPengaturanTransaksi };
    const o = parsed as Record<string, unknown>;
    const ppn =
      typeof o.ppnPersen === "number"
        ? o.ppnPersen
        : typeof o.ppnPersen === "string"
          ? Number.parseFloat(o.ppnPersen)
          : defaultPengaturanTransaksi.ppnPersen;
    return { ppnPersen: clampPpnPersen(ppn) };
  } catch {
    return { ...defaultPengaturanTransaksi };
  }
}

export function persistPengaturanTransaksi(data: PengaturanTransaksi) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ppnPersen: clampPpnPersen(data.ppnPersen) }),
  );
}
