import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AkunKeuanganFormModal } from "@/features/keuangan/AkunKeuanganFormModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { AkunKeuanganRow } from "@/data/keuangan";
import { tauriErrorMessage } from "@/lib/tauriError";
import { groupAkunByKelompok } from "@/lib/akunKeuanganDisplay";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function DaftarAkunPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AkunKeuanganRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingRow, setEditingRow] = useState<AkunKeuanganRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AkunKeuanganRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await invoke<AkunKeuanganRow[]>("akun_keuangan_list");
      setRows(list);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sections = useMemo(() => groupAkunByKelompok(rows), [rows]);

  const openCreate = useCallback(() => {
    setEditingRow(null);
    setFormMode("create");
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((row: AkunKeuanganRow) => {
    setEditingRow(row);
    setFormMode("edit");
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingRow(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await invoke("akun_keuangan_delete", { kode: deleteTarget.kode });
      setDeleteTarget(null);
      await refresh();
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, deleting, refresh]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Daftar akun"
        description="Chart of accounts dikelompokkan seperti TokoPro: aktiva, hutang, modal, pendapatan, dan biaya."
      />

      {error ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Semua akun</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Akun anak diindent (mis. 1001.1 BCA di bawah 1001 Kas Bank). Kolom norm D/K = sisi normal saldo.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="shrink-0"
            onClick={() => navigate("/keuangan/konfigurasi-akun-jurnal")}
          >
            Konfigurasi akun jurnal
          </Button>
          <Button type="button" onClick={openCreate} className="shrink-0">
            Tambah akun
          </Button>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-zinc-100">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-3 py-3">Kode</th>
                <th className="px-3 py-3">Nama akun</th>
                <th className="px-3 py-3 text-center">Norm</th>
                <th className="px-3 py-3">Sub pendapatan/biaya</th>
                <th className="px-3 py-3">Kas</th>
                <th className="px-3 py-3 text-right">Saldo kas</th>
                <th className="px-3 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-5 text-center text-sm text-zinc-500">
                    Memuat akun…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-500">
                    Belum ada akun. Gunakan &quot;Tambah akun&quot; atau hapus database untuk memuat seeder standar.
                  </td>
                </tr>
              ) : (
                sections.map((section) => (
                  <Fragment key={section.kelompok}>
                    <tr className="bg-zinc-100/90">
                      <td
                        colSpan={7}
                        className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-zinc-700"
                      >
                        Kelompok: {section.label}
                      </td>
                    </tr>
                    {section.rows.map((r) => (
                      <tr key={r.kode} className="border-t border-zinc-50 bg-white hover:bg-zinc-50/50">
                        <td
                          className="px-3 py-2.5 font-mono text-xs font-semibold text-brand-700"
                          style={{ paddingLeft: `${12 + r.depth * 20}px` }}
                        >
                          {r.kode}
                        </td>
                        <td
                          className="px-3 py-2.5 font-medium text-zinc-900"
                          style={{ paddingLeft: `${12 + r.depth * 20}px` }}
                        >
                          {r.nama}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {r.kolomNorm ? (
                            <span
                              className={`inline-flex min-w-[1.75rem] justify-center rounded-md px-1.5 py-0.5 text-xs font-bold ${
                                r.kolomNorm === "D"
                                  ? "bg-sky-50 text-sky-800"
                                  : "bg-violet-50 text-violet-800"
                              }`}
                            >
                              {r.kolomNorm}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-zinc-600">{r.subKelompok || "—"}</td>
                        <td className="px-3 py-2.5">
                          {r.isAkunKas ? (
                            <Badge variant="success">Kas</Badge>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium text-zinc-900">
                          {r.isAkunKas ? formatRupiah(r.saldo) : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              className="px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                              onClick={() => openEdit(r)}
                            >
                              Ubah
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(r);
                              }}
                            >
                              Hapus
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AkunKeuanganFormModal
        open={formOpen}
        mode={formMode}
        editingRow={formMode === "edit" ? editingRow : null}
        rows={rows}
        onClose={closeForm}
        onSaved={refresh}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        title="Hapus akun"
        message={
          deleteTarget
            ? `Yakin hapus akun ${deleteTarget.kode} — ${deleteTarget.nama}? Tindakan ini tidak dapat dibatalkan.`
            : ""
        }
        confirmLabel="Hapus"
        variant="danger"
        loading={deleting}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
