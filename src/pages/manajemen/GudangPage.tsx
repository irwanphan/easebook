import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useGudang } from "@/features/gudang/GudangContext";

function formatLuas(n: number) {
  return `${new Intl.NumberFormat("id-ID").format(n)} m²`;
}

export function GudangPage() {
  const navigate = useNavigate();
  const { items } = useGudang();

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
      <PageHeader
        title="Gudang"
        description="Master lokasi penyimpanan: alamat, koordinat peta, PIC, dan kapasitas."
        actions={
          <Button type="button" onClick={() => navigate("/manajemen/gudang/tambah")}>
            Tambah gudang
          </Button>
        }
      />
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="whitespace-nowrap px-4 py-3">Kode</th>
                <th className="whitespace-nowrap px-4 py-3">Nama</th>
                <th className="min-w-[180px] px-4 py-3">Alamat</th>
                <th className="whitespace-nowrap px-4 py-3">Lokasi (lat, lng)</th>
                <th className="whitespace-nowrap px-4 py-3">PIC</th>
                <th className="whitespace-nowrap px-4 py-3">Kontak</th>
                <th className="whitespace-nowrap px-4 py-3">Luas</th>
                <th className="min-w-[140px] px-4 py-3">Kapasitas</th>
                <th className="whitespace-nowrap px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-sm text-zinc-500">
                    Belum ada gudang. Klik &quot;Tambah gudang&quot; untuk menambahkan.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.kode} className="bg-white hover:bg-zinc-50/50">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-zinc-800">
                      {row.kode}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-900">
                      {row.nama}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-zinc-600">
                      <span className="line-clamp-2" title={row.alamat}>
                        {row.alamat}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-zinc-700">
                      {row.lokasi ? (
                        <span title={row.lokasi}>{row.lokasi}</span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-800">{row.pic}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600">{row.nomorKontak}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-800">{formatLuas(row.luasM2)}</td>
                    <td className="max-w-[200px] px-4 py-3 text-zinc-600">
                      <span className="line-clamp-2" title={row.kapasitasPenyimpanan}>
                        {row.kapasitasPenyimpanan}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Button variant="ghost" className="px-2 py-1 text-xs font-semibold">
                        Ubah
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
