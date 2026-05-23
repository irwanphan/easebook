import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { AkunKeuanganRow } from "@/data/keuangan";
import type { TransferKasDetail, TransferKasInsertPayload } from "@/data/transferKas";
import { filterAkunBiayaPengeluaran } from "@/lib/akunBiayaPengeluaran";
import { useAuth } from "@/features/auth/AuthContext";
import { tauriErrorMessage } from "@/lib/tauriError";
import {
  EMPTY_TRANSFER_KAS_FORM,
  TransferKasFormFields,
  todayLocalISODate,
  validateTransferKas,
  type TransferKasFormState,
} from "@/features/keuangan/TransferKasFormFields";

export function UbahTransferKasPage() {
  const { nomor } = useParams<{ nomor: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const nomorTrim = (nomor ?? "").trim();

  const [form, setForm] = useState<TransferKasFormState>(() => ({
    ...EMPTY_TRANSFER_KAS_FORM,
    tanggal: todayLocalISODate(),
  }));
  const [akunList, setAkunList] = useState<AkunKeuanganRow[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
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
  }, []);

  useEffect(() => {
    if (!nomorTrim) {
      setError("Nomor transfer tidak valid.");
      setLoadingDetail(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const detail = await invoke<TransferKasDetail>("transfer_kas_detail", { nomor: nomorTrim });
        if (cancelled) return;
        setForm({
          tanggal: detail.tanggal,
          sumber: detail.akunSumberKode,
          tujuan: detail.akunTujuanKode,
          nominalKirim: detail.nominalKirim,
          nominalTerima: detail.nominalTerima,
          biaya: detail.biayaTransfer,
          akunBiaya: detail.akunBiayaKode ?? "",
          catatan: detail.catatan,
        });
      } catch (e) {
        if (!cancelled) setError(tauriErrorMessage(e));
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nomorTrim]);

  const akunKasList = useMemo(() => akunList.filter((a) => a.isAkunKas), [akunList]);
  const akunBiayaList = useMemo(() => filterAkunBiayaPengeluaran(akunList), [akunList]);

  const formError = useMemo(() => validateTransferKas(form), [form]);
  const loading = loadingMaster || loadingDetail;
  const disableSubmit = submitting || loading || formError !== null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (disableSubmit || !nomorTrim) return;
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
      await invoke("transfer_kas_update", { nomor: nomorTrim, payload });
      navigate("/keuangan/transfer", { replace: true });
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <Link
          to="/keuangan/transfer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke daftar transfer
        </Link>
        <PageHeader
          title={`Ubah transfer ${nomorTrim || ""}`.trim()}
          // description="Perbarui data transfer kas. Jurnal dan saldo otomatis diselaraskan lewat jurnal pembalik."
        />
      </div>

      <div
        role="note"
        className="flex gap-3 rounded-2xl border border-sky-200 bg-sky-50/70 px-5 py-4 text-sm text-sky-900"
      >
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" aria-hidden />
        <div className="space-y-1.5 leading-relaxed">
          <p className="font-semibold">Perubahan transfer dicatat sebagai jurnal pembalik + jurnal baru.</p>
          <p>
            Saat Anda menyimpan, sistem akan: <strong>(1)</strong> membuat jurnal pembalik untuk
            jurnal asal (debit↔kredit ditukar) sehingga saldo kembali ke kondisi sebelum transfer,
            <strong> (2)</strong> memosting jurnal baru sesuai nilai terbaru, dan{" "}
            <strong>(3)</strong> menulis baris audit log <em>UPDATE</em> berisi nilai lama dan baru.
            Jurnal asal tidak dihapus — jejak audit tetap utuh.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            {error}
          </div>
        ) : null}

        <Card className="p-5 sm:p-6">
          {loadingDetail ? (
            <p className="text-sm text-zinc-500">Memuat data transfer…</p>
          ) : (
            <TransferKasFormFields
              value={form}
              onChange={setForm}
              akunKasList={akunKasList}
              akunBiayaList={akunBiayaList}
              disabled={submitting}
              loadingMaster={loadingMaster}
            />
          )}
        </Card>

        <div className="flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/keuangan/transfer")}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button type="submit" disabled={disableSubmit}>
            {submitting ? "Menyimpan…" : "Simpan perubahan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
