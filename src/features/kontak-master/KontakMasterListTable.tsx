import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { KontakMasterRow } from "@/data/kontakMaster";
import { Pencil, Trash } from "lucide-react";

export type KontakMasterListTableProps = {
  rows: KontakMasterRow[];
  loading: boolean;
  editPathForKode: (kode: string) => string;
  onDelete: (row: KontakMasterRow) => void;
  emptyMessage: string;
  /**
   * Slot opsional untuk filter bar (mis. `<ListFilterBar />`). Dirender
   * sebagai bagian Card yang sama dengan tabel, di atas tabel.
   */
  filterBar?: ReactNode;
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
  filterBar,
}: KontakMasterListTableProps) {
  const navigate = useNavigate();
  return (
    <>
      {loading && !filterBar ? (
        <p className="text-sm text-zinc-500">Memuat data dari database lokal…</p>
      ) : null}
      <Card className="overflow-hidden p-0">
        {filterBar ?? null}
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
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => navigate(editPathForKode(row.kode))}
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                          Ubah
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          className="h-8 text-xs"
                          onClick={() => onDelete(row)}
                        >
                          <Trash className="h-4 w-4" aria-hidden />
                          Hapus
                        </Button>
                      </div>
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
