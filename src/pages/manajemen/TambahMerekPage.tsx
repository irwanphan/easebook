import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useMerek } from "@/features/merek/MerekContext";
import type { MerekRow } from "@/data/merek";
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

const textareaClass =
  "mt-1 min-h-[100px] w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

export function TambahMerekPage() {
  const navigate = useNavigate();
  const { addItem, kodeExists } = useMerek();

  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const kodeTrim = kode.trim();
    if (!kodeTrim) {
      setError("Kode wajib diisi.");
      return;
    }
    if (await kodeExists(kodeTrim)) {
      setError("Kode sudah dipakai. Gunakan kode lain.");
      return;
    }
    if (!nama.trim()) {
      setError("Nama wajib diisi.");
      return;
    }

    const row: MerekRow = {
      kode: kodeTrim.toUpperCase(),
      nama: nama.trim(),
      deskripsi: deskripsi.trim(),
    };

    try {
      await addItem(row);
      navigate("/manajemen/merek");
    } catch (err) {
      setError(tauriErrorMessage(err));
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
          title="Tambah merek"
          description="Daftarkan merek untuk dipilih di master barang."
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

          <div>
            <FieldLabel htmlFor="mr-kode">Kode</FieldLabel>
            <input
              id="mr-kode"
              name="kode"
              value={kode}
              onChange={(e) => setKode(e.target.value)}
              placeholder="Contoh: MRK-004"
              className={inputClass}
              autoComplete="off"
            />
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
            <Button type="button" variant="ghost" onClick={() => navigate("/manajemen/merek")}>
              Batal
            </Button>
            <Button type="submit">Simpan</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
