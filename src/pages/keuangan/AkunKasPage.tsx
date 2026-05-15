import { useCallback, useEffect, useState, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { AkunKasInsertPayload, AkunKasRow } from "@/data/keuangan";
import { labelPeranJurnal, PERAN_JURNAL_KAS_OPTIONS } from "@/data/keuangan";
import { tauriErrorMessage } from "@/lib/tauriError";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function AkunKasPage() {
  const [rows, setRows] = useState<AkunKasRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [peranJurnal, setPeranJurnal] = useState<string>("KAS");
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await invoke<AkunKasRow[]>("akun_kas_list");
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

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (submitting) return;
      setError(null);

      const payload: AkunKasInsertPayload = {
        kode: kode.trim(),
        nama: nama.trim(),
        peranJurnal: peranJurnal.trim(),
      };

      if (!payload.kode) {
        setError("Kode akun wajib diisi.");
        return;
      }
      if (!payload.nama) {
        setError("Nama akun wajib diisi.");
        return;
      }

      setSubmitting(true);
      try {
        await invoke("akun_kas_insert", { payload });
        setKode("");
        setNama("");
        setPeranJurnal("KAS");
        await refresh();
      } catch (err) {
        setError(tauriErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
    },
    [kode, nama, peranJurnal, submitting, refresh],
  );

  const onDelete = useCallback(
    async (kodeRow: string) => {
      const ok = window.confirm(`Hapus akun ${kodeRow}?`);
      if (!ok) return;
      setError(null);
      try {
        await invoke("akun_kas_delete", { kode: kodeRow });
        await refresh();
      } catch (err) {
        setError(tauriErrorMessage(err));
      }
    },
    [refresh],
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Akun kas"
        description="Kelola kas toko dan rekening bank. Saldo diperbarui otomatis dari jurnal (debit menambah, kredit mengurangi)."
      />

      {error ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Daftar akun kas</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Kolom saldo awalnya 0; berubah saat ada transaksi jurnal yang menyentuh akun ini.
          </p>

          <div className="mt-5 overflow-x-auto rounded-xl border border-zinc-100">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Kode</th>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Dicatat sebagai</th>
                  <th className="px-4 py-3 text-right">Saldo</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-5 text-center text-sm text-zinc-500">
                      Memuat akun…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-500">
                      Belum ada akun kas.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.kode} className="bg-white hover:bg-zinc-50/50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-700">{r.kode}</td>
                      <td className="px-4 py-3 font-medium text-zinc-900">{r.nama}</td>
                      <td className="px-4 py-3">
                        <Badge variant="neutral">{labelPeranJurnal(r.peranJurnal)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-zinc-900">
                        {formatRupiah(r.saldo)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          className="px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                          onClick={() => void onDelete(r.kode)}
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

        <Card className="p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Buat akun baru</h2>
          <p className="mt-1 text-sm text-zinc-500">Contoh: KAS-TOKO, BK-BCA, BK-MANDIRI.</p>

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            <div>
              <label htmlFor="ak-kode" className="block text-sm font-medium text-zinc-700">
                Kode
              </label>
              <input
                id="ak-kode"
                value={kode}
                onChange={(e) => setKode(e.target.value)}
                className={inputClass}
                placeholder="KAS-TOKO"
                disabled={submitting}
                required
              />
            </div>
            <div>
              <label htmlFor="ak-nama" className="block text-sm font-medium text-zinc-700">
                Nama
              </label>
              <input
                id="ak-nama"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className={inputClass}
                placeholder="Kas Toko / Bank BCA"
                disabled={submitting}
                required
              />
            </div>
            <div>
              <label htmlFor="ak-peran" className="block text-sm font-medium text-zinc-700">
                Dicatat sebagai (di jurnal)
              </label>
              <select
                id="ak-peran"
                value={peranJurnal}
                onChange={(e) => setPeranJurnal(e.target.value)}
                className={inputClass}
                disabled={submitting}
              >
                {PERAN_JURNAL_KAS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-zinc-500">
                Menentukan sisi kas/bank saat dipakai di jurnal umum (pelunasan, transfer, dll.).
              </p>
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Menyimpan…" : "Simpan akun"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
