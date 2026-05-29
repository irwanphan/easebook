import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useMerek } from "@/features/merek/MerekContext";
import { tauriErrorMessage } from "@/lib/tauriError";

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-zinc-700">
      {children}
    </label>
  );
}

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

const inputClassDisabled =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-mono text-zinc-700 shadow-sm outline-none";

const textareaClass =
  "mt-1 min-h-[100px] w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

export function UbahMerekPage() {
  const navigate = useNavigate();
  const { kode: rawKode } = useParams<{ kode: string }>();
  const kodeParam = rawKode ? decodeURIComponent(rawKode) : "";
  const { loading, getByKode, updateItem } = useMerek();

  const [nama, setNama] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    const row = getByKode(kodeParam);
    if (!row) {
      setNotFound(true);
      setLoaded(true);
      return;
    }
    setNama(row.nama);
    setDeskripsi(row.deskripsi);
    setLoaded(true);
  }, [loading, kodeParam, getByKode]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nama.trim()) {
      setError("Nama wajib diisi.");
      return;
    }

    setSubmitting(true);
    try {
      await updateItem(kodeParam, { nama: nama.trim(), deskripsi: deskripsi.trim() });
      navigate("/manajemen/merek");
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          to="/manajemen/merek"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke daftar
        </Link>
        <PageHeader
          title="Ubah merek"
          description="Perbarui nama atau deskripsi merek."
        />
      </div>

      <Card>
        {!loaded ? (
          <p className="text-sm text-zinc-500">Memuat data…</p>
        ) : notFound ? (
          <div className="space-y-3">
            <p className="text-sm text-rose-700">
              Merek dengan kode <span className="font-mono">{kodeParam}</span> tidak ditemukan.
            </p>
            <Button type="button" variant="outline" onClick={() => navigate("/manajemen/merek")}>
              Kembali ke daftar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error ? (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
              >
                {error}
              </div>
            ) : null}

            <div>
              <FieldLabel htmlFor="mr-kode">Kode</FieldLabel>
              <input
                id="mr-kode"
                name="kode"
                value={kodeParam}
                readOnly
                disabled
                className={inputClassDisabled}
              />
              <p className="mt-1 text-xs text-zinc-500">
                Kode tidak dapat diubah karena dipakai sebagai referensi pada data lain.
              </p>
            </div>

            <div>
              <FieldLabel htmlFor="mr-nama">Nama merek</FieldLabel>
              <input
                id="mr-nama"
                name="nama"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Nama merek resmi atau tampilan"
                className={inputClass}
              />
            </div>

            <div>
              <FieldLabel htmlFor="mr-deskripsi">Deskripsi</FieldLabel>
              <textarea
                id="mr-deskripsi"
                name="deskripsi"
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Opsional — catatan singkat tentang merek."
                className={textareaClass}
                rows={4}
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-zinc-100 pt-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/manajemen/merek")}
                disabled={submitting}
              >
                <X className="h-4 w-4" aria-hidden />
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                <Save className="h-4 w-4" aria-hidden />
                {submitting ? "Menyimpan…" : "Simpan"}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
