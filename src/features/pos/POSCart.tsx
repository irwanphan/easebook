import { Minus, Plus, Trash2, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { usePOS } from "@/features/pos/POSContext";
import type { PosCartLine } from "@/data/pos";
import { formatRupiah } from "@/lib/format";

type POSCartProps = {
  onProcessPayment: () => void;
  onOpenCustomerPicker: () => void;
};

function CartLineCard({
  line,
  onInc,
  onDec,
  onRemove,
}: {
  line: PosCartLine;
  onInc: () => void;
  onDec: () => void;
  onRemove: () => void;
}) {
  const lineTotal = Math.max(0, (line.hargaSatuan - line.diskon) * line.qty);
  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold text-zinc-900">{line.barangNama}</p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
            {line.barangKode}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md p-1 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
          aria-label="Hapus baris"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 p-0.5">
          <button
            type="button"
            onClick={onDec}
            className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-600 transition hover:bg-white hover:text-zinc-900 cursor-pointer"
            aria-label="Kurangi"
            disabled={line.qty <= 1}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[2ch] text-center text-sm font-semibold tabular-nums text-zinc-900">
            {line.qty}
          </span>
          <button
            type="button"
            onClick={onInc}
            className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-600 transition hover:bg-white hover:text-zinc-900 cursor-pointer"
            aria-label="Tambah"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">{formatRupiah(line.hargaSatuan)} / {line.satuan}</p>
          <p className="text-sm font-bold text-zinc-900">{formatRupiah(lineTotal)}</p>
        </div>
      </div>
    </li>
  );
}

export function POSCart({ onProcessPayment, onOpenCustomerPicker }: POSCartProps) {
  const {
    cart,
    subtotal,
    total,
    diskonFaktur,
    pajak,
    pelanggan,
    resetPelanggan,
    updateLineQty,
    removeLine,
    clearCart,
    shift,
  } = usePOS();

  return (
    <aside className="flex h-full w-[380px] shrink-0 flex-col border-l border-zinc-200 bg-white">
      {/* Header keranjang */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-5 py-3">
        <div>
          <h2 className="text-base font-bold tracking-tight text-zinc-900">Keranjang</h2>
          <p className="text-xs text-zinc-500">
            {cart.length === 0
              ? "Belum ada item"
              : `${cart.length} baris • ${cart.reduce((a, l) => a + l.qty, 0)} item`}
          </p>
        </div>
        {cart.length > 0 ? (
          <button
            type="button"
            onClick={clearCart}
            className="text-xs font-medium text-zinc-500 hover:text-rose-600 hover:underline cursor-pointer"
          >
            Kosongkan
          </button>
        ) : null}
      </div>

      {/* Pelanggan */}
      <div className="shrink-0 border-b border-zinc-100 px-5 py-3">
        <button
          type="button"
          onClick={onOpenCustomerPicker}
          className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2.5 text-left transition hover:bg-zinc-50 cursor-pointer"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <UserRound className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-zinc-900">{pelanggan.nama}</span>
            <span className="block font-mono text-[10px] uppercase tracking-wider text-zinc-400">
              {pelanggan.kode}
            </span>
          </span>
          {pelanggan.kode !== "GUEST" ? (
            <span
              role="button"
              aria-label="Reset ke walk-in"
              onClick={(e) => {
                e.stopPropagation();
                resetPelanggan();
              }}
              className="rounded-md p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </span>
          ) : null}
        </button>
      </div>

      {/* Items */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
        {cart.length === 0 ? (
          <div className="flex h-full items-center justify-center px-3 text-center">
            <p className="text-sm text-zinc-500">
              Klik produk di sebelah kiri atau scan barcode untuk menambah item ke keranjang.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {cart.map((line) => (
              <CartLineCard
                key={line.uid}
                line={line}
                onInc={() => updateLineQty(line.uid, line.qty + 1)}
                onDec={() => updateLineQty(line.uid, line.qty - 1)}
                onRemove={() => removeLine(line.uid)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Totals */}
      <div className="shrink-0 border-t border-zinc-200 bg-zinc-50/60 px-5 py-4">
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between text-zinc-600">
            <dt>Subtotal</dt>
            <dd className="font-medium text-zinc-900">{formatRupiah(subtotal)}</dd>
          </div>
          {diskonFaktur > 0 ? (
            <div className="flex justify-between text-zinc-600">
              <dt>Diskon</dt>
              <dd className="font-medium text-rose-700">−{formatRupiah(diskonFaktur)}</dd>
            </div>
          ) : null}
          {pajak > 0 ? (
            <div className="flex justify-between text-zinc-600">
              <dt>Pajak</dt>
              <dd className="font-medium text-zinc-900">{formatRupiah(pajak)}</dd>
            </div>
          ) : null}
          <div className="!mt-3 flex items-baseline justify-between border-t border-zinc-200 pt-3">
            <dt className="text-base font-bold text-zinc-900">Total</dt>
            <dd className="text-xl font-extrabold tracking-tight text-brand-700">
              {formatRupiah(total)}
            </dd>
          </div>
        </dl>
        <Button
          type="button"
          className="mt-4 h-11 w-full text-base"
          disabled={cart.length === 0 || !shift}
          onClick={onProcessPayment}
        >
          Proses pembayaran
        </Button>
      </div>
    </aside>
  );
}
