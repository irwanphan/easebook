import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ListFilterBar } from "@/components/ui/ListFilterBar";
import type { PenggunaRow } from "@/data/pengguna";
import { tauriErrorMessage } from "@/lib/tauriError";

export function PenggunaPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PenggunaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PenggunaRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await invoke<PenggunaRow[]>("pengguna_list");
      setRows(list);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const hay =
        `${row.username} ${row.namaLengkap} ${row.email} ${row.departemen} ${row.nomorHp} ${row.catatan}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query]);

  const handleReset = useCallback(() => setQuery(""), []);
  const isDefault = query === "";

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await invoke("pengguna_delete", { username: pendingDelete.username });
      setPendingDelete(null);
      await load();
    } catch (err) {
      setDeleteError(tauriErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete, load]);

  const handleCancelDelete = useCallback(() => {
    if (deleting) return;
    setPendingDelete(null);
    setDeleteError(null);
  }, [deleting]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Manajemen pengguna"
        description="Daftar akun yang dapat mengakses aplikasi EasyBook."
        actions={
          <Button type="button" onClick={() => navigate("/manajemen/pengguna/tambah")}>
            Tambah pengguna
          </Button>
        }
      />

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      <Card className="overflow-hidden p-0">
        <ListFilterBar
          search={{
            value: query,
            onChange: setQuery,
            placeholder: "Cari username, nama, email, departemen, atau HP…",
          }}
          onReset={handleReset}
          canReset={!isDefault}
          summary={
            loading
              ? "Memuat daftar pengguna…"
              : filteredRows.length === 0
                ? rows.length === 0
                  ? "Belum ada pengguna."
                  : "Tidak ada pengguna yang cocok dengan pencarian."
                : `${filteredRows.length} pengguna${
                    filteredRows.length !== rows.length ? ` dari ${rows.length}` : ""
                  }`
          }
        />
        {loading ? (
          <p className="p-8 text-center text-sm text-zinc-500">Memuat daftar pengguna…</p>
        ) : filteredRows.length === 0 ? (
          <p className="p-8 text-center text-sm text-zinc-500">
            {rows.length === 0
              ? 'Belum ada pengguna. Klik "Tambah pengguna" untuk menambahkan.'
              : "Tidak ada pengguna yang cocok dengan pencarian."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/80 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Nama lengkap</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Departemen</th>
                  <th className="px-4 py-3">Nomor HP</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Peran</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredRows.map((row) => (
                  <tr key={row.username} className="hover:bg-zinc-50/60">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-zinc-900">{row.username}</td>
                    <td className="px-4 py-3 font-medium text-zinc-900">{row.namaLengkap}</td>
                    <td className="px-4 py-3 text-zinc-600">{row.email || "—"}</td>
                    <td className="px-4 py-3 text-zinc-700">{row.departemen || "—"}</td>
                    <td className="px-4 py-3 text-zinc-700">{row.nomorHp || "—"}</td>
                    <td className="px-4 py-3">
                      {row.aktif ? (
                        <Badge variant="success">Aktif</Badge>
                      ) : (
                        <Badge variant="neutral">Nonaktif</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.isAdmin ? (
                        <Badge variant="processing">Admin</Badge>
                      ) : (
                        <span className="text-zinc-500">Pengguna</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          className="px-2 py-1 text-xs"
                          onClick={() =>
                            navigate(`/manajemen/pengguna/ubah/${encodeURIComponent(row.username)}`)
                          }
                        >
                          Ubah
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="px-2 py-1 text-xs"
                          onClick={() =>
                            navigate(`/manajemen/pengguna/tambah?duplikat=${encodeURIComponent(row.username)}`)
                          }
                        >
                          Duplikat
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          className="px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                          onClick={() => setPendingDelete(row)}
                        >
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmModal
        open={pendingDelete !== null}
        variant="danger"
        title="Hapus pengguna"
        message={
          pendingDelete
            ? deleteError
              ? deleteError
              : `Hapus pengguna "${pendingDelete.username} — ${pendingDelete.namaLengkap}"? Tindakan ini tidak dapat dibatalkan. Pengguna yang sudah memiliki aktivitas tercatat (transaksi / perubahan data) tidak dapat dihapus — gunakan menu Ubah untuk menonaktifkan akun.`
            : ""
        }
        confirmLabel="Hapus"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
