import { useEffect, useState, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { TokoInput, TokoSelect } from "@/components/ui/TokoInput";
import { useBarangJasa } from "@/features/barang-jasa/BarangJasaContext";
import { BarangFotoField } from "@/features/barang-jasa/BarangFotoField";
import { BarangSatuanTingkatSection } from "@/features/barang-jasa/BarangSatuanTingkatSection";
import { useKategoriGrup } from "@/features/kategori-grup/KategoriGrupContext";
import { useMerek } from "@/features/merek/MerekContext";
import {
  buildSatuanTingkatPayload,
  satuanTingkatRowsToForm,
  type BarangJasaUpdatePayload,
  type BarangSatuanTingkatForm,
} from "@/data/barangJasa";
import {
  applyBarangFotoChanges,
  emptyBarangFotoState,
  loadBarangFotoPreviewUrl,
  type BarangFotoState,
} from "@/lib/barangFoto";
import { tauriErrorMessage } from "@/lib/tauriError";

const EMPTY_OPTION = "";

export function UbahBarangJasaPage() {
  const { kode: kodeParam } = useParams();
  const kode = kodeParam ? decodeURIComponent(kodeParam) : "";
  const navigate = useNavigate();
  const { items, loading, getByKode, updateItem } = useBarangJasa();
  const { items: kategoriList, loading: kategoriLoading } = useKategoriGrup();
  const { items: merekList, loading: merekLoading } = useMerek();

  const [nama, setNama] = useState("");
  const [tipe, setTipe] = useState<"Barang" | "Jasa">("Barang");
  const [satuanTiers, setSatuanTiers] = useState<BarangSatuanTingkatForm[]>([]);
  const [stok, setStok] = useState("");
  const [kategoriKode, setKategoriKode] = useState(EMPTY_OPTION);
  const [merekKode, setMerekKode] = useState(EMPTY_OPTION);
  const [foto, setFoto] = useState<BarangFotoState>(emptyBarangFotoState);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [satuanLocked, setSatuanLocked] = useState(false);

  useEffect(() => {
    if (loading) return;
    const row = getByKode(kode);
    if (row) {
      void invoke<boolean>("barang_jasa_punya_transaksi", { kode: row.kode })
        .then(setSatuanLocked)
        .catch(() => setSatuanLocked(false));
      setNama(row.nama);
      setTipe(row.tipe);
      setSatuanTiers(satuanTingkatRowsToForm(row.satuanTingkat, row.tipe, row.satuan, row.harga));
      setStok(row.stok != null ? String(row.stok) : "");
      setKategoriKode(row.kategoriKode ?? EMPTY_OPTION);
      setMerekKode(row.merekKode ?? EMPTY_OPTION);
      void loadBarangFotoPreviewUrl(row.kode).then((url) => {
        if (url) {
          setFoto({ previewUrl: url, webpBytes: null, removed: false });
        } else {
          setFoto(emptyBarangFotoState());
        }
      });
    }
    setReady(true);
  }, [loading, kode, items, getByKode]);

  const found = ready && !loading && Boolean(getByKode(kode));
  const row = getByKode(kode);
  function parseStok(raw: string): number | null {
    if (raw.trim() === "") return null;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0) return null;
    return n;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nama.trim()) {
      setError("Nama wajib diisi.");
      return;
    }
    if (!kategoriKode) {
      setError("Kategori / grup wajib dipilih.");
      return;
    }

    let stokVal: number | null | undefined;
    if (tipe === "Barang") {
      const s = parseStok(stok);
      if (s == null) {
        setError("Stok wajib diisi (bilangan bulat ≥ 0).");
        return;
      }
      stokVal = s;
    }

    let satuanPayload: BarangJasaUpdatePayload["satuanTingkat"];
    if (!satuanLocked) {
      const satuanResult = buildSatuanTingkatPayload(tipe, satuanTiers);
      if (!satuanResult.ok) {
        setError(satuanResult.error);
        return;
      }
      satuanPayload = satuanResult.satuanTingkat;
    }

    setSaving(true);
    try {
      await updateItem(kode, {
        nama: nama.trim(),
        ...(tipe === "Barang" ? { stok: stokVal } : {}),
        kategoriKode: kategoriKode || null,
        merekKode: merekKode || null,
        ...(satuanPayload ? { satuanTingkat: satuanPayload } : {}),
      });
      await applyBarangFotoChanges(kode.trim().toUpperCase(), foto);
      navigate("/barang-jasa");
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (ready && !loading && !found) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader 
          title="Item tidak ditemukan" 
          // description="Kode tidak ada di daftar barang & jasa." 
        />
        <Button type="button" variant="ghost" className="self-start" onClick={() => navigate("/barang-jasa")}>
          Kembali ke daftar
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <Link
          to="/barang-jasa"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke daftar
        </Link>
        <PageHeader
          title="Ubah barang / jasa"
          description="Perbarui data master item; kode dan tipe tidak dapat diubah."
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

          {loading || !ready ? (
            <p className="text-sm text-zinc-500">Memuat…</p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
                  <TokoInput
                    id="kode"
                    name="kode"
                    label="Kode"
                    value={row?.kode ?? kode}
                    readOnly
                    disabled
                    className="bg-zinc-50"
                  />
                  <TokoInput
                    id="nama"
                    name="nama"
                    label="Nama"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Nama barang atau layanan"
                    disabled={saving}
                  />
                </div>

                <BarangFotoField value={foto} onChange={setFoto} disabled={saving} />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <TokoSelect
                  id="kategori"
                  label="Kategori / grup *"
                  value={kategoriKode}
                  onChange={(e) => setKategoriKode(e.target.value)}
                  disabled={saving || kategoriLoading}
                  required
                >
                  <option value={EMPTY_OPTION}>— Pilih kategori —</option>
                  {kategoriList.map((k) => (
                    <option key={k.kode} value={k.kode}>
                      {k.kode} — {k.nama}
                    </option>
                  ))}
                </TokoSelect>
                <TokoSelect
                  id="merek"
                  label="Merek (opsional)"
                  value={merekKode}
                  onChange={(e) => setMerekKode(e.target.value)}
                  disabled={saving || merekLoading}
                >
                  <option value={EMPTY_OPTION}>— Tidak ada —</option>
                  {merekList.map((m) => (
                    <option key={m.kode} value={m.kode}>
                      {m.kode} — {m.nama}
                    </option>
                  ))}
                </TokoSelect>
              </div>

              <div>
                <span className="text-sm font-medium text-zinc-700">Tipe</span>
                <div className="mt-2">
                  <Badge variant={tipe === "Barang" ? "neutral" : "processing"}>{tipe}</Badge>
                </div>
              </div>

              <BarangSatuanTingkatSection
                tipe={tipe}
                tiers={satuanTiers}
                onChange={setSatuanTiers}
                stok={stok}
                onStokChange={tipe === "Barang" ? setStok : undefined}
                satuanLocked={satuanLocked}
                disabled={saving}
              />
            </>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-zinc-100 pt-5">
            <Button type="button" variant="ghost" onClick={() => navigate("/barang-jasa")} disabled={saving}>
              Batal
            </Button>
            <Button type="submit" disabled={saving || loading || !ready || !found}>
              {saving ? "Menyimpan…" : "Simpan perubahan"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
