import { useId, type ReactNode } from "react";
import { CalendarRange, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Konfigurasi opsional rentang tanggal. Saat di-pass, dua input date
 * (mulai - akhir) ditampilkan dengan ikon kalender.
 */
export type DateRangeFilter = {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  fromLabel?: string;
  toLabel?: string;
};

/**
 * Konfigurasi opsional pencarian teks. Saat di-pass, satu input text
 * dengan ikon search ditampilkan.
 */
export type SearchFilter = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
};

export type ListFilterBarProps = {
  dateRange?: DateRangeFilter;
  search?: SearchFilter;
  /**
   * Callback tombol reset. Tombol hanya tampil kalau `canReset = true`.
   */
  onReset?: () => void;
  canReset?: boolean;
  /**
   * Pesan ringkas (mis. "X transaksi · total Rp Y") atau warning,
   * ditampilkan di bawah row filter sebagai status bar.
   */
  summary?: ReactNode;
  /** Pesan error/warning validasi (mis. tanggal akhir < mulai). */
  errorMessage?: string | null;
};

const inputBaseClass =
  "rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

const inputWithIconClass = `${inputBaseClass} pl-9`;

/**
 * Bilah filter generik untuk halaman daftar transaksi.
 *
 * Menggabungkan tiga slot opsional:
 * 1. Rentang tanggal (Tanggal mulai - Tanggal akhir)
 * 2. Pencarian teks
 * 3. Tombol reset (otomatis muncul saat `canReset = true`)
 *
 * Plus baris status di bawahnya untuk menampilkan ringkasan hasil
 * (jumlah baris, total nominal) atau pesan validasi.
 *
 * Komponen ini fully controlled — parent owns semua state. Pemfilteran
 * data adalah tanggung jawab parent (umumnya pakai `useMemo` terhadap
 * dataset penuh dari backend).
 */
export function ListFilterBar({
  dateRange,
  search,
  onReset,
  canReset = false,
  summary,
  errorMessage,
}: ListFilterBarProps) {
  const fromId = useId();
  const toId = useId();
  const searchId = useId();

  const hasDate = Boolean(dateRange);
  const hasSearch = Boolean(search);

  return (
    <div className="flex flex-col gap-3 border-b border-zinc-100 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
        {hasDate && dateRange ? (
          <div className="grid flex-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:max-w-md">
            <div>
              <label
                htmlFor={fromId}
                className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
              >
                {dateRange.fromLabel ?? "Tanggal mulai"}
              </label>
              <div className="relative mt-1">
                <CalendarRange
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                  aria-hidden
                />
                <input
                  id={fromId}
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => dateRange.onFromChange(e.target.value)}
                  className={`${inputWithIconClass} w-full`}
                />
              </div>
            </div>
            <div>
              <label
                htmlFor={toId}
                className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
              >
                {dateRange.toLabel ?? "Tanggal akhir"}
              </label>
              <div className="relative mt-1">
                <CalendarRange
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                  aria-hidden
                />
                <input
                  id={toId}
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => dateRange.onToChange(e.target.value)}
                  className={`${inputWithIconClass} w-full`}
                />
              </div>
            </div>
          </div>
        ) : null}

        {hasSearch && search ? (
          <div className="flex-1 lg:min-w-[240px] lg:max-w-md">
            <label
              htmlFor={searchId}
              className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
            >
              {search.label ?? "Pencarian"}
            </label>
            <div className="relative mt-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                aria-hidden
              />
              <input
                id={searchId}
                type="search"
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                placeholder={search.placeholder ?? "Cari…"}
                className={`${inputWithIconClass} w-full`}
              />
            </div>
          </div>
        ) : null}

        {onReset && canReset ? (
          <div className="lg:self-end">
            <Button
              type="button"
              variant="outline"
              onClick={onReset}
              className="!px-3"
              aria-label="Reset filter"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Reset
            </Button>
          </div>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="text-sm font-medium text-amber-700">{errorMessage}</p>
      ) : summary ? (
        <p className="text-sm text-zinc-500">{summary}</p>
      ) : null}
    </div>
  );
}
