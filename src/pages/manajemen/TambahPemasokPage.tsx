import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { emptyKontakMasterRow, type KontakMasterRow } from "@/data/kontakMaster";
import { KontakMasterFields } from "@/features/kontak-master/KontakMasterFields";
import { usePemasok } from "@/features/pemasok/PemasokContext";
import { tauriErrorMessage } from "@/lib/tauriError";

export function TambahPemasokPage() {
  const navigate = useNavigate();
  const { addItem, kodeExists } = usePemasok();
  const [values, setValues] = useState<KontakMasterRow>(() => emptyKontakMasterRow());
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const kodeTrim = values.kode.trim();
    if (!kodeTrim) {
      setError("Kode wajib diisi.");
      return;
    }
    if (await kodeExists(kodeTrim)) {
      setError("Kode sudah dipakai. Gunakan kode lain.");
      return;
    }
    if (!values.nama.trim()) {
      setError("Nama wajib diisi.");
      return;
    }

    const row: KontakMasterRow = {
      ...values,
      kode: kodeTrim.toUpperCase(),
      nama: values.nama.trim(),
      alamat: values.alamat.trim(),
      kota: values.kota.trim(),
      telepon: values.telepon.trim(),
      email: values.email.trim(),
      npwp: values.npwp.trim(),
      catatan: values.catatan.trim(),
    };

    try {
      await addItem(row);
      navigate("/manajemen/pemasok");
    } catch (err) {
      setError(tauriErrorMessage(err));
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          to="/manajemen/pemasok"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke daftar
        </Link>
        <PageHeader title="Tambah pemasok" description="Simpan data kontak supplier ke database lokal." />
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
            >
              {error}
            </div>
          ) : null}

          <KontakMasterFields idPrefix="sup" values={values} onChange={setValues} kodeReadOnly={false} />

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-zinc-100 pt-5">
            <Button type="button" variant="ghost" onClick={() => navigate("/manajemen/pemasok")}>
              Batal
            </Button>
            <Button type="submit">Simpan</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
