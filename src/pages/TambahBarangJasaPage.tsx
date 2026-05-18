import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useBarangJasa } from "@/features/barang-jasa/BarangJasaContext";
import { BarangFotoField } from "@/features/barang-jasa/BarangFotoField";
import { useKategoriGrup } from "@/features/kategori-grup/KategoriGrupContext";
import { useMerek } from "@/features/merek/MerekContext";
import type { BarangJasaRow } from "@/data/mockData";
import { applyBarangFotoChanges, emptyBarangFotoState, type BarangFotoState } from "@/lib/barangFoto";
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

const selectClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

const EMPTY_OPTION = "";

export function TambahBarangJasaPage() {
  const navigate = useNavigate();
  const { addItem, kodeExists } = useBarangJasa();
  const { items: kategoriList, loading: kategoriLoading } = useKategoriGrup();
  const { items: merekList, loading: merekLoading } = useMerek();

  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [tipe, setTipe] = useState<"Barang" | "Jasa">("Barang");
  const [satuan, setSatuan] = useState("pcs");
  const [harga, setHarga] = useState("");
  const [stok, setStok] = useState("");
  const [kategoriKode, setKategoriKode] = useState(EMPTY_OPTION);
  const [merekKode, setMerekKode] = useState(EMPTY_OPTION);
  const [foto, setFoto] = useState<BarangFotoState>(emptyBarangFotoState);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

    const kodeFinal = kodeTrim.toUpperCase();
    const row: BarangJasaRow = {
      kode: kodeFinal,
      nama: nama.trim(),
      tipe,
      satuan: satuan.trim() || (tipe === "Barang" ? "pcs" : "job"),
      harga: hargaNum,
      ...(tipe === "Barang" ? { stok: stokVal } : {}),
      kategoriKode: kategoriKode || null,
      merekKode: merekKode || null,
    };

    setSaving(true);
    try {
      await addItem(row);
      await applyBarangFotoChanges(kodeFinal, foto);
      navigate("/barang-jasa");
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSaving(false);
    }
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
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
            >
              {error}
            </div>
          ) : null}

          <BarangFotoField value={foto} onChange={setFoto} disabled={saving} />

          <div className="grid gap-5 sm:grid-cols-2">
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
                disabled={saving}
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
                disabled={saving}
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="kategori">Kategori / grup</FieldLabel>
              <select
                id="kategori"
                value={kategoriKode}
                onChange={(e) => setKategoriKode(e.target.value)}
                className={selectClass}
                disabled={saving || kategoriLoading}
              >
                <option value={EMPTY_OPTION}>— Tidak ada —</option>
                {kategoriList.map((k) => (
                  <option key={k.kode} value={k.kode}>
                    {k.kode} — {k.nama}
                  </option>
                ))}
              </select>
              {!kategoriLoading && kategoriList.length === 0 ? (
                <p className="mt-1 text-xs text-zinc-500">
                  Belum ada kategori.{" "}
                  <Link to="/manajemen/kategori/tambah" className="font-medium text-brand-600 hover:text-brand-700">
                    Tambah kategori
                  </Link>
                </p>
              ) : null}
            </div>
            <div>
              <FieldLabel htmlFor="merek">Merek</FieldLabel>
              <select
                id="merek"
                value={merekKode}
                onChange={(e) => setMerekKode(e.target.value)}
                className={selectClass}
                disabled={saving || merekLoading}
              >
                <option value={EMPTY_OPTION}>— Tidak ada —</option>
                {merekList.map((m) => (
                  <option key={m.kode} value={m.kode}>
                    {m.kode} — {m.nama}
                  </option>
                ))}
              </select>
              {!merekLoading && merekList.length === 0 ? (
                <p className="mt-1 text-xs text-zinc-500">
                  Belum ada merek.{" "}
                  <Link to="/manajemen/merek/tambah" className="font-medium text-brand-600 hover:text-brand-700">
                    Tambah merek
                  </Link>
                </p>
              ) : null}
            </div>
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
                  disabled={saving}
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
                  disabled={saving}
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
              disabled={saving}
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
              disabled={saving}
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
                disabled={saving}
              />
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-zinc-100 pt-5">
            <Button type="button" variant="ghost" onClick={() => navigate("/barang-jasa")} disabled={saving}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
