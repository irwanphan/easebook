import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { KontakMasterRow } from "@/data/kontakMaster";

export type KontakMasterListTableProps = {
  rows: KontakMasterRow[];
  loading: boolean;
  editPathForKode: (kode: string) => string;
  onDelete: (row: KontakMasterRow) => void;
  emptyMessage: string;
};

function cellText(v: string) {
  const t = v.trim();
  return t ? t : "—";
}

export function KontakMasterListTable({
  rows,
  loading,
  editPathForKode,
  onDelete,
  emptyMessage,
}: KontakMasterListTableProps) {
  return (
    <>
      {loading ? (
        <p className="text-sm text-zinc-500">Memuat data dari database lokal…</p>
      ) : null}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">Kode</th>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Kota</th>
                <th className="px-4 py-3">Telepon</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-zinc-500">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.kode} className="bg-white hover:bg-zinc-50/50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-zinc-800">{row.kode}</td>
                    <td className="max-w-[200px] px-4 py-3 font-medium text-zinc-900">
                      <span className="line-clamp-2" title={row.nama}>
                        {row.nama}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{cellText(row.kota)}</td>
                    <td className="px-4 py-3 text-zinc-600">{cellText(row.telepon)}</td>
                    <td className="max-w-[180px] px-4 py-3 text-zinc-600">
                      {row.email.trim() ? (
                        <span className="line-clamp-1" title={row.email}>
                          {row.email}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        to={editPathForKode(row.kode)}
                        className="mr-1 inline-flex items-center justify-center rounded-xl px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
                      >
                        Ubah
                      </Link>
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                        onClick={() => onDelete(row)}
                      >
                        Hapus
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
