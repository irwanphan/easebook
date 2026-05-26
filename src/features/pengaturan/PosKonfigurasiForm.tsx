import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { AkunKeuanganRow } from "@/data/keuangan";
import {
  isPosKonfigurasiLengkap,
  POS_KONFIGURASI_DEFAULT,
  type PosKonfigurasi,
} from "@/data/posKonfigurasi";
import { posKonfigurasiGet, posKonfigurasiSet } from "@/features/pos/posInvoke";
import { tauriErrorMessage } from "@/lib/tauriError";
import { TokoSelect } from "@/components/ui/TokoInput";

type FieldDef = {
  key: "kasUtamaKode" | "kasKasirKode" | "akunSelisihKasKode";
  label: string;
  hint: string;
  /** True bila wajib diisi. */
  required: boolean;
};

const FIELDS: FieldDef[] = [
  {
    key: "kasUtamaKode",
    label: "Kas Operasional Utama",
    hint: "Sumber modal saat buka shift, dan tujuan pengembalian saat tutup shift. Biasanya 'Kas Besar' atau akun bank operasional utama.",
    required: true,
  },
  {
    key: "kasKasirKode",
    label: "Kas Kasir (laci)",
    hint: "Saldo fisik di laci kasir. Pembayaran tunai POS dan semua metode bayar bertanda 'tunai' otomatis disinkronkan ke akun ini.",
    required: true,
  },
  {
    key: "akunSelisihKasKode",
    label: "Akun Selisih Kas",
    hint: "Penampung selisih saat tutup shift. Selisih lebih → di-kredit ke akun ini. Selisih kurang → di-debit. Boleh akun penyesuaian/pendapatan/beban — sesuaikan dengan kebijakan.",
    required: false,
  },
];

/**
 * Form pengaturan kas POS. Bisa dipakai di PengaturanPage atau halaman lain.
 *
 * Tanggung jawab:
 *  - Memuat daftar akun kas & konfigurasi POS saat mount
 *  - Validasi dasar (Kas Utama ≠ Kas Kasir, keduanya wajib)
 *  - Submit ke backend, menampilkan pesan sukses/gagal
 *
 * Tidak melakukan apa-apa di luar scope ini (Single Responsibility).
 */
export function PosKonfigurasiForm() {
  const [akunKasList, setAkunKasList] = useState<AkunKeuanganRow[]>([]);
  const [akunSemuaList, setAkunSemuaList] = useState<AkunKeuanganRow[]>([]);
  const [cfg, setCfg] = useState<PosKonfigurasi>(POS_KONFIGURASI_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [akunList, current] = await Promise.all([
        invoke<AkunKeuanganRow[]>("akun_keuangan_list"),
        posKonfigurasiGet(),
      ]);
      setAkunSemuaList(akunList);
      setAkunKasList(akunList.filter((a) => a.isAkunKas));
      setCfg(current);
    } catch (e) {
      setError(tauriErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const validasi = useMemo(() => {
    if (!cfg.kasUtamaKode || !cfg.kasKasirKode) return null;
    if (cfg.kasUtamaKode.toLowerCase() === cfg.kasKasirKode.toLowerCase()) {
      return "Kas Utama dan Kas Kasir harus akun yang berbeda.";
    }
    return null;
  }, [cfg.kasUtamaKode, cfg.kasKasirKode]);

  function patch(next: Partial<PosKonfigurasi>) {
    setCfg((prev) => ({ ...prev, ...next }));
    setHint(null);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setHint(null);
    if (validasi) {
      setError(validasi);
      return;
    }
    setSaving(true);
    try {
      const updated = await posKonfigurasiSet({
        kasUtamaKode: cfg.kasUtamaKode,
        kasKasirKode: cfg.kasKasirKode,
        akunSelisihKasKode: cfg.akunSelisihKasKode,
      });
      setCfg(updated);
      setHint(
        "Pengaturan POS disimpan. Metode bayar tunai otomatis disinkronkan ke Kas Kasir.",
      );
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Memuat pengaturan POS…</p>;
  }

  const lengkap = isPosKonfigurasiLengkap(cfg);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}
      {hint ? (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{hint}</span>
        </div>
      ) : null}

      <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50/60 px-3 py-2.5 text-xs leading-relaxed text-sky-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">Bagaimana jurnal terbentuk</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            <li>
              Buka shift: <strong>D</strong> Kas Kasir, <strong>K</strong> Kas Utama, sebesar modal awal.
            </li>
            <li>
              Tutup shift, selisih lebih: <strong>D</strong> Kas Kasir, <strong>K</strong> Akun Selisih Kas.
              Selisih kurang: kebalikannya.
            </li>
            <li>
              Tutup shift, kembalikan ke Kas Utama: <strong>D</strong> Kas Utama, <strong>K</strong> Kas Kasir, sebesar input kasir.
              Sisanya stay di laci sebagai modal awal shift berikutnya.
            </li>
            <li>
              Saat disimpan, semua metode bayar bertanda <em>tunai</em> otomatis disinkronkan ke Kas Kasir.
            </li>
          </ul>
        </div>
      </div>

      {FIELDS.map((field) => {
        const value = cfg[field.key] ?? "";
        // Akun selisih bisa di luar akun kas (mis. Pendapatan/Beban Lain-lain),
        // tapi Kas Utama & Kas Kasir wajib akun kas.
        const opsi = field.key === "akunSelisihKasKode" ? akunSemuaList : akunKasList;
        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-zinc-700">
              {field.label}
              {field.required ? <span className="ml-1 text-rose-600">*</span> : null}
            </label>
            <p className="mt-0.5 mb-1.5 text-xs text-zinc-500">{field.hint}</p>
            <TokoSelect
              value={value}
              onChange={(e) => patch({ [field.key]: e.target.value || null } as Partial<PosKonfigurasi>)}
              disabled={saving}
            >
              <option value="">— Pilih akun —</option>
              {opsi.map((a) => (
                <option key={a.kode} value={a.kode}>
                  {a.kode} — {a.nama}
                </option>
              ))}
            </TokoSelect>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {lengkap ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Pengaturan lengkap — POS siap dipakai.
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            Kas Utama & Kas Kasir wajib dipilih sebelum POS bisa dipakai.
          </span>
        )}
        <Button type="submit" disabled={saving || Boolean(validasi)}>
          {saving ? "Menyimpan…" : "Simpan pengaturan POS"}
        </Button>
      </div>
    </form>
  );
}
