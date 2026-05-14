import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useMerek } from "@/features/merek/MerekContext";

export function MerekPage() {
  const navigate = useNavigate();
  const { items, loading } = useMerek();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Merek"
        description="Master merek untuk produk dan pemetaan ke katalog."
        actions={
          <Button type="button" onClick={() => navigate("/manajemen/merek/tambah")}>
            Tambah merek
          </Button>
        }
      />
      {loading ? (
        <p className="text-sm text-zinc-500">Memuat data dari database lokal…</p>
      ) : null}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3">Kode</th>
                <th className="px-5 py-3">Nama</th>
                <th className="px-5 py-3">Deskripsi</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-zinc-500">
                    Belum ada merek. Klik &quot;Tambah merek&quot; untuk menambahkan.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.kode} className="bg-white hover:bg-zinc-50/50">
                    <td className="px-5 py-3 font-mono text-xs font-medium text-zinc-800">
                      {row.kode}
                    </td>
                    <td className="px-5 py-3 font-medium text-zinc-900">{row.nama}</td>
                    <td className="max-w-md px-5 py-3 text-zinc-600">
                      {row.deskripsi ? (
                        <span className="line-clamp-2" title={row.deskripsi}>
                          {row.deskripsi}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
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
