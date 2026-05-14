import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { stockProducts } from "@/data/mockData";

export function StockManagementSection() {
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Stok</h2>
          <p className="text-sm text-zinc-500">Ringkasan & produk utama</p>
        </div>
        <Button className="rounded-full">Restok sekarang</Button>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-amber-100/90 px-3 py-3 text-center">
          <p className="text-xs font-medium text-amber-900/80">Total stok</p>
          <p className="mt-1 text-xl font-bold text-amber-950">1.520</p>
        </div>
        <div className="rounded-xl bg-violet-100/90 px-3 py-3 text-center">
          <p className="text-xs font-medium text-violet-900/80">Habis</p>
          <p className="mt-1 text-xl font-bold text-violet-950">250</p>
        </div>
        <div className="rounded-xl bg-pink-100/90 px-3 py-3 text-center">
          <p className="text-xs font-medium text-pink-900/80">Stok rendah</p>
          <p className="mt-1 text-xl font-bold text-pink-950">80</p>
        </div>
      </div>

      <div className="-mx-1 flex gap-4 overflow-x-auto pb-2 pt-1">
        {stockProducts.map((p) => (
          <article
            key={p.id}
            className="min-w-[200px] shrink-0 overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50/80 shadow-inner"
          >
            <div className="aspect-[4/3] w-full overflow-hidden bg-zinc-200">
              <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="p-3">
              <h3 className="font-semibold text-zinc-900">{p.name}</h3>
              <p className="mt-0.5 text-xs text-zinc-500">
                {p.category} · {p.sku}
              </p>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
