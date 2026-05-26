import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Filter,
  LogIn,
  LogOut as LogOutIcon,
  RefreshCw,
  Warehouse,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TokoInput } from "@/components/ui/TokoInput";
import {
  POS_SHIFT_EVENT_CLOSED,
  POS_SHIFT_EVENT_GUDANG_CHANGED,
  POS_SHIFT_EVENT_OPENED,
  parsePosShiftEventPayload,
  type PosShiftEventClosedPayload,
  type PosShiftEventGudangChangedPayload,
  type PosShiftEventLogRow,
  type PosShiftEventOpenedPayload,
  type PosShiftEventType,
} from "@/data/posShiftEventLog";
import type { PenggunaRow } from "@/data/pengguna";
import { shiftEventLogList } from "@/features/pos/posInvoke";
import { formatRupiah } from "@/lib/format";
import { tauriErrorMessage } from "@/lib/tauriError";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

function toIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultTanggalDari() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return toIsoDate(d);
}

function defaultTanggalSampai() {
  return toIsoDate(new Date());
}

function formatWaktuPenuh(ts: number) {
  const d = new Date(ts * 1000);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Deskriptor visual per `event_type`. Untuk menambah jenis event baru,
 * tambahkan entry di sini — komponen tabel tidak perlu diubah (OCP).
 */
type EventDescriptor = {
  label: string;
  badgeClass: string;
  icon: typeof Warehouse;
  /** Renderer ringkasan detail. Return JSX/string; fallback `null` bila tidak relevan. */
  renderDetail: (payload: unknown) => React.ReactNode;
};

const EVENT_DESCRIPTORS: Record<string, EventDescriptor> = {
  [POS_SHIFT_EVENT_OPENED]: {
    label: "Buka shift",
    badgeClass: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    icon: LogIn,
    renderDetail: (raw) => {
      const p = raw as PosShiftEventOpenedPayload | null;
      if (!p) return null;
      return (
        <div className="space-y-0.5">
          <div className="text-zinc-700">
            Gudang awal: <span className="font-semibold text-zinc-900">{p.gudangNama || p.gudangKode}</span>
          </div>
          <div className="text-zinc-500">
            Modal awal: <span className="font-medium text-zinc-700">{formatRupiah(p.modalAwal || 0)}</span>
          </div>
        </div>
      );
    },
  },
  [POS_SHIFT_EVENT_CLOSED]: {
    label: "Tutup shift",
    badgeClass: "bg-rose-50 text-rose-700 ring-rose-200",
    icon: LogOutIcon,
    renderDetail: (raw) => {
      const p = raw as PosShiftEventClosedPayload | null;
      if (!p) return null;
      const selisih = p.selisih || 0;
      const selisihColor =
        selisih === 0
          ? "text-emerald-700"
          : selisih > 0
            ? "text-sky-700"
            : "text-rose-700";
      const selisihLabel = selisih === 0 ? "pas" : selisih > 0 ? "lebih" : "kurang";
      return (
        <div className="space-y-0.5">
          <div className="text-zinc-700">
            Aktual: <span className="font-semibold text-zinc-900">{formatRupiah(p.uangAkhirAktual || 0)}</span>
            {" vs "}Ekspektasi:{" "}
            <span className="font-medium text-zinc-700">{formatRupiah(p.uangAkhirEkspektasi || 0)}</span>
          </div>
          <div className={selisihColor}>
            Selisih: <span className="font-semibold">{formatRupiah(Math.abs(selisih))}</span>{" "}
            <span className="text-xs">({selisihLabel})</span>
          </div>
        </div>
      );
    },
  },
  [POS_SHIFT_EVENT_GUDANG_CHANGED]: {
    label: "Ganti gudang",
    badgeClass: "bg-amber-50 text-amber-700 ring-amber-200",
    icon: Warehouse,
    renderDetail: (raw) => {
      const p = raw as PosShiftEventGudangChangedPayload | null;
      if (!p) return null;
      return (
        <div className="flex flex-wrap items-center gap-1.5 text-zinc-700">
          <span className="inline-flex flex-col rounded-md border border-zinc-200 px-1.5 py-0.5">
            <span className="text-xs font-mono text-zinc-500">{p.fromGudangKode}</span>
            <span className="text-sm font-medium text-zinc-800">{p.fromGudangNama || "—"}</span>
          </span>
          <span className="text-zinc-400">→</span>
          <span className="inline-flex flex-col rounded-md border border-amber-300 bg-amber-50/40 px-1.5 py-0.5">
            <span className="text-xs font-mono text-amber-700">{p.toGudangKode}</span>
            <span className="text-sm font-semibold text-amber-900">{p.toGudangNama || "—"}</span>
          </span>
        </div>
      );
    },
  },
};

const FALLBACK_DESCRIPTOR: EventDescriptor = {
  label: "Kejadian",
  badgeClass: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  icon: ClipboardList,
  renderDetail: (raw) => {
    if (raw == null) return null;
    try {
      return (
        <pre className="whitespace-pre-wrap break-all rounded-lg bg-zinc-50 px-2 py-1 text-xs text-zinc-700">
          {JSON.stringify(raw, null, 2)}
        </pre>
      );
    } catch {
      return null;
    }
  },
};

const FILTER_EVENT_OPTIONS: Array<{ value: PosShiftEventType | ""; label: string }> = [
  { value: "", label: "Semua kejadian" },
  { value: POS_SHIFT_EVENT_OPENED, label: "Buka shift" },
  { value: POS_SHIFT_EVENT_CLOSED, label: "Tutup shift" },
  { value: POS_SHIFT_EVENT_GUDANG_CHANGED, label: "Ganti gudang" },
];

export function LaporanLogShiftPosPage() {
  const [tanggalDari, setTanggalDari] = useState(defaultTanggalDari);
  const [tanggalSampai, setTanggalSampai] = useState(defaultTanggalSampai);
  const [filterEvent, setFilterEvent] = useState<PosShiftEventType | "">("");
  const [filterKasir, setFilterKasir] = useState("");

  const [rows, setRows] = useState<PosShiftEventLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [penggunaList, setPenggunaList] = useState<PenggunaRow[]>([]);

  const rentangInvalid = useMemo(() => {
    if (!tanggalDari || !tanggalSampai) return true;
    return tanggalSampai < tanggalDari;
  }, [tanggalDari, tanggalSampai]);

  const fetchRows = useCallback(async () => {
    if (rentangInvalid) {
      setError("Tanggal akhir tidak boleh sebelum tanggal mulai.");
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await shiftEventLogList({
        dari: tanggalDari.trim(),
        sampai: tanggalSampai.trim(),
        eventType: filterEvent || undefined,
        actorUsername: filterKasir.trim() || undefined,
      });
      setRows(list);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [rentangInvalid, tanggalDari, tanggalSampai, filterEvent, filterKasir]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await invoke<PenggunaRow[]>("pengguna_list");
        if (!cancelled) setPenggunaList(list);
      } catch {
        // Diam saja — filter kasir akan fallback ke teks kosong.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Log shift POS"
        description="Audit trail kejadian shift kasir: buka, tutup, ganti gudang, dan ke depannya konfigurasi printer & lainnya."
      />

      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
            Tanggal mulai
            <TokoInput
              id="llp-dari"
              type="date"
              value={tanggalDari}
              onChange={(e) => setTanggalDari(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
            Tanggal akhir
            <TokoInput
              id="llp-sampai"
              type="date"
              value={tanggalSampai}
              onChange={(e) => setTanggalSampai(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
            Jenis kejadian
            <select
              className={inputClass}
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value as PosShiftEventType | "")}
            >
              {FILTER_EVENT_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
            Kasir
            <select
              className={inputClass}
              value={filterKasir}
              onChange={(e) => setFilterKasir(e.target.value)}
            >
              <option value="">Semua kasir</option>
              {penggunaList.map((p) => (
                <option key={p.username} value={p.username}>
                  {p.namaLengkap || p.username}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" disabled={loading} onClick={() => void fetchRows()}>
            <Filter className="h-4 w-4" aria-hidden />
            {loading ? "Memuat…" : "Terapkan filter"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => void fetchRows()}
            title="Muat ulang"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
            Muat ulang
          </Button>
          {!loading && !error && rows.length > 0 ? (
            <p className="text-sm text-zinc-600">{rows.length} kejadian pada periode ini.</p>
          ) : null}
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}
      </Card>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <p className="p-8 text-center text-sm text-zinc-500">Memuat log…</p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-zinc-500">
            Tidak ada kejadian pada filter ini.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/80 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Shift</th>
                  <th className="px-4 py-3">Kasir / Aktor</th>
                  <th className="px-4 py-3">Kejadian</th>
                  <th className="px-4 py-3">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((row) => {
                  const descriptor =
                    EVENT_DESCRIPTORS[row.eventType] ?? FALLBACK_DESCRIPTOR;
                  const Icon = descriptor.icon;
                  const payload = parsePosShiftEventPayload(row.payload);
                  const aktorBerbeda =
                    row.actorUsername.toLowerCase() !== row.kasirUsername.toLowerCase();
                  return (
                    <tr key={row.id} className="align-top hover:bg-zinc-50/60">
                      <td className="px-4 py-3 text-zinc-700">
                        <div className="text-sm font-medium text-zinc-900">
                          {formatWaktuPenuh(row.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-zinc-700">
                          {row.shiftKode || `#${row.shiftId}`}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        <div className="text-sm font-medium text-zinc-900">
                          {row.kasirNama || row.kasirUsername || "—"}
                        </div>
                        <div className="text-xs text-zinc-500">@{row.kasirUsername}</div>
                        {aktorBerbeda ? (
                          <div className="mt-1 inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-inset ring-amber-200">
                            Diubah oleh {row.actorNama || row.actorUsername}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${descriptor.badgeClass}`}
                        >
                          <Icon className="h-3.5 w-3.5" aria-hidden />
                          {descriptor.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {descriptor.renderDetail(payload) ?? (
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
