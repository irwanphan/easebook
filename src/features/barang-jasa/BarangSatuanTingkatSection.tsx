import type { ReactNode } from "react";
import type { BarangSatuanTingkatForm } from "@/data/barangJasa";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

const qtyClass =
  "mt-1 w-20 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-zinc-600">
      {children}
    </label>
  );
}

type BarangSatuanTingkatSectionProps = {
  tipe: "Barang" | "Jasa";
  tiers: BarangSatuanTingkatForm[];
  onChange: (tiers: BarangSatuanTingkatForm[]) => void;
  stok?: string;
  onStokChange?: (v: string) => void;
  disabled?: boolean;
};

function patchTier(
  tiers: BarangSatuanTingkatForm[],
  index: number,
  patch: Partial<BarangSatuanTingkatForm>,
): BarangSatuanTingkatForm[] {
  return tiers.map((t, i) => (i === index ? { ...t, ...patch } : t));
}

function HargaPair({
  idPrefix,
  hargaJual,
  hargaBeli,
  onJual,
  onBeli,
  disabled,
}: {
  idPrefix: string;
  hargaJual: string;
  hargaBeli: string;
  onJual: (v: string) => void;
  onBeli: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <FieldLabel htmlFor={`${idPrefix}-jual`}>Harga jual (IDR)</FieldLabel>
        <input
          id={`${idPrefix}-jual`}
          inputMode="decimal"
          value={hargaJual}
          onChange={(e) => onJual(e.target.value)}
          className={inputClass}
          placeholder="0"
          disabled={disabled}
        />
      </div>
      <div>
        <FieldLabel htmlFor={`${idPrefix}-beli`}>Harga beli (IDR)</FieldLabel>
        <input
          id={`${idPrefix}-beli`}
          inputMode="decimal"
          value={hargaBeli}
          onChange={(e) => onBeli(e.target.value)}
          className={inputClass}
          placeholder="0"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export function BarangSatuanTingkatSection({
  tipe,
  tiers,
  onChange,
  stok,
  onStokChange,
  disabled = false,
}: BarangSatuanTingkatSectionProps) {
  if (tipe === "Jasa") {
    const t = tiers[0] ?? { nama: "", qtyIsi: "", hargaJual: "", hargaBeli: "" };
    return (
      <section className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Satuan jasa</h3>
          <p className="mt-0.5 text-xs text-zinc-500">Satu satuan dengan harga jual dan harga beli.</p>
        </div>
        <div>
          <FieldLabel htmlFor="satuan-jasa-nama">Nama satuan</FieldLabel>
          <input
            id="satuan-jasa-nama"
            value={t.nama}
            onChange={(e) => onChange([{ ...t, nama: e.target.value }])}
            placeholder="job, jam, hari…"
            className={inputClass}
            disabled={disabled}
          />
        </div>
        <HargaPair
          idPrefix="jasa"
          hargaJual={t.hargaJual}
          hargaBeli={t.hargaBeli}
          onJual={(v) => onChange([{ ...t, hargaJual: v }])}
          onBeli={(v) => onChange([{ ...t, hargaBeli: v }])}
          disabled={disabled}
        />
      </section>
    );
  }

  const [t1, t2, t3] = tiers;

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">Satuan bertingkat</h3>
        <p className="mt-0.5 text-xs text-zinc-500">
          Contoh: 1 dus = 10 pack, 1 pack = 8 pcs. Stok dicatat pada satuan terkecil (tingkat 3).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-3 rounded-xl border border-brand-200/80 bg-brand-50/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">Satuan 1 (terbesar)</p>
          <div>
            <FieldLabel htmlFor="satuan-1-nama">Nama satuan</FieldLabel>
            <input
              id="satuan-1-nama"
              value={t1?.nama ?? ""}
              onChange={(e) => onChange(patchTier(tiers, 0, { nama: e.target.value }))}
              placeholder="dus"
              className={inputClass}
              disabled={disabled}
            />
          </div>
          <HargaPair
            idPrefix="s1"
            hargaJual={t1?.hargaJual ?? ""}
            hargaBeli={t1?.hargaBeli ?? ""}
            onJual={(v) => onChange(patchTier(tiers, 0, { hargaJual: v }))}
            onBeli={(v) => onChange(patchTier(tiers, 0, { hargaBeli: v }))}
            disabled={disabled}
          />
        </div>

        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Konversi ke satuan 2</p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <FieldLabel htmlFor="satuan-1-qty">Isi</FieldLabel>
              <input
                id="satuan-1-qty"
                inputMode="numeric"
                value={t1?.qtyIsi ?? ""}
                onChange={(e) => onChange(patchTier(tiers, 0, { qtyIsi: e.target.value }))}
                placeholder="10"
                className={qtyClass}
                disabled={disabled}
              />
            </div>
            <span className="pb-2.5 text-sm font-medium text-zinc-500">×</span>
            <div className="min-w-[8rem] flex-1">
              <FieldLabel htmlFor="satuan-2-nama">Satuan 2</FieldLabel>
              <input
                id="satuan-2-nama"
                value={t2?.nama ?? ""}
                onChange={(e) => onChange(patchTier(tiers, 1, { nama: e.target.value }))}
                placeholder="pack"
                className={inputClass}
                disabled={disabled}
              />
            </div>
          </div>
          <HargaPair
            idPrefix="s2"
            hargaJual={t2?.hargaJual ?? ""}
            hargaBeli={t2?.hargaBeli ?? ""}
            onJual={(v) => onChange(patchTier(tiers, 1, { hargaJual: v }))}
            onBeli={(v) => onChange(patchTier(tiers, 1, { hargaBeli: v }))}
            disabled={disabled}
          />
        </div>

        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Konversi ke satuan 3 (terkecil)</p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <FieldLabel htmlFor="satuan-2-qty">Isi</FieldLabel>
              <input
                id="satuan-2-qty"
                inputMode="numeric"
                value={t2?.qtyIsi ?? ""}
                onChange={(e) => onChange(patchTier(tiers, 1, { qtyIsi: e.target.value }))}
                placeholder="8"
                className={qtyClass}
                disabled={disabled}
              />
            </div>
            <span className="pb-2.5 text-sm font-medium text-zinc-500">×</span>
            <div className="min-w-[8rem] flex-1">
              <FieldLabel htmlFor="satuan-3-nama">Satuan 3</FieldLabel>
              <input
                id="satuan-3-nama"
                value={t3?.nama ?? ""}
                onChange={(e) => onChange(patchTier(tiers, 2, { nama: e.target.value }))}
                placeholder="pcs"
                className={inputClass}
                disabled={disabled}
              />
            </div>
          </div>
          <HargaPair
            idPrefix="s3"
            hargaJual={t3?.hargaJual ?? ""}
            hargaBeli={t3?.hargaBeli ?? ""}
            onJual={(v) => onChange(patchTier(tiers, 2, { hargaJual: v }))}
            onBeli={(v) => onChange(patchTier(tiers, 2, { hargaBeli: v }))}
            disabled={disabled}
          />
          {onStokChange != null ? (
            <div className="border-t border-zinc-100 pt-3">
              <FieldLabel htmlFor="stok-awal">Stok awal ({t3?.nama || "satuan 3"})</FieldLabel>
              <input
                id="stok-awal"
                inputMode="numeric"
                value={stok ?? ""}
                onChange={(e) => onStokChange(e.target.value)}
                placeholder="0"
                className={inputClass}
                disabled={disabled}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
