import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { mockBarangJasa } from "@/data/mockData";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function BarangJasaPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Barang & jasa"
        description="Kelola katalog produk dan layanan yang dijual."
        actions={<Button>Tambah item</Button>}
      />
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3">Kode</th>
                <th className="px-5 py-3">Nama</th>
                <th className="px-5 py-3">Tipe</th>
                <th className="px-5 py-3">Satuan</th>
                <th className="px-5 py-3">Harga</th>
                <th className="px-5 py-3">Stok</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {mockBarangJasa.map((row) => (
                <tr key={row.kode} className="bg-white hover:bg-zinc-50/50">
                  <td className="px-5 py-3 font-mono text-xs font-medium text-zinc-800">
                    {row.kode}
                  </td>
                  <td className="px-5 py-3 font-medium text-zinc-900">{row.nama}</td>
                  <td className="px-5 py-3">
                    <Badge variant={row.tipe === "Barang" ? "neutral" : "processing"}>
                      {row.tipe}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-zinc-600">{row.satuan}</td>
                  <td className="px-5 py-3 font-medium text-zinc-900">{formatRupiah(row.harga)}</td>
                  <td className="px-5 py-3 text-zinc-600">
                    {row.stok != null ? row.stok : "—"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button variant="ghost" className="px-2 py-1 text-xs font-semibold">
                      Ubah
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
