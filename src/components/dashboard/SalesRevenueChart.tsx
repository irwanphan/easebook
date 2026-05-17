import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { ChevronDown } from "lucide-react";
import type {
  DashboardPenjualanBulananPoint,
  DashboardPenjualanBulananResult,
} from "@/data/dashboard";
import { tauriErrorMessage } from "@/lib/tauriError";

const barBase = "#e4e4e7";
const barActive = "#7c3aed";
const lineColor = "#a78bfa";

function formatRupiah(v: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);
}

function formatAxis(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
  if (abs >= 1_000_000) return `${Math.round(v / 1_000_000)}jt`;
  if (abs >= 1_000) return `${Math.round(v / 1_000)}rb`;
  return String(v);
}

export function SalesRevenueChart() {
  const [data, setData] = useState<DashboardPenjualanBulananResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yearOpen, setYearOpen] = useState(false);

  const load = useCallback(async (year?: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<DashboardPenjualanBulananResult>("dashboard_penjualan_bulanan", {
        year: year ?? null,
      });
      setData(result);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const points = data?.points ?? [];
  const highlightMonth = data?.highlightMonth ?? 0;
  const selectedYear = data?.year ?? new Date().getFullYear();
  const years = data?.availableYears?.length
    ? data.availableYears
    : [selectedYear];

  return (
    <Card className="flex min-h-[320px] flex-col">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Penjualan & pendapatan</h2>
          <p className="text-sm text-zinc-500">
            Total faktur vs faktur lunas per bulan
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setYearOpen((o) => !o)}
            className="flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
            aria-expanded={yearOpen}
            aria-haspopup="listbox"
          >
            {selectedYear}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {yearOpen ? (
            <ul
              role="listbox"
              className="absolute right-0 z-10 mt-1 max-h-48 min-w-[5rem] overflow-auto rounded-xl border border-zinc-200 bg-white py-1 text-xs shadow-lg"
            >
              {years.map((y) => (
                <li key={y}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={y === selectedYear}
                    className={`block w-full px-3 py-1.5 text-left hover:bg-zinc-50 ${
                      y === selectedYear ? "font-semibold text-brand-600" : "text-zinc-700"
                    }`}
                    onClick={() => {
                      setYearOpen(false);
                      void load(y);
                    }}
                  >
                    {y}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      {loading ? (
        <p className="flex flex-1 items-center justify-center text-sm text-zinc-500">Memuat grafik…</p>
      ) : (
        <div className="min-h-0 flex-1 w-full min-w-0">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={points} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#71717a", fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                tickFormatter={formatAxis}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as DashboardPenjualanBulananPoint;
                  return (
                    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg">
                      <p className="font-semibold text-zinc-900">
                        {row.month} {selectedYear}
                      </p>
                      <p className="text-zinc-600">
                        Penjualan: <span className="font-medium text-brand-600">{formatRupiah(row.sales)}</span>
                      </p>
                      <p className="text-zinc-600">
                        Lunas: <span className="font-medium text-violet-600">{formatRupiah(row.revenue)}</span>
                      </p>
                    </div>
                  );
                }}
                cursor={{ fill: "rgba(124, 58, 237, 0.06)" }}
              />
              <Bar dataKey="sales" name="Penjualan" radius={[6, 6, 0, 0]} maxBarSize={36}>
                {points.map((entry) => (
                  <Cell
                    key={entry.month}
                    fill={entry.monthNum === highlightMonth ? barActive : barBase}
                  />
                ))}
              </Bar>
              <Line
                type="monotone"
                dataKey="revenue"
                name="Lunas"
                stroke={lineColor}
                strokeWidth={2}
                dot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          {points.every((p) => p.sales === 0 && p.revenue === 0) ? (
            <p className="mt-2 text-center text-xs text-zinc-500">
              Belum ada faktur penjualan pada tahun {selectedYear}.
            </p>
          ) : null}
        </div>
      )}
    </Card>
  );
}
