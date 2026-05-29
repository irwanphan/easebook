import { useMemo, useState } from "react";
import { Search, UserRound } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { usePelanggan } from "@/features/pelanggan/PelangganContext";
import { usePOS } from "@/features/pos/POSContext";
import { POS_PELANGGAN_DEFAULT_KODE } from "@/data/pos";

type POSCustomerPickerProps = {
  open: boolean;
  onClose: () => void;
};

export function POSCustomerPicker({ open, onClose }: POSCustomerPickerProps) {
  const { items, loading } = usePelanggan();
  const { setPelanggan, resetPelanggan, pelanggan } = usePOS();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((p) => p.kode.toLowerCase() !== POS_PELANGGAN_DEFAULT_KODE.toLowerCase());
    if (!q) return list.slice(0, 50);
    return list
      .filter((p) =>
        `${p.kode} ${p.nama} ${p.telepon} ${p.kota}`.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [items, query]);

  function pick(kode: string, nama: string) {
    setPelanggan({ kode, nama });
    setQuery("");
    onClose();
  }

  function handleWalkIn() {
    resetPelanggan();
    setQuery("");
    onClose();
  }

  return (
    <Modal
      open={open}
      title="Pilih pelanggan"
      onClose={onClose}
      panelClassName="max-w-lg"
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="outline" onClick={handleWalkIn}>
            <UserRound className="h-4 w-4" />
            Walk-in (Pelanggan Umum)
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Tutup
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari kode, nama, telepon, kota…"
            autoFocus
            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        {loading ? (
          <p className="text-sm text-zinc-500">Memuat data…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-zinc-500">Tidak ada pelanggan yang cocok.</p>
        ) : (
          <ul className="max-h-80 divide-y divide-zinc-100 overflow-y-auto rounded-xl border border-zinc-200">
            {filtered.map((p) => {
              const isActive = p.kode.toLowerCase() === pelanggan.kode.toLowerCase();
              return (
                <li key={p.kode}>
                  <button
                    type="button"
                    onClick={() => pick(p.kode, p.nama)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
                      isActive ? "bg-brand-50/60" : "hover:bg-zinc-50"
                    }`}
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
                      <UserRound className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-zinc-900">
                        {p.nama}
                      </span>
                      <span className="block truncate font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                        {p.kode} {p.telepon ? `• ${p.telepon}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
