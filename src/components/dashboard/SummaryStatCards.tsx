import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { DashboardPenjualanRingkasan } from "@/data/dashboard";
import { tauriErrorMessage } from "@/lib/tauriError";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDelta(current: number, previous: number): { text: string; positive: boolean } {
  if (previous === 0) {
    if (current === 0) return { text: "Sama dengan bulan lalu", positive: true };
    return { text: "Baru bulan ini", positive: true };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  const positive = pct >= 0;
  const sign = pct > 0 ? "+" : "";
  return { text: `${sign}${pct}% vs bulan lalu`, positive };
}

type StatCardProps = {
  label: string;
  value: string;
  sub: string;
  subTone?: "neutral" | "positive" | "warning";
  gradient: string;
};

function StatCard({ label, value, sub, subTone = "neutral", gradient }: StatCardProps) {
  const subClass =
    subTone === "positive"
      ? "text-emerald-300"
      : subTone === "warning"
        ? "text-amber-200"
        : "text-white/75";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-lg ${gradient}`}
    >
      <p className="text-sm font-medium text-white/80">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight sm:text-xl">{value}</p>
      <p className={`mt-2 text-xs font-medium ${subClass}`}>{sub}</p>
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
    </div>
  );
}

export function SummaryStatCards() {
  const [data, setData] = useState<DashboardPenjualanRingkasan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await invoke<DashboardPenjualanRingkasan>("dashboard_penjualan_ringkasan");
        if (!cancelled) setData(result);
      } catch (e) {
        if (!cancelled) setError(tauriErrorMessage(e));
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
    );
  }

  if (!data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-[132px] animate-pulse rounded-2xl bg-zinc-200"
            aria-hidden
          />
        ))}
      </div>
    );
  }

  const { bulanIni, bulanLalu, piutangJumlah, piutangNilai, labelBulanIni } = data;
  const deltaNilai = formatDelta(bulanIni.nilaiTotal, bulanLalu.nilaiTotal);

  const piutangSub =
    piutangJumlah > 0
      ? `${piutangJumlah} piutang aktif · ${formatRupiah(piutangNilai)}`
      : "Tidak ada piutang aktif";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <StatCard
        label={`Penjualan ${labelBulanIni}`}
        value={formatRupiah(bulanIni.nilaiTotal)}
        sub={`${bulanIni.jumlahFaktur} faktur · ${deltaNilai.text}`}
        subTone={deltaNilai.positive ? "positive" : "warning"}
        gradient="from-brand-600 via-violet-700 to-zinc-900"
      />
      <StatCard
        label={`Terlunasi ${labelBulanIni}`}
        value={formatRupiah(bulanIni.nilaiTerlunasi)}
        sub={
          bulanIni.jumlahFaktur > 0
            ? `${bulanIni.jumlahTerlunasi} dari ${bulanIni.jumlahFaktur} faktur · ${piutangSub}`
            : piutangSub
        }
        subTone={piutangJumlah > 0 ? "warning" : "positive"}
        gradient="from-fuchsia-500 via-pink-600 to-zinc-900"
      />
    </div>
  );
}
