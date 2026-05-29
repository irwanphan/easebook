import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { emptyKontakMasterRow, type KontakMasterRow } from "@/data/kontakMaster";
import { KontakMasterFields } from "@/features/kontak-master/KontakMasterFields";
import { usePelanggan } from "@/features/pelanggan/PelangganContext";
import { tauriErrorMessage } from "@/lib/tauriError";

export function UbahPelangganPage() {
  const { kode: kodeParam } = useParams();
  const kode = kodeParam ? decodeURIComponent(kodeParam) : "";
  const navigate = useNavigate();
  const { items, loading, getByKode, updateItem } = usePelanggan();

  const [values, setValues] = useState<KontakMasterRow>(() => emptyKontakMasterRow());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    const row = getByKode(kode);
    if (row) {
      setValues({ ...row });
    }
    setReady(true);
  }, [loading, kode, items, getByKode]);

  const found = ready && !loading && Boolean(getByKode(kode));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!values.nama.trim()) {
      setError("Nama wajib diisi.");
      return;
    }

    try {
      await updateItem(kode, {
        nama: values.nama.trim(),
        alamat: values.alamat.trim(),
        kota: values.kota.trim(),
        telepon: values.telepon.trim(),
        email: values.email.trim(),
        npwp: values.npwp.trim(),
        catatan: values.catatan.trim(),
      });
      navigate("/manajemen/pelanggan");
    } catch (err) {
      setError(tauriErrorMessage(err));
    }
  }

  if (ready && !loading && !found) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <PageHeader title="Pelanggan tidak ditemukan" description="Kode tidak ada di daftar pelanggan." />
        <Button type="button" variant="ghost" className="self-start" onClick={() => navigate("/manajemen/pelanggan")}>
          Kembali ke daftar
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          to="/manajemen/pelanggan"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke daftar
        </Link>
        <PageHeader 
          title="Ubah pelanggan" 
          description="Perbarui data kontak; kode tidak dapat diubah." 
        />
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

          {loading || !ready ? (
            <p className="text-sm text-zinc-500">Memuat…</p>
          ) : (
            <KontakMasterFields idPrefix="plg-edit" values={values} onChange={setValues} kodeReadOnly />
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-zinc-100 pt-5">
            <Button type="button" variant="outline" onClick={() => navigate("/manajemen/pelanggan")}>
              <X className="h-4 w-4" aria-hidden />
              Batal
            </Button>
            <Button type="submit" disabled={loading || !ready || !found}>
              <Save className="h-4 w-4" aria-hidden />
              {loading || !ready || !found ? "Menyimpan…" : "Simpan perubahan"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
