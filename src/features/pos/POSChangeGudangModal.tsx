import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Warehouse } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useGudang } from "@/features/gudang/GudangContext";
import { usePOS } from "@/features/pos/POSContext";
import { tauriErrorMessage } from "@/lib/tauriError";
import { TokoSelect } from "@/components/ui/TokoInput";

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * Modal untuk mengganti gudang aktif pada shift POS.
 *
 * Pra-syarat (dijamin di sisi UI sebelum modal dibuka):
 * - Ada shift terbuka.
 * - Keranjang kosong.
 *
 * Validasi tambahan dilakukan di backend (`pos_shift_change_gudang`):
 * - Shift belum punya transaksi.
 * - Gudang tujuan ada dan berbeda dari gudang aktif.
 */
export function POSChangeGudangModal({ open, onClose }: Props) {
  const { shift, changeGudang, jumlahItem } = usePOS();
  const { items: gudangItems, loading: gudangLoading } = useGudang();

  const [pilihan, setPilihan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Daftar gudang yang valid sebagai tujuan: bukan gudang saat ini.
  const opsi = useMemo(
    () =>
      gudangItems.filter(
        (g) => !shift || g.kode.toLowerCase() !== shift.gudangKode.toLowerCase(),
      ),
    [gudangItems, shift],
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    setPilihan((prev) => {
      if (prev && opsi.some((g) => g.kode === prev)) return prev;
      return opsi[0]?.kode ?? "";
    });
  }, [open, opsi]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!shift) {
      setError("Tidak ada shift aktif.");
      return;
    }
    if (jumlahItem > 0) {
      setError("Keranjang tidak boleh berisi item saat ganti gudang.");
      return;
    }
    if (!pilihan) {
      setError("Pilih gudang tujuan dulu.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await changeGudang(pilihan);
      onClose();
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const tidakAdaOpsi = !gudangLoading && opsi.length === 0;

  return (
    <Modal
      open={open}
      title="Ganti gudang aktif"
      onClose={() => {
        if (!submitting) onClose();
      }}
      panelClassName="max-w-md"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button
            type="submit"
            form="form-pos-ganti-gudang"
            disabled={submitting || tidakAdaOpsi || !pilihan}
          >
            {submitting ? "Menyimpan…" : "Ganti gudang"}
          </Button>
        </div>
      }
    >
      <form id="form-pos-ganti-gudang" onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
          >
            {error}
          </div>
        ) : null}

        <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2.5">
          <span
            aria-hidden
            className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-600 ring-1 ring-inset ring-zinc-200"
          >
            <Warehouse className="h-4 w-4" />
          </span>
          <div className="min-w-0 text-sm">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Gudang aktif</p>
            <p className="truncate font-semibold text-zinc-900">
              {shift?.gudangNama || shift?.gudangKode || "—"}
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="cg-gudang" className="block text-sm font-medium text-zinc-700">
            Pindah ke gudang
          </label>
          <TokoSelect
            id="cg-gudang"
            value={pilihan}
            onChange={(e) => setPilihan(e.target.value)}
            disabled={gudangLoading || opsi.length === 0}
          >
            {opsi.length === 0 ? (
              <option value="">— tidak ada gudang lain —</option>
            ) : (
              <>
                <option value="">— pilih gudang —</option>
                {opsi.map((g) => (
                  <option key={g.kode} value={g.kode}>
                    {g.kode} — {g.nama}
                  </option>
                ))}
              </>
            )}
          </TokoSelect>
        </div>

        <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs leading-relaxed text-sky-900">
          <p className="font-semibold">Yang akan terjadi</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            <li>
              Transaksi yang sudah disimpan sebelumnya tetap tercatat di gudang masing-masing. Ganti gudang hanya memengaruhi katalog & transaksi berikutnya pada shift ini.
            </li>
            <li>Katalog & stok akan dimuat ulang dari gudang baru.</li>
          </ul>
        </div>
      </form>
    </Modal>
  );
}
