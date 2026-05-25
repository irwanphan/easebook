import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { PosCatalogItem } from "@/data/pos";
import { useKategoriGrup } from "@/features/kategori-grup/KategoriGrupContext";
import { catalogList } from "@/features/pos/posInvoke";
import { usePOS } from "@/features/pos/POSContext";
import { loadBarangFotoPreviewUrl } from "@/lib/barangFoto";
import { formatRupiah } from "@/lib/format";
import { tauriErrorMessage } from "@/lib/tauriError";

type POSCatalogProps = {
  /** Gudang aktif untuk hitung stok per item. */
  gudangKode: string;
};

const ALL_KAT = "__ALL__";

function StokBadge({ tipe, stok }: { tipe: string; stok: number }) {
  if (tipe !== "Barang") {
    return (
      <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
        Jasa
      </span>
    );
  }
  const className =
    stok <= 0
      ? "bg-rose-50 text-rose-700"
      : stok < 10
        ? "bg-amber-50 text-amber-700"
        : "bg-emerald-50 text-emerald-700";
  const label = stok <= 0 ? "Habis" : `Stok ${stok}`;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function ProductCard({
  item,
  onAdd,
  fotoSrc,
}: {
  item: PosCatalogItem;
  onAdd: (item: PosCatalogItem) => void;
  fotoSrc: string | null;
}) {
  const disabled = item.tipe === "Barang" && item.stokDiGudang <= 0;
  return (
    <button
      type="button"
      onClick={() => onAdd(item)}
      disabled={disabled}
      className={`group flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-3 text-left shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
        disabled
          ? "cursor-not-allowed opacity-60"
          : "hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md active:translate-y-0"
      }`}
    >
      <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-zinc-100">
        {fotoSrc ? (
          <img src={fotoSrc} alt={item.nama} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
            Tidak ada foto
          </div>
        )}
      </div>
      <div className="flex min-h-[2.5rem] flex-col gap-1">
        <p className="line-clamp-2 text-sm font-semibold text-zinc-900">{item.nama}</p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">{item.kode}</p>
      </div>
      <div className="mt-auto flex items-center justify-between">
        <StokBadge tipe={item.tipe} stok={item.stokDiGudang} />
        <span className="text-sm font-bold text-brand-700">{formatRupiah(item.harga)}</span>
      </div>
    </button>
  );
}

export function POSCatalog({ gudangKode }: POSCatalogProps) {
  const { addToCart, shift } = usePOS();
  const { items: kategoriItems } = useKategoriGrup();

  const [kategoriKode, setKategoriKode] = useState<string>(ALL_KAT);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<PosCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fotoSrc, setFotoSrc] = useState<Record<string, string | null>>({});

  const searchRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(
    async (kat: string, q: string) => {
      if (!gudangKode) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await catalogList({
          gudangKode,
          kategoriKode: kat === ALL_KAT ? undefined : kat,
          query: q.trim() || undefined,
        });
        setItems(data);
      } catch (e) {
        setError(tauriErrorMessage(e));
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [gudangKode],
  );

  // Debounced fetch saat query berubah
  useEffect(() => {
    const t = window.setTimeout(() => {
      void fetchItems(kategoriKode, query);
    }, 250);
    return () => window.clearTimeout(t);
  }, [fetchItems, kategoriKode, query]);

  // Refresh setelah cart berubah (stok bisa berubah setelah transaksi)
  // — di-handle eksternal nanti via key/refresh. Untuk MVP cukup fetch awal.

  // Resolve foto untuk item yang punya foto. Hindari refetch untuk kode yang
  // sudah pernah diresolve.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next: Record<string, string | null> = {};
      for (const it of items) {
        if (fotoSrc[it.kode] !== undefined) continue;
        if (!it.punyaFoto) {
          next[it.kode] = null;
          continue;
        }
        try {
          const url = await loadBarangFotoPreviewUrl(it.kode);
          if (cancelled) return;
          next[it.kode] = url;
        } catch {
          next[it.kode] = null;
        }
      }
      if (!cancelled && Object.keys(next).length > 0) {
        setFotoSrc((prev) => ({ ...prev, ...next }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [items, fotoSrc]);

  // Auto-focus search saat shift baru aktif
  useEffect(() => {
    if (shift) searchRef.current?.focus();
  }, [shift]);

  // Hitung tab kategori berdasarkan items + add "Semua"
  const tabs = useMemo(() => {
    const counts = new Map<string, number>();
    let total = 0;
    for (const it of items) {
      total += 1;
      if (it.kategoriKode) {
        const k = it.kategoriKode;
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
    const tabList = [{ kode: ALL_KAT, nama: "Semua", count: total }];
    for (const k of kategoriItems) {
      const c = counts.get(k.kode) ?? 0;
      if (c > 0 || kategoriKode === k.kode) {
        tabList.push({ kode: k.kode, nama: k.nama, count: c });
      }
    }
    return tabList;
  }, [items, kategoriItems, kategoriKode]);

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-zinc-50">
      {/* Header search bar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-6 py-3">
        <h1 className="text-lg font-bold tracking-tight text-zinc-900">Kasir</h1>
        <div className="relative ml-auto flex-1 max-w-xl">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            aria-hidden
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari barang atau scan barcode…"
            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            autoComplete="off"
            spellCheck={false}
            disabled={!shift}
            onKeyDown={(e) => {
              if (e.key === "Enter" && items.length === 1) {
                addToCart(items[0]);
                setQuery("");
              }
            }}
          />
        </div>
      </div>

      {/* Tabs kategori */}
      <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-zinc-100 bg-white px-6 py-3">
        {tabs.map((t) => (
          <button
            key={t.kode}
            type="button"
            onClick={() => setKategoriKode(t.kode)}
            className={`group inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              kategoriKode === t.kode
                ? "border-brand-500 bg-brand-500 text-white shadow-sm"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            {t.nama}
            <span
              className={`inline-flex items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                kategoriKode === t.kode
                  ? "bg-white/20 text-white"
                  : "bg-zinc-100 text-zinc-600 group-hover:bg-zinc-200"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Grid produk */}
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : loading ? (
          <p className="text-sm text-zinc-500">Memuat katalog…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Tidak ada item yang cocok dengan filter saat ini.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <ProductCard
                key={item.kode}
                item={item}
                fotoSrc={fotoSrc[item.kode] ?? null}
                onAdd={addToCart}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
