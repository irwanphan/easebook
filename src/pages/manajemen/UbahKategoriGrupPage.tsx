import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useKategoriGrup } from "@/features/kategori-grup/KategoriGrupContext";
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

export function UbahKategoriGrupPage() {
  const navigate = useNavigate();
  const { kode: rawKode } = useParams<{ kode: string }>();
  const kodeParam = rawKode ? decodeURIComponent(rawKode) : "";
  const { loading, getByKode, updateItem } = useKategoriGrup();

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
      navigate("/manajemen/kategori");
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
          to="/manajemen/kategori"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke daftar
        </Link>
        <PageHeader
          title="Ubah kategori / grup"
          description="Perbarui nama atau deskripsi grup klasifikasi."
        />
      </div>

      <Card>
        {!loaded ? (
          <p className="text-sm text-zinc-500">Memuat data…</p>
        ) : notFound ? (
          <div className="space-y-3">
            <p className="text-sm text-rose-700">
              Kategori dengan kode <span className="font-mono">{kodeParam}</span> tidak ditemukan.
            </p>
            <Button type="button" variant="outline" onClick={() => navigate("/manajemen/kategori")}>
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
              <FieldLabel htmlFor="kg-kode">Kode</FieldLabel>
              <input
                id="kg-kode"
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
              <FieldLabel htmlFor="kg-nama">Nama</FieldLabel>
              <input
                id="kg-nama"
                name="nama"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Nama kategori atau grup"
                className={inputClass}
              />
            </div>

            <div>
              <FieldLabel htmlFor="kg-deskripsi">Deskripsi</FieldLabel>
              <textarea
                id="kg-deskripsi"
                name="deskripsi"
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Opsional — penjelasan singkat penggunaan grup ini."
                className={textareaClass}
                rows={4}
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-zinc-100 pt-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/manajemen/kategori")}
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
