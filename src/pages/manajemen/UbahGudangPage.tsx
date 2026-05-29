import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useGudang } from "@/features/gudang/GudangContext";
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
  "mt-1 min-h-[88px] w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

function parseLuasM2(raw: string): number | null {
  const n = Number(raw.replace(/\./g, "").replace(/,/g, "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

function parseLokasi(raw: string): string | null {
  const t = raw.trim();
  if (t === "") return "";
  const parts = t.split(",").map((s) => s.trim());
  if (parts.length !== 2) return null;
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return `${lat}, ${lng}`;
}

function formatLuasInput(n: number): string {
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(n);
}

export function UbahGudangPage() {
  const navigate = useNavigate();
  const { kode: rawKode } = useParams<{ kode: string }>();
  const kodeParam = rawKode ? decodeURIComponent(rawKode) : "";
  const { loading, getByKode, updateItem } = useGudang();

  const [nama, setNama] = useState("");
  const [alamat, setAlamat] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [pic, setPic] = useState("");
  const [nomorKontak, setNomorKontak] = useState("");
  const [luasM2, setLuasM2] = useState("");
  const [kapasitasPenyimpanan, setKapasitasPenyimpanan] = useState("");
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
    setAlamat(row.alamat);
    setLokasi(row.lokasi);
    setPic(row.pic);
    setNomorKontak(row.nomorKontak);
    setLuasM2(formatLuasInput(row.luasM2));
    setKapasitasPenyimpanan(row.kapasitasPenyimpanan);
    setLoaded(true);
  }, [loading, kodeParam, getByKode]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nama.trim()) {
      setError("Nama wajib diisi.");
      return;
    }
    if (!alamat.trim()) {
      setError("Alamat wajib diisi.");
      return;
    }
    const lokasiParsed = parseLokasi(lokasi);
    if (lokasiParsed === null) {
      setError(
        "Lokasi tidak valid. Gunakan format: latitude, longitude (contoh: -6.9175, 107.6191). Kosongkan jika belum ada.",
      );
      return;
    }
    if (!pic.trim()) {
      setError("PIC wajib diisi.");
      return;
    }
    if (!nomorKontak.trim()) {
      setError("Nomor kontak wajib diisi.");
      return;
    }
    const luas = parseLuasM2(luasM2);
    if (luas == null) {
      setError("Luas (m²) harus berupa angka lebih dari 0.");
      return;
    }
    if (!kapasitasPenyimpanan.trim()) {
      setError("Kapasitas penyimpanan wajib diisi.");
      return;
    }

    setSubmitting(true);
    try {
      await updateItem(kodeParam, {
        nama: nama.trim(),
        alamat: alamat.trim(),
        lokasi: typeof lokasiParsed === "string" ? lokasiParsed : "",
        pic: pic.trim(),
        nomorKontak: nomorKontak.trim(),
        luasM2: luas,
        kapasitasPenyimpanan: kapasitasPenyimpanan.trim(),
      });
      navigate("/manajemen/gudang");
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          to="/manajemen/gudang"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke daftar
        </Link>
        <PageHeader
          title="Ubah gudang"
          description="Perbarui data lokasi, koordinat untuk peta, PIC, dan kapasitas."
        />
      </div>

      <Card>
        {!loaded ? (
          <p className="text-sm text-zinc-500">Memuat data…</p>
        ) : notFound ? (
          <div className="space-y-3">
            <p className="text-sm text-rose-700">
              Gudang dengan kode <span className="font-mono">{kodeParam}</span> tidak ditemukan.
            </p>
            <Button type="button" variant="outline" onClick={() => navigate("/manajemen/gudang")}>
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

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <FieldLabel htmlFor="gd-kode">Kode</FieldLabel>
                <input
                  id="gd-kode"
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
              <div className="sm:col-span-1">
                <FieldLabel htmlFor="gd-nama">Nama gudang</FieldLabel>
                <input
                  id="gd-nama"
                  name="nama"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama lokasi / cabang"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="gd-alamat">Alamat</FieldLabel>
              <textarea
                id="gd-alamat"
                name="alamat"
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                placeholder="Alamat lengkap beserta kota/kode pos"
                className={textareaClass}
                rows={3}
              />
            </div>

            <div>
              <FieldLabel htmlFor="gd-lokasi">Lokasi peta (latitude, longitude)</FieldLabel>
              <input
                id="gd-lokasi"
                name="lokasi"
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                placeholder="-6.9175, 107.6191 — kosongkan jika belum"
                className={inputClass}
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Dipisahkan koma: lintang dulu, bujur kemudian. Rentang lat −90…90, lng −180…180.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="gd-pic">PIC</FieldLabel>
                <input
                  id="gd-pic"
                  name="pic"
                  value={pic}
                  onChange={(e) => setPic(e.target.value)}
                  placeholder="Nama penanggung jawab"
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel htmlFor="gd-kontak">Nomor kontak</FieldLabel>
                <input
                  id="gd-kontak"
                  name="nomorKontak"
                  value={nomorKontak}
                  onChange={(e) => setNomorKontak(e.target.value)}
                  placeholder="Telepon / WhatsApp"
                  className={inputClass}
                  autoComplete="tel"
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="gd-luas">Luas (m²)</FieldLabel>
                <input
                  id="gd-luas"
                  name="luasM2"
                  inputMode="decimal"
                  value={luasM2}
                  onChange={(e) => setLuasM2(e.target.value)}
                  placeholder="2500"
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel htmlFor="gd-kapasitas">Kapasitas penyimpanan</FieldLabel>
                <input
                  id="gd-kapasitas"
                  name="kapasitasPenyimpanan"
                  value={kapasitasPenyimpanan}
                  onChange={(e) => setKapasitasPenyimpanan(e.target.value)}
                  placeholder="mis. 1200 palet, 3000 m³"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-zinc-100 pt-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/manajemen/gudang")}
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
