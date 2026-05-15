import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { AkunKeuanganInsertPayload, AkunKeuanganRow } from "@/data/keuangan";
import { KELOMPOK_LABA_RUGI, labelKelompokLr } from "@/data/keuangan";
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

export function DaftarAkunPage() {
  const [rows, setRows] = useState<AkunKeuanganRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [indukKode, setIndukKode] = useState("");
  const [kelompokLr, setKelompokLr] = useState("");
  const [isAkunKas, setIsAkunKas] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const indukOptions = useMemo(
    () => rows.filter((r) => !kode.trim() || r.kode.toLowerCase() !== kode.trim().toLowerCase()),
    [rows, kode],
  );

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (submitting) return;
      setError(null);

      const payload: AkunKeuanganInsertPayload = {
        kode: kode.trim(),
        nama: nama.trim(),
        indukKode: indukKode.trim() ? indukKode.trim() : null,
        kelompokLr: kelompokLr.trim() || null,
        isAkunKas,
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
        await invoke("akun_keuangan_insert", { payload });
        setKode("");
        setNama("");
        setIndukKode("");
        setKelompokLr("");
        setIsAkunKas(false);
        await refresh();
      } catch (err) {
        setError(tauriErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
    },
    [kode, nama, indukKode, kelompokLr, isAkunKas, submitting, refresh],
  );

  const onDelete = useCallback(
    async (kodeRow: string) => {
      const ok = window.confirm(`Hapus akun ${kodeRow}?`);
      if (!ok) return;
      setError(null);
      try {
        await invoke("akun_keuangan_delete", { kode: kodeRow });
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
        title="Daftar akun"
        description="Chart of accounts: kode, nama, induk, kelompok laba rugi. Centang akun kas untuk akun yang saldonya dilacak dari jurnal."
      />

      {error ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Semua akun</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Akun kas menampilkan saldo (awal 0, berubah dari jurnal). Akun lain dipakai di jurnal umum sesuai konfigurasi.
          </p>

          <div className="mt-5 overflow-x-auto rounded-xl border border-zinc-100">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-3 py-3">Kode</th>
                  <th className="px-3 py-3">Nama akun</th>
                  <th className="px-3 py-3">Induk</th>
                  <th className="px-3 py-3">Laba rugi</th>
                  <th className="px-3 py-3">Kas</th>
                  <th className="px-3 py-3 text-right">Saldo kas</th>
                  <th className="px-3 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-5 text-center text-sm text-zinc-500">
                      Memuat akun…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-500">
                      Belum ada akun.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.kode} className="bg-white hover:bg-zinc-50/50">
                      <td className="px-3 py-3 font-mono text-xs font-semibold text-brand-700">{r.kode}</td>
                      <td className="px-3 py-3 font-medium text-zinc-900">{r.nama}</td>
                      <td className="px-3 py-3 text-xs text-zinc-600">
                        {r.indukKode ? (
                          <span>
                            <span className="font-mono text-zinc-500">{r.indukKode}</span>
                            {r.indukNama ? ` · ${r.indukNama}` : null}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-zinc-600">
                        {r.kelompokLr ? labelKelompokLr(r.kelompokLr) : "—"}
                      </td>
                      <td className="px-3 py-3">
                        {r.isAkunKas ? (
                          <Badge variant="success">Akun kas</Badge>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-zinc-900">
                        {r.isAkunKas ? formatRupiah(r.saldo) : "—"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          className="px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
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
          <h2 className="text-sm font-semibold text-zinc-900">Tambah akun</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Contoh: 1-100 Kas Toko, 1-110 Bank BCA (centang akun kas), 4-100 Pendapatan penjualan.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            <div>
              <label htmlFor="da-kode" className="block text-sm font-medium text-zinc-700">
                Kode akun
              </label>
              <input
                id="da-kode"
                value={kode}
                onChange={(e) => setKode(e.target.value)}
                className={inputClass}
                placeholder="1-100"
                disabled={submitting}
                required
              />
            </div>
            <div>
              <label htmlFor="da-nama" className="block text-sm font-medium text-zinc-700">
                Nama akun
              </label>
              <input
                id="da-nama"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className={inputClass}
                placeholder="Kas Toko"
                disabled={submitting}
                required
              />
            </div>
            <div>
              <label htmlFor="da-induk" className="block text-sm font-medium text-zinc-700">
                Induk akun (opsional)
              </label>
              <select
                id="da-induk"
                value={indukKode}
                onChange={(e) => setIndukKode(e.target.value)}
                className={inputClass}
                disabled={submitting}
              >
                <option value="">— Tanpa induk —</option>
                {indukOptions.map((a) => (
                  <option key={a.kode} value={a.kode}>
                    {a.kode} — {a.nama}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="da-lr" className="block text-sm font-medium text-zinc-700">
                Kelompok laba rugi (opsional)
              </label>
              <select
                id="da-lr"
                value={kelompokLr}
                onChange={(e) => setKelompokLr(e.target.value)}
                className={inputClass}
                disabled={submitting}
              >
                {KELOMPOK_LABA_RUGI.map((o) => (
                  <option key={o.value || "none"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3">
              <input
                type="checkbox"
                checked={isAkunKas}
                onChange={(e) => setIsAkunKas(e.target.checked)}
                disabled={submitting}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
              />
              <span>
                <span className="block text-sm font-medium text-zinc-900">Sebagai akun kas</span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  Hanya akun yang dicentang yang muncul di pilihan kas jurnal dan saldonya dilacak.
                </span>
              </span>
            </label>

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
