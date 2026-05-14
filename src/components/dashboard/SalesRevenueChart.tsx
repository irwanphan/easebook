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
import {
  highlightMonth,
  monthlySalesRevenue,
  type MonthPoint,
} from "@/data/mockData";

const barBase = "#e4e4e7";
const barActive = "#7c3aed";
const lineColor = "#a78bfa";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

export function SalesRevenueChart() {
  return (
    <Card className="flex min-h-[320px] flex-col">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Penjualan & pendapatan</h2>
          <p className="text-sm text-zinc-500">Perbandingan bulanan</p>
        </div>
        <button
          type="button"
          className="flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700"
        >
          2024
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 w-full min-w-0">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={monthlySalesRevenue} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
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
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as MonthPoint;
                return (
                  <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg">
                    <p className="font-semibold text-zinc-900">{row.month}</p>
                    <p className="text-brand-600">{formatCurrency(row.sales)}</p>
                  </div>
                );
              }}
              cursor={{ fill: "rgba(124, 58, 237, 0.06)" }}
            />
            <Bar dataKey="sales" radius={[6, 6, 0, 0]} maxBarSize={36}>
              {monthlySalesRevenue.map((entry) => (
                <Cell
                  key={entry.month}
                  fill={entry.month === highlightMonth ? barActive : barBase}
                />
              ))}
            </Bar>
            <Line
              type="monotone"
              dataKey="revenue"
              stroke={lineColor}
              strokeWidth={2}
              dot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
