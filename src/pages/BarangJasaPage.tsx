import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BookOpenCheck, FileText, LineChart, PackagePlus, Pencil, SendToBack, Warehouse } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  ListFilterBar,
  type SelectFilterOption,
} from "@/components/ui/ListFilterBar";
import { useBarangJasa } from "@/features/barang-jasa/BarangJasaContext";
import { useKategoriGrup } from "@/features/kategori-grup/KategoriGrupContext";
import { formatSatuanTingkatRingkasan } from "@/data/barangJasa";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Sentinel value untuk "Tanpa kategori" (item dengan `kategoriKode` null/empty). */
const KATEGORI_NONE = "__none__";
const KATEGORI_ALL = "";

export function BarangJasaPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, loading, refresh } = useBarangJasa();
  const { items: kategoriList } = useKategoriGrup();

  const [query, setQuery] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState<string>(KATEGORI_ALL);

  useEffect(() => {
    if (location.pathname === "/barang-jasa") {
      void refresh().catch(() => {});
    }
  }, [location.pathname, refresh]);

  // Map kode → nama, dipakai untuk menampilkan kategori di tabel & cari
  // berdasarkan nama kategori.
  const kategoriNamaByKode = useMemo(() => {
    const map = new Map<string, string>();
    for (const k of kategoriList) {
      map.set(k.kode.toLowerCase(), k.nama);
    }
    return map;
  }, [kategoriList]);

  const kategoriOptions = useMemo<SelectFilterOption[]>(() => {
    const sorted = [...kategoriList].sort((a, b) =>
      a.nama.localeCompare(b.nama, "id"),
    );
    return [
      { value: KATEGORI_ALL, label: "Semua kategori" },
      ...sorted.map((k) => ({
        value: k.kode,
        label: `${k.kode} — ${k.nama}`,
      })),
      { value: KATEGORI_NONE, label: "Tanpa kategori" },
    ];
  }, [kategoriList]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((row) => {
      const rowKategori = row.kategoriKode?.trim() ?? "";
      if (kategoriFilter === KATEGORI_NONE) {
        if (rowKategori !== "") return false;
      } else if (kategoriFilter !== KATEGORI_ALL) {
        if (rowKategori.toLowerCase() !== kategoriFilter.toLowerCase()) {
          return false;
        }
      }
      if (q) {
        const kategoriNama = rowKategori
          ? kategoriNamaByKode.get(rowKategori.toLowerCase()) ?? ""
          : "";
        const hay =
          `${row.kode} ${row.nama} ${row.satuan} ${row.tipe} ${rowKategori} ${kategoriNama}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, query, kategoriFilter, kategoriNamaByKode]);

  const isDefault = query === "" && kategoriFilter === KATEGORI_ALL;

  const handleReset = useCallback(() => {
    setQuery("");
    setKategoriFilter(KATEGORI_ALL);
  }, []);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Barang & jasa"
        description="Kelola katalog produk dan layanan yang dijual."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              onClick={() => navigate("/laporan/pergerakan-stok")}
            >
              <LineChart className="h-4 w-4" aria-hidden />
              Pergerakan stok
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/barang-jasa/per-gudang")}>
              <Warehouse className="h-4 w-4" aria-hidden />
              Lihat per gudang
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/barang-jasa/mutasi-antar-gudang")}>
              <SendToBack className="h-4 w-4" aria-hidden />
              Mutasi antar gudang
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/barang-jasa/koreksi-stok")}>
              <BookOpenCheck className="h-4 w-4" aria-hidden />
              Koreksi stok
            </Button>
            <Button type="button" onClick={() => navigate("/barang-jasa/tambah")}>
              <PackagePlus className="h-4 w-4" aria-hidden />
              Tambah item
            </Button>
          </div>
        }
      />

      <Card className="overflow-hidden p-0">
        <ListFilterBar
          search={{
            value: query,
            onChange: setQuery,
            placeholder: "Cari kode, nama, satuan, atau kategori…",
          }}
          selects={[
            {
              label: "Kategori",
              value: kategoriFilter,
              onChange: setKategoriFilter,
              options: kategoriOptions,
            },
          ]}
          onReset={handleReset}
          canReset={!isDefault}
          summary={
            loading
              ? "Memuat data dari database lokal…"
              : filteredItems.length === 0
                ? items.length === 0
                  ? "Belum ada barang/jasa."
                  : "Tidak ada item yang cocok dengan filter."
                : `${filteredItems.length} item${
                    filteredItems.length !== items.length ? ` dari ${items.length}` : ""
                  }`
          }
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3">Kode</th>
                <th className="px-5 py-3">Nama</th>
                <th className="px-5 py-3">Tipe</th>
                <th className="px-5 py-3">Kategori</th>
                <th className="px-5 py-3">Satuan</th>
                <th className="px-5 py-3">Harga jual</th>
                <th className="px-5 py-3">Stok</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-zinc-500">
                    Memuat data dari database lokal…
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-zinc-500">
                    {items.length === 0
                      ? "Belum ada barang/jasa. Klik Tambah item untuk membuat katalog."
                      : "Tidak ada item yang cocok dengan filter."}
                  </td>
                </tr>
              ) : (
                filteredItems.map((row) => {
                  const kategoriKode = row.kategoriKode?.trim() ?? "";
                  const kategoriNama = kategoriKode
                    ? kategoriNamaByKode.get(kategoriKode.toLowerCase())
                    : undefined;
                  return (
                    <tr key={row.kode} className="bg-white hover:bg-zinc-50/50">
                      <td className="px-5 py-3 font-mono text-xs font-medium text-zinc-800">{row.kode}</td>
                      <td className="px-5 py-3 font-medium text-zinc-900">{row.nama}</td>
                      <td className="px-5 py-3">
                        <Badge variant={row.tipe === "Barang" ? "neutral" : "processing"}>{row.tipe}</Badge>
                      </td>
                      <td className="px-5 py-3 text-zinc-600">
                        {kategoriKode ? (
                          <span>
                            <span className="font-mono text-xs text-zinc-500">{kategoriKode}</span>
                            {kategoriNama ? (
                              <span className="ml-1.5">— {kategoriNama}</span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-zinc-600">
                        {formatSatuanTingkatRingkasan(row.satuanTingkat, row.satuan)}
                      </td>
                      <td className="px-5 py-3 font-medium text-zinc-900">{formatRupiah(row.harga)}</td>
                      <td className="px-5 py-3 text-zinc-600">{row.stok != null ? row.stok : "—"}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          {row.tipe === "Barang" ? (
                            <Button
                              onClick={() => navigate(`/barang-jasa/kartu-stok/${encodeURIComponent(row.kode)}`)}
                              variant="outline"
                              className="px-2 py-1 text-xs"
                            >
                              <FileText className="h-4 w-4" aria-hidden />
                              Kartu stok
                            </Button>
                          ) : null}
                          <Button
                            onClick={() => navigate(`/barang-jasa/ubah/${encodeURIComponent(row.kode)}`)}
                            variant="outline"
                            className="px-2 py-1 text-xs"
                          >
                            <Pencil className="h-4 w-4" aria-hidden />
                            Ubah
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
