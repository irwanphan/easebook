import { useEffect, useMemo, useState, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { AkunKeuanganRow } from "@/data/keuangan";
import type { TransferKasInsertPayload } from "@/data/transferKas";
import { filterAkunBiayaPengeluaran } from "@/lib/akunBiayaPengeluaran";
import { useAuth } from "@/features/auth/AuthContext";
import { tauriErrorMessage } from "@/lib/tauriError";
import {
  EMPTY_TRANSFER_KAS_FORM,
  TransferKasFormFields,
  todayLocalISODate,
  validateTransferKas,
  type TransferKasFormState,
} from "./TransferKasFormFields";
import { Save, X } from "lucide-react";

export type TransferKasModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (nomor: string) => void;
};

export function TransferKasModal({ open, onClose, onSuccess }: TransferKasModalProps) {
  const { session } = useAuth();
  const [form, setForm] = useState<TransferKasFormState>(() => ({
    ...EMPTY_TRANSFER_KAS_FORM,
    tanggal: todayLocalISODate(),
  }));
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
        if (!cancelled) setAkunList(list);
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
    setForm({ ...EMPTY_TRANSFER_KAS_FORM, tanggal: todayLocalISODate() });
    setError(null);
    setSubmitting(false);
  }, [open]);

  const akunKasList = useMemo(() => akunList.filter((a) => a.isAkunKas), [akunList]);
  const akunBiayaList = useMemo(() => filterAkunBiayaPengeluaran(akunList), [akunList]);

  const formError = useMemo(() => validateTransferKas(form), [form]);
  const disableSubmit = submitting || loadingMaster || formError !== null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (disableSubmit) return;
    if (!session?.username) {
      setError("Sesi pengguna tidak terbaca — silakan login ulang.");
      return;
    }

    const payload: TransferKasInsertPayload = {
      tanggal: form.tanggal.trim(),
      akunSumberKode: form.sumber.trim(),
      akunTujuanKode: form.tujuan.trim(),
      nominalKirim: Math.round(form.nominalKirim),
      nominalTerima: Math.round(form.nominalTerima),
      biayaTransfer: Math.round(form.biaya),
      akunBiayaKode: form.biaya > 0 ? form.akunBiaya.trim() : null,
      catatan: form.catatan.trim(),
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
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            <X className="h-4 w-4" aria-hidden />
            Batal
          </Button>
          <Button type="submit" form="transfer-kas-form" disabled={disableSubmit}>
            <Save className="h-4 w-4" aria-hidden />
            {submitting ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      }
    >
      <form id="transfer-kas-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            {error}
          </div>
        ) : null}

        <TransferKasFormFields
          value={form}
          onChange={setForm}
          akunKasList={akunKasList}
          akunBiayaList={akunBiayaList}
          disabled={submitting}
          loadingMaster={loadingMaster}
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
