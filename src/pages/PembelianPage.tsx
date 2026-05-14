import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { mockPembelian } from "@/data/mockData";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function statusVariant(s: (typeof mockPembelian)[number]["status"]) {
  if (s === "Diterima") return "success" as const;
  if (s === "Dipesan") return "processing" as const;
  return "delayed" as const;
}

export function PembelianPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Pembelian"
        description="Purchase order dan penerimaan barang dari supplier."
        actions={<Button>PO baru</Button>}
      />
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3">No. PO</th>
                <th className="px-5 py-3">Tanggal</th>
                <th className="px-5 py-3">Supplier</th>
                <th className="px-5 py-3">Total</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {mockPembelian.map((row) => (
                <tr key={row.noPO} className="bg-white hover:bg-zinc-50/50">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-brand-700">
                    {row.noPO}
                  </td>
                  <td className="px-5 py-3 text-zinc-600">{row.tanggal}</td>
                  <td className="px-5 py-3 font-medium text-zinc-900">{row.supplier}</td>
                  <td className="px-5 py-3 font-medium text-zinc-900">{formatRupiah(row.total)}</td>
                  <td className="px-5 py-3">
                    <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button variant="ghost" className="px-2 py-1 text-xs font-semibold">
                      Detail
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
