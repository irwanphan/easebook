import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function StorageAvailabilityCard() {
  const pct = 67;
  return (
    <Card className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-100 border-amber-200/80">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Ketersediaan gudang</h2>
          <p className="text-sm text-zinc-700/90">Monitor kapasitas penyimpanan</p>
        </div>
        <Button variant="secondary" className="shrink-0 rounded-full">
          Cek ketersediaan
        </Button>
      </div>
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-sm font-medium text-zinc-900">
          <span>Kapasitas terpakai</span>
          <span>{pct}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-white/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-600 to-orange-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
