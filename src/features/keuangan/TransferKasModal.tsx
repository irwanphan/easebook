import { useEffect, useMemo, useState, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TokoInput, TokoSelect } from "@/components/ui/TokoInput";
import type { AkunKeuanganRow } from "@/data/keuangan";
import type { TransferKasInsertPayload } from "@/data/transferKas";
import { filterAkunBiayaPengeluaran } from "@/lib/akunBiayaPengeluaran";
import { useAuth } from "@/features/auth/AuthContext";
import { tauriErrorMessage } from "@/lib/tauriError";

function todayLocalISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function sanitizeAmount(value: string): number {
  const cleaned = value.replace(/[^0-9]/g, "");
  if (!cleaned) return 0;
  return Math.max(0, parseInt(cleaned, 10) || 0);
}

export type TransferKasModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (nomor: string) => void;
};

export function TransferKasModal({ open, onClose, onSuccess }: TransferKasModalProps) {
  const { session } = useAuth();
  const [tanggal, setTanggal] = useState(todayLocalISODate);
  const [sumber, setSumber] = useState("");
  const [tujuan, setTujuan] = useState("");
  const [nominalKirim, setNominalKirim] = useState(0);
  const [nominalTerima, setNominalTerima] = useState(0);
  const [biaya, setBiaya] = useState(0);
  const [akunBiaya, setAkunBiaya] = useState("");
  const [catatan, setCatatan] = useState("");
  const [akunList, setAkunList] = useState<AkunKeuanganRow[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingMaster(true);
    setError(null);
    (async () => {
      try {
        const list = await invoke<AkunKeuanganRow[]>("akun_keuangan_list");
        if (cancelled) return;
        setAkunList(list);
      } catch (e) {
        if (!cancelled) setError(tauriErrorMessage(e));
      } finally {
        if (!cancelled) setLoadingMaster(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (open) return;
    setTanggal(todayLocalISODate());
    setSumber("");
    setTujuan("");
    setNominalKirim(0);
    setNominalTerima(0);
    setBiaya(0);
    setAkunBiaya("");
    setCatatan("");
    setError(null);
    setSubmitting(false);
  }, [open]);

  const akunKasList = useMemo(() => akunList.filter((a) => a.isAkunKas), [akunList]);
  const akunBiayaList = useMemo(() => filterAkunBiayaPengeluaran(akunList), [akunList]);

  const sumberRow = useMemo(
    () => akunKasList.find((a) => a.kode === sumber),
    [akunKasList, sumber],
  );
  const tujuanRow = useMemo(
    () => akunKasList.find((a) => a.kode === tujuan),
    [akunKasList, tujuan],
  );

  const selisihKirimTerima = useMemo(
    () => nominalKirim - (nominalTerima + biaya),
    [nominalKirim, nominalTerima, biaya],
  );
  const balanced = selisihKirimTerima === 0;

  const disableSubmit =
    submitting ||
    loadingMaster ||
    !sumber ||
    !tujuan ||
    sumber === tujuan ||
    nominalKirim <= 0 ||
    nominalTerima <= 0 ||
    biaya < 0 ||
    (biaya > 0 && !akunBiaya) ||
    !balanced;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (disableSubmit) return;
    if (!session?.username) {
      setError("Sesi pengguna tidak terbaca — silakan login ulang.");
      return;
    }

    const payload: TransferKasInsertPayload = {
      tanggal: tanggal.trim(),
      akunSumberKode: sumber.trim(),
      akunTujuanKode: tujuan.trim(),
      nominalKirim: Math.round(nominalKirim),
      nominalTerima: Math.round(nominalTerima),
      biayaTransfer: Math.round(biaya),
      akunBiayaKode: biaya > 0 ? akunBiaya.trim() : null,
      catatan: catatan.trim(),
      actorUsername: session.username,
      actorNama: session.namaLengkap ?? "",
    };

    setSubmitting(true);
    setError(null);
    try {
      const nomor = await invoke<string>("transfer_kas_insert", { payload });
      onSuccess(nomor);
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={submitting ? () => undefined : onClose}
      title="Transfer antar rekening kas"
      panelClassName="max-w-2xl"
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button type="submit" form="transfer-kas-form" disabled={disableSubmit}>
            {submitting ? "Menyimpan…" : "Simpan transfer"}
          </Button>
        </div>
      }
    >
      <form
        id="transfer-kas-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-5"
      >
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            {error}
          </div>
        ) : null}

        <TokoInput
          label="Tanggal transfer"
          type="date"
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
          disabled={submitting}
          required
        />

        <div className="grid gap-4 md:grid-cols-2">
          <TokoSelect
            label="Kas asal"
            value={sumber}
            onChange={(e) => setSumber(e.target.value)}
            disabled={submitting || loadingMaster}
            hint={sumberRow ? `Saldo ${formatRupiah(sumberRow.saldo)}` : undefined}
            required
          >
            <option value="">— Pilih akun kas —</option>
            {akunKasList.map((a) => (
              <option key={a.kode} value={a.kode}>
                {a.kode} — {a.nama}
              </option>
            ))}
          </TokoSelect>
          <TokoInput
            label="Nominal dikirim"
            type="text"
            inputMode="numeric"
            value={nominalKirim ? nominalKirim.toLocaleString("id-ID") : ""}
            onChange={(e) => setNominalKirim(sanitizeAmount(e.target.value))}
            disabled={submitting}
            placeholder="0"
            className="text-right"
            required
          />
          <TokoSelect
            label="Kas tujuan"
            value={tujuan}
            onChange={(e) => setTujuan(e.target.value)}
            disabled={submitting || loadingMaster}
            error={sumber && tujuan && sumber === tujuan ? "Tidak boleh sama dengan kas asal." : undefined}
            hint={
              sumber && tujuan && sumber !== tujuan && tujuanRow
                ? `Saldo ${formatRupiah(tujuanRow.saldo)}`
                : undefined
            }
            required
          >
            <option value="">— Pilih akun kas —</option>
            {akunKasList
              .filter((a) => a.kode !== sumber)
              .map((a) => (
                <option key={a.kode} value={a.kode}>
                  {a.kode} — {a.nama}
                </option>
              ))}
          </TokoSelect>
          <TokoInput
            label="Nominal diterima"
            type="text"
            inputMode="numeric"
            value={nominalTerima ? nominalTerima.toLocaleString("id-ID") : ""}
            onChange={(e) => setNominalTerima(sanitizeAmount(e.target.value))}
            disabled={submitting}
            placeholder="0"
            className="text-right"
            required
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TokoInput
            label="Biaya transfer"
            type="text"
            inputMode="numeric"
            value={biaya ? biaya.toLocaleString("id-ID") : ""}
            onChange={(e) => setBiaya(sanitizeAmount(e.target.value))}
            disabled={submitting}
            placeholder="0"
            className="text-right"
            hint="Selisih kirim − terima; otomatis jadi 0 jika sama besar."
          />
          <TokoSelect
            label="Akun biaya"
            value={akunBiaya}
            onChange={(e) => setAkunBiaya(e.target.value)}
            disabled={submitting || biaya === 0 || loadingMaster}
            hint={biaya === 0 ? "Tidak diperlukan jika biaya 0." : "Catat biaya ke akun ini."}
            required={biaya > 0}
          >
            <option value="">— Pilih akun biaya —</option>
            {akunBiayaList.map((a) => (
              <option key={a.kode} value={a.kode}>
                {a.kode} — {a.nama}
              </option>
            ))}
          </TokoSelect>
        </div>

        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            balanced
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {balanced ? (
            <p>
              Balance — kirim <strong>{formatRupiah(nominalKirim)}</strong> = terima{" "}
              <strong>{formatRupiah(nominalTerima)}</strong> + biaya{" "}
              <strong>{formatRupiah(biaya)}</strong>.
            </p>
          ) : (
            <p>
              Selisih <strong>{formatRupiah(Math.abs(selisihKirimTerima))}</strong> — pastikan kirim
              = terima + biaya sebelum menyimpan.
            </p>
          )}
        </div>

        <TokoInput
          label="Catatan"
          type="text"
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          disabled={submitting}
          placeholder="opsional"
        />

        <p className="text-xs leading-relaxed text-zinc-500">
          Saat disimpan: tercatat di daftar transfer, jurnal umum (debit kas tujuan + biaya, kredit
          kas asal), dan audit log (siapa, kapan, nilai sebelum/sesudah). Audit log tidak bisa
          diubah.
        </p>
      </form>
    </Modal>
  );
}
