/**
 * Step 4 — Saldo awal kas & stok.
 *
 * Form lengkap untuk dua jenis saldo awal cukup kompleks (butuh akun
 * historical balance, pilih barang × gudang, satuan konversi, dll.) dan
 * sudah punya halaman dedicated. Untuk wizard, kita cukup:
 *  - jelaskan konteksnya,
 *  - tawarkan pintasan ke halaman pengaturan kas awal dan stok awal,
 *  - tunjukkan status terkini (sudah ada entri / belum).
 *
 * Step ini opsional — banyak SME baru memulai dari nol dan tidak punya
 * saldo awal sama sekali.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Coins,
  ExternalLink,
  Info,
  Package,
} from "lucide-react";
import { kasAwalGet } from "@/features/keuangan/kasAwalInvoke";
import { stokAwalGet } from "@/features/barang-jasa/stokAwalInvoke";
import { OnboardingStepHeader } from "@/features/onboarding/components/OnboardingStepHeader";

type RingkasanRow = {
  label: string;
  jumlah: number;
  hint: string;
};

type Props = {
  onSaved: () => Promise<void>;
};

export function StepSaldoAwal({ onSaved }: Props) {
  const [kasJumlah, setKasJumlah] = useState<number | null>(null);
  const [stokJumlah, setStokJumlah] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      const [kas, stok] = await Promise.all([
        kasAwalGet().catch(() => null),
        stokAwalGet().catch(() => null),
      ]);
      if (cancelled) return;
      setKasJumlah(kas?.entries?.length ?? 0);
      setStokJumlah(stok?.entries?.length ?? 0);
      setLoading(false);
      await onSaved();
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
    // onSaved sengaja tidak ada di deps — hanya butuh sekali saat mount
    // untuk re-evaluasi checklist global setelah fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows: RingkasanRow[] = [
    {
      label: "Saldo awal kas & bank",
      jumlah: kasJumlah ?? 0,
      hint:
        "Isi jika Anda sudah punya saldo di kas/bank sebelum tanggal awal periode. Kalau mulai dari nol, lewati saja.",
    },
    {
      label: "Saldo awal stok",
      jumlah: stokJumlah ?? 0,
      hint:
        "Isi jika Anda sudah punya stok barang sebelum tanggal awal periode. Anda akan diminta memilih barang, gudang, dan nilai per unit.",
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6">
      <OnboardingStepHeader
        icon={Coins}
        judul="Saldo awal kas & stok"
        wajib={false}
        deskripsi="Catatan saldo per tanggal awal periode. Boleh diisi nanti — laporan tetap dapat dibuat untuk transaksi setelah tanggal awal."
      />

      <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50/60 px-3 py-2.5 text-xs leading-relaxed text-sky-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          Form saldo awal cukup detail dan punya halaman tersendiri. Klik tombol di bawah untuk membuka,
          atau lewati langkah ini dan kembali kapan saja dari menu Keuangan / Barang.
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Memeriksa status saldo awal…</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row, idx) => (
            <li
              key={row.label}
              className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600"
                >
                  {idx === 0 ? <Coins className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                </span>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{row.label}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{row.hint}</p>
                  {row.jumlah > 0 ? (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      {row.jumlah} entri sudah tersimpan.
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-zinc-400">Belum ada entri.</p>
                  )}
                </div>
              </div>

              <Link
                to={idx === 0 ? "/keuangan/kas-awal" : "/barang-jasa/atur-stok-awal"}
                target="_blank"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                {row.jumlah > 0 ? "Lihat / ubah" : "Atur sekarang"}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
