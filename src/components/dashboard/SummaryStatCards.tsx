export function SummaryStatCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-violet-700 to-zinc-900 p-5 text-white shadow-lg">
        <p className="text-sm font-medium text-white/80">Total pesanan</p>
        <p className="mt-2 text-3xl font-bold tracking-tight">12.430</p>
        <p className="mt-2 text-xs font-medium text-emerald-300">+15% vs bulan lalu</p>
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
      </div>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-500 via-pink-600 to-zinc-900 p-5 text-white shadow-lg">
        <p className="text-sm font-medium text-white/80">Pesanan selesai</p>
        <p className="mt-2 text-3xl font-bold tracking-tight">11.980</p>
        <p className="mt-2 text-xs font-medium text-emerald-200">+10% vs bulan lalu</p>
        <div className="pointer-events-none absolute -bottom-8 -right-4 h-28 w-28 rounded-full bg-white/10" />
      </div>
    </div>
  );
}
