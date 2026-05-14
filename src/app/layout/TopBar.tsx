import { Bell, ChevronDown, Search, SlidersHorizontal } from "lucide-react";

type TopBarProps = {
  userName?: string;
};

export function TopBar({ userName = "Starc" }: TopBarProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Selamat datang, {userName}
        </h1>
        <p className="text-sm text-zinc-500">Ringkasan operasional hari ini</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs sm:flex-initial">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            placeholder="Cari"
            className="w-full rounded-full border border-zinc-200 bg-white py-2 pl-10 pr-4 text-sm text-zinc-900 shadow-sm outline-none ring-brand-500/0 transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50"
          aria-label="Filter"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="flex h-10 items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
        >
          Bulan
          <ChevronDown className="h-4 w-4 text-zinc-500" />
        </button>
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50"
          aria-label="Notifikasi"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>
      </div>
    </header>
  );
}
