import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useBarangJasa } from "@/features/barang-jasa/BarangJasaContext";
import type { BarangJasaRow } from "@/data/mockData";

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-zinc-700">
      {children}
    </label>
  );
}

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

export function TambahBarangJasaPage() {
  const navigate = useNavigate();
  const { addItem, kodeExists } = useBarangJasa();

  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [tipe, setTipe] = useState<"Barang" | "Jasa">("Barang");
  const [satuan, setSatuan] = useState("pcs");
  const [harga, setHarga] = useState("");
  const [stok, setStok] = useState("");
  const [error, setError] = useState<string | null>(null);

  function parseHarga(raw: string): number | null {
    const n = Number(raw.replace(/\./g, "").replace(/,/g, "."));
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n);
  }

  function parseStok(raw: string): number | null {
    if (raw.trim() === "") return null;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0) return null;
    return n;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const kodeTrim = kode.trim();
    if (!kodeTrim) {
      setError("Kode wajib diisi.");
      return;
    }
    if (kodeExists(kodeTrim)) {
      setError("Kode sudah dipakai. Gunakan kode lain.");
      return;
    }
    if (!nama.trim()) {
      setError("Nama wajib diisi.");
      return;
    }
    const hargaNum = parseHarga(harga);
    if (hargaNum == null) {
      setError("Harga tidak valid.");
      return;
    }

    let stokVal: number | undefined;
    if (tipe === "Barang") {
      const s = parseStok(stok);
      if (s == null) {
        setError("Stok wajib diisi (bilangan bulat ≥ 0).");
        return;
      }
      stokVal = s;
    }

    const row: BarangJasaRow = {
      kode: kodeTrim.toUpperCase(),
      nama: nama.trim(),
      tipe,
      satuan: satuan.trim() || (tipe === "Barang" ? "pcs" : "job"),
      harga: hargaNum,
      ...(tipe === "Barang" ? { stok: stokVal } : {}),
    };

    const ok = addItem(row);
    if (!ok) {
      setError("Gagal menyimpan (kode bentrok).");
      return;
    }
    navigate("/barang-jasa");
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          to="/barang-jasa"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke daftar
        </Link>
        <PageHeader
          title="Tambah barang / jasa"
          description="Isi data master item untuk katalog penjualan."
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
            <FieldLabel htmlFor="kode">Kode</FieldLabel>
            <input
              id="kode"
              name="kode"
              value={kode}
              onChange={(e) => setKode(e.target.value)}
              placeholder="Contoh: BRG-003"
              className={inputClass}
              autoComplete="off"
            />
          </div>

          <div>
            <FieldLabel htmlFor="nama">Nama</FieldLabel>
            <input
              id="nama"
              name="nama"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Nama barang atau layanan"
              className={inputClass}
            />
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-zinc-700">Tipe</legend>
            <div className="mt-2 flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
                <input
                  type="radio"
                  name="tipe"
                  checked={tipe === "Barang"}
                  onChange={() => {
                    setTipe("Barang");
                    setSatuan((s) => (s === "job" ? "pcs" : s));
                  }}
                  className="h-4 w-4 border-zinc-300 text-brand-600 focus:ring-brand-500"
                />
                Barang
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
                <input
                  type="radio"
                  name="tipe"
                  checked={tipe === "Jasa"}
                  onChange={() => {
                    setTipe("Jasa");
                    setStok("");
                    setSatuan((s) => (s === "pcs" ? "job" : s));
                  }}
                  className="h-4 w-4 border-zinc-300 text-brand-600 focus:ring-brand-500"
                />
                Jasa
              </label>
            </div>
          </fieldset>

          <div>
            <FieldLabel htmlFor="satuan">Satuan</FieldLabel>
            <input
              id="satuan"
              name="satuan"
              value={satuan}
              onChange={(e) => setSatuan(e.target.value)}
              placeholder={tipe === "Barang" ? "pcs, box, kg…" : "job, jam, hari…"}
              className={inputClass}
            />
          </div>

          <div>
            <FieldLabel htmlFor="harga">Harga (IDR)</FieldLabel>
            <input
              id="harga"
              name="harga"
              inputMode="decimal"
              value={harga}
              onChange={(e) => setHarga(e.target.value)}
              placeholder="899000"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-zinc-500">Angka saja; titik sebagai pemisah ribuan boleh dipakai.</p>
          </div>

          {tipe === "Barang" ? (
            <div>
              <FieldLabel htmlFor="stok">Stok awal</FieldLabel>
              <input
                id="stok"
                name="stok"
                inputMode="numeric"
                value={stok}
                onChange={(e) => setStok(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-zinc-100 pt-5">
            <Button type="button" variant="ghost" onClick={() => navigate("/barang-jasa")}>
              Batal
            </Button>
            <Button type="submit">Simpan</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
