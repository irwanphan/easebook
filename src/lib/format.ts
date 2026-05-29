const RUPIAH = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const NUMBER = new Intl.NumberFormat("id-ID");

export function formatRupiah(n: number): string {
  if (!Number.isFinite(n)) return "Rp 0";
  return RUPIAH.format(n);
}

export function formatAngka(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return NUMBER.format(n);
}

export function formatTanggalIso(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatJamMenit(ts: number): string {
  if (!Number.isFinite(ts)) return "";
  return new Date(ts * 1000).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function parseRupiahInput(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw
    .toString()
    .replace(/[^\d.,-]/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}
