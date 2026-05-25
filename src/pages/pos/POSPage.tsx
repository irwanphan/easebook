import { Terminal } from "lucide-react";

/**
 * Placeholder POSPage — diisi pada tahap UI berikutnya. Tujuan stub ini:
 * memastikan window POS bisa di-spawn dan route `/pos` ter-render.
 */
export function POSPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-10">
      <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Terminal className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">Kasir POS</h1>
        <p className="text-sm text-zinc-600">
          Window POS siap. UI katalog &amp; keranjang akan dipasang pada tahap
          berikutnya.
        </p>
      </div>
    </div>
  );
}
