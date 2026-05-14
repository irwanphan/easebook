import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { dashboardOrders, type DashboardOrder } from "@/data/mockData";

function statusVariant(status: DashboardOrder["status"]) {
  switch (status) {
    case "Memproses":
      return "processing" as const;
    case "Terkirim":
      return "shipped" as const;
    case "Tertunda":
      return "delayed" as const;
  }
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function OrdersTableCard() {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900">Pesanan</h2>
        <Link
          to="/penjualan"
          className="text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          Lihat semua
        </Link>
      </div>
      <div className="overflow-x-auto rounded-xl border border-zinc-100">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/80 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Pelanggan</th>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Zona</th>
              <th className="px-4 py-3">Jumlah</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {dashboardOrders.map((row) => (
              <tr key={row.id} className="bg-white hover:bg-zinc-50/60">
                <td className="px-4 py-3 font-medium text-zinc-900">{row.id}</td>
                <td className="px-4 py-3 text-zinc-700">{row.customer}</td>
                <td className="px-4 py-3 text-zinc-600">{row.items}</td>
                <td className="px-4 py-3 font-medium text-zinc-800">{row.zone}</td>
                <td className="px-4 py-3 font-medium text-zinc-900">{formatMoney(row.amount)}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
