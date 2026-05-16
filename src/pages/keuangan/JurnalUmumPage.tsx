import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type {
  AkunKeuanganRow,
  JurnalJenisTransaksi,
  JurnalKonfigurasi,
  JurnalTransaksiInsertPayload,
  JurnalUmumListRow,
} from "@/data/keuangan";
import { isJurnalKonfigurasiComplete } from "@/features/keuangan/jurnalKonfigurasi";
import { tauriErrorMessage } from "@/lib/tauriError";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

function todayLocalISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

const JENIS_OPTIONS: { value: JurnalJenisTransaksi; label: string }[] = [
  { value: "PEMBELIAN", label: "Pembelian (hutang / inventori)" },
  { value: "PEMBELIAN_TUNAI", label: "Pembelian tunai (kas keluar)" },
  { value: "PENJUALAN", label: "Penjualan (naik piutang)" },
  { value: "PELUNASAN_PIUTANG", label: "Pelunasan piutang (kas masuk)" },
  { value: "PELUNASAN_HUTANG", label: "Pelunasan hutang (kas keluar)" },
  { value: "PENERIMAAN_LAINNYA", label: "Penerimaan lain (kas masuk)" },
  { value: "PENGELUARAN_LAINNYA", label: "Pengeluaran lain (kas keluar)" },
  { value: "TRANSFER", label: "Transfer antar akun kas" },
];

function jenisBadgeVariant(jenis: string) {
  if (jenis === "PEMBELIAN" || jenis === "PEMBELIAN_TUNAI") return "neutral" as const;
  if (jenis === "PENJUALAN") return "success" as const;
  if (jenis === "PELUNASAN_PIUTANG" || jenis === "PENERIMAAN_LAINNYA") return "processing" as const;
  if (jenis === "PELUNASAN_HUTANG" || jenis === "PENGELUARAN_LAINNYA") return "delayed" as const;
  if (jenis === "TRANSFER") return "warning" as const;
  return "neutral" as const;
}

function jenisLabel(jenis: string) {
  return JENIS_OPTIONS.find((o) => o.value === jenis)?.label ?? jenis;
}

export function JurnalUmumPage() {
  const [akunList, setAkunList] = useState<AkunKeuanganRow[]>([]);
  const [akunLoading, setAkunLoading] = useState(true);
  const [config, setConfig] = useState<JurnalKonfigurasi | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<JurnalUmumListRow[]>([]);
  const [listLoading, setListLoading] = useState(true);

  // Form tambah jurnal (template)
  const [jenis, setJenis] = useState<JurnalJenisTransaksi>("PENJUALAN");
  const [tanggal, setTanggal] = useState(todayLocalISODate);
  const [referensi, setReferensi] = useState("");
  const [catatan, setCatatan] = useState("");
  const [jumlah, setJumlah] = useState(0);

  const kasList = useMemo(() => akunList.filter((a) => a.isAkunKas), [akunList]);

  const [kasKode, setKasKode] = useState<string>("");
  const [kasSumberKode, setKasSumberKode] = useState<string>("");
  const [kasTargetKode, setKasTargetKode] = useState<string>("");

  const fetchAkun = useCallback(async () => {
    setAkunLoading(true);
    setError(null);
    try {
      const list = await invoke<AkunKeuanganRow[]>("akun_keuangan_list");
      setAkunList(list);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setAkunList([]);
    } finally {
      setAkunLoading(false);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    setConfigLoading(true);
    setError(null);
    try {
      const c = await invoke<JurnalKonfigurasi>("jurnal_konfigurasi_get");
      setConfig(c);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setConfig(null);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const fetchRows = useCallback(async () => {
    setListLoading(true);
    setError(null);
    try {
      const list = await invoke<JurnalUmumListRow[]>("jurnal_umum_list");
      setRows(list);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setRows([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAkun();
    void fetchConfig();
    void fetchRows();
  }, [fetchAkun, fetchConfig, fetchRows]);

  useEffect(() => {
    if (!kasKode && kasList.length > 0) setKasKode(kasList[0].kode);
    if (!kasSumberKode && kasList.length > 0) setKasSumberKode(kasList[0].kode);
    if (!kasTargetKode && kasList.length > 1) setKasTargetKode(kasList[1].kode);
  }, [kasList, kasKode, kasSumberKode, kasTargetKode]);

  const configMissing = useMemo(() => !isJurnalKonfigurasiComplete(config), [config]);

  const onInsert = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (loading) return;
      if (configMissing) {
        setError("Konfigurasi akun jurnal belum lengkap. Atur di halaman Konfigurasi akun jurnal.");
        return;
      }
      if (!tanggal.trim()) {
        setError("Tanggal wajib diisi.");
        return;
      }
      if (!referensi.trim()) {
        setError("Referensi wajib diisi.");
        return;
      }
      if (!Number.isFinite(jumlah) || jumlah <= 0) {
        setError("Jumlah harus lebih dari 0.");
        return;
      }

      // Validasi kebutuhan kas untuk jenis tertentu
      if (
        jenis === "PEMBELIAN_TUNAI" ||
        jenis === "PELUNASAN_PIUTANG" ||
        jenis === "PENERIMAAN_LAINNYA" ||
        jenis === "PELUNASAN_HUTANG" ||
        jenis === "PENGELUARAN_LAINNYA"
      ) {
        if (!kasKode.trim()) {
          setError("Pilih akun kas/bank.");
          return;
        }
      }
      if (jenis === "TRANSFER") {
        if (!kasSumberKode.trim() || !kasTargetKode.trim() || kasSumberKode === kasTargetKode) {
          setError("Pilih akun kas sumber dan target yang berbeda.");
          return;
        }
      }

      setLoading(true);
      setError(null);
      try {
        const payload: JurnalTransaksiInsertPayload = {
          tanggal: tanggal.trim(),
          jenis,
          referensi: referensi.trim(),
          catatan: catatan.trim(),
          jumlah: Math.round(jumlah),
          kasKode: jenis === "TRANSFER" ? null : kasKode.trim() || null,
          kasSumberKode: jenis === "TRANSFER" ? kasSumberKode.trim() || null : null,
          kasTargetKode: jenis === "TRANSFER" ? kasTargetKode.trim() || null : null,
        };

        await invoke("jurnal_umum_insert_transaksi", { payload });
        setReferensi("");
        setCatatan("");
        setJumlah(0);
        await fetchRows();
      } catch (err) {
        setError(tauriErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [catatan, configMissing, fetchRows, jumlah, kasKode, kasSumberKode, kasTargetKode, jenis, loading, referensi, tanggal],
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Jurnal umum"
        description="Catat semua transaksi keuangan. Pasangan debit/kredit mengikuti konfigurasi akun jurnal."
      />

      {configMissing && !configLoading ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Konfigurasi akun jurnal belum lengkap.{" "}
          <Link to="/keuangan/konfigurasi-akun-jurnal" className="font-semibold text-brand-700 hover:underline">
            Atur konfigurasi akun jurnal
          </Link>{" "}
          sebelum menyimpan transaksi template.
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      <div className="mx-auto max-w-2xl">
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Tambah jurnal (template)</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Input jumlah transaksi dan pilih akun kas untuk transaksi yang membutuhkan cash. Sistem akan membuat debit/kredit otomatis.
          </p>

          <form onSubmit={onInsert} className="mt-5 flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Jenis transaksi</label>
              <select value={jenis} onChange={(e) => setJenis(e.target.value as JurnalJenisTransaksi)} className={inputClass} disabled={loading}>
                {JENIS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-zinc-700">Tanggal</label>
                <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className={inputClass} disabled={loading} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Jumlah</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={jumlah || 0}
                  onChange={(e) => setJumlah(Number.parseInt(e.target.value, 10) || 0)}
                  className={inputClass}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">Referensi</label>
              <input value={referensi} onChange={(e) => setReferensi(e.target.value)} className={inputClass} disabled={loading} placeholder="contoh: SO-2026-001" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">Catatan</label>
              <input value={catatan} onChange={(e) => setCatatan(e.target.value)} className={inputClass} disabled={loading} placeholder="opsional" />
            </div>

            {(jenis === "PEMBELIAN_TUNAI" ||
              jenis === "PELUNASAN_PIUTANG" ||
              jenis === "PENERIMAAN_LAINNYA" ||
              jenis === "PELUNASAN_HUTANG" ||
              jenis === "PENGELUARAN_LAINNYA") && (
              <div>
                <label className="block text-sm font-medium text-zinc-700">Akun kas / bank</label>
                <select value={kasKode} onChange={(e) => setKasKode(e.target.value)} className={inputClass} disabled={loading}>
                  {kasList.map((a) => (
                    <option key={a.kode} value={a.kode}>
                      {a.kode} — {a.nama}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {jenis === "TRANSFER" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-zinc-700">Kas sumber</label>
                  <select value={kasSumberKode} onChange={(e) => setKasSumberKode(e.target.value)} className={inputClass} disabled={loading}>
                    {kasList.map((a) => (
                      <option key={a.kode} value={a.kode}>
                        {a.kode} — {a.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700">Kas target</label>
                  <select value={kasTargetKode} onChange={(e) => setKasTargetKode(e.target.value)} className={inputClass} disabled={loading}>
                    {kasList.map((a) => (
                      <option key={a.kode} value={a.kode}>
                        {a.kode} — {a.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="pt-1">
              <Button type="submit" disabled={loading || akunLoading || configMissing || kasList.length === 0} className="w-full">
                {loading ? "Menyimpan…" : "Simpan jurnal"}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Riwayat jurnal</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Setiap transaksi ditampilkan per baris akun (debit dan kredit terpisah).
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={() => void fetchRows()} disabled={listLoading}>
            {listLoading ? "Memuat…" : "Refresh"}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3">Tanggal</th>
                <th className="px-5 py-3">Jenis</th>
                <th className="px-5 py-3">Referensi</th>
                <th className="px-5 py-3">Akun</th>
                <th className="px-5 py-3">Catatan</th>
                <th className="px-5 py-3 text-right">Debit</th>
                <th className="px-5 py-3 text-right">Kredit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {listLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-zinc-500">
                    Memuat jurnal…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-zinc-500">
                    Belum ada jurnal.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.lineId} className="bg-white hover:bg-zinc-50/50">
                    <td className="px-5 py-3 text-zinc-600">{r.tanggal}</td>
                    <td className="px-5 py-3">
                      <Badge variant={jenisBadgeVariant(r.jenis)}>{jenisLabel(r.jenis)}</Badge>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-brand-700">
                      {r.referensi || "—"}
                    </td>
                    <td className="px-5 py-3 text-zinc-800">
                      <span className="font-mono text-xs font-medium">{r.akunKode}</span>
                      <span className="text-zinc-500"> — {r.akunNama}</span>
                    </td>
                    <td className="px-5 py-3 text-zinc-600">{r.catatan || "—"}</td>
                    <td className="px-5 py-3 text-right font-medium text-zinc-900">
                      {r.debit > 0 ? formatRupiah(r.debit) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-zinc-900">
                      {r.kredit > 0 ? formatRupiah(r.kredit) : "—"}
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

