import {
  emptySatuanTingkatForm,
  stokFormTierIndex,
  type BarangSatuanTingkatForm,
} from "@/data/barangJasa";
import { TokoInput } from "@/components/ui/TokoInput";

type BarangSatuanTingkatSectionProps = {
  tipe: "Barang" | "Jasa";
  tiers: BarangSatuanTingkatForm[];
  onChange: (tiers: BarangSatuanTingkatForm[]) => void;
  stok?: string;
  onStokChange?: (v: string) => void;
  /** Label field stok tingkat 3; default "Stok awal". */
  stokFieldLabel?: string;
  /** Satuan tidak boleh diubah (sudah ada transaksi). */
  satuanLocked?: boolean;
  disabled?: boolean;
};

function patchTier(
  tiers: BarangSatuanTingkatForm[],
  index: number,
  patch: Partial<BarangSatuanTingkatForm>,
): BarangSatuanTingkatForm[] {
  return tiers.map((t, i) => (i === index ? { ...t, ...patch } : t));
}

function BarcodeField({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <TokoInput
      id={id}
      label="Barcode"
      labelSize="sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Opsional"
      autoComplete="off"
      disabled={disabled}
    />
  );
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
      <TokoInput
        id={`${idPrefix}-jual`}
        label="Harga jual (IDR, opsional)"
        labelSize="sm"
        inputMode="decimal"
        value={hargaJual}
        onChange={(e) => onJual(e.target.value)}
        placeholder="0"
        disabled={disabled}
      />
      <TokoInput
        id={`${idPrefix}-beli`}
        label="Harga beli (IDR, opsional)"
        labelSize="sm"
        inputMode="decimal"
        value={hargaBeli}
        onChange={(e) => onBeli(e.target.value)}
        placeholder="0"
        disabled={disabled}
      />
    </div>
  );
}

export function BarangSatuanTingkatSection({
  tipe,
  tiers,
  onChange,
  stok,
  onStokChange,
  stokFieldLabel,
  satuanLocked = false,
  disabled = false,
}: BarangSatuanTingkatSectionProps) {
  const sectionDisabled = disabled || satuanLocked;
  if (tipe === "Jasa") {
    const t = tiers[0] ?? emptySatuanTingkatForm();
    return (
      <section className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Satuan jasa</h3>
          <p className="mt-0.5 text-xs text-zinc-500">Satu satuan dengan harga jual dan harga beli.</p>
        </div>
        <TokoInput
          id="satuan-jasa-nama"
          label="Nama satuan *"
          labelSize="sm"
          value={t.nama}
          onChange={(e) => onChange([{ ...t, nama: e.target.value }])}
          placeholder="job, jam, hari…"
          disabled={sectionDisabled}
          required
        />
        {satuanLocked ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Satuan tidak dapat diubah karena jasa ini sudah memiliki transaksi.
          </p>
        ) : null}
        <HargaPair
          idPrefix="jasa"
          hargaJual={t.hargaJual}
          hargaBeli={t.hargaBeli}
          onJual={(v) => onChange([{ ...t, hargaJual: v }])}
          onBeli={(v) => onChange([{ ...t, hargaBeli: v }])}
          disabled={sectionDisabled}
        />
        <BarcodeField
          id="satuan-jasa-barcode"
          value={t.kodeBarcode}
          onChange={(v) => onChange([{ ...t, kodeBarcode: v }])}
          disabled={sectionDisabled}
        />
      </section>
    );
  }

  const [t1, t2, t3] = tiers;
  const stokCol = stokFormTierIndex(tiers);
  const stokNama = stokCol === 2 ? t3?.nama : stokCol === 1 ? t2?.nama : t1?.nama;

  const stokField =
    onStokChange != null ? (
      <div className="border-t border-zinc-100 pt-3">
        <TokoInput
          id="stok-awal"
          label={stokFieldLabel ?? `Stok (${stokNama?.trim() || `satuan ${stokCol + 1}`})`}
          labelSize="sm"
          inputMode="numeric"
          value={stok ?? ""}
          onChange={(e) => onStokChange(e.target.value)}
          placeholder="0"
          disabled={disabled}
        />
      </div>
    ) : null;

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">Satuan bertingkat</h3>
        <p className="mt-0.5 text-xs text-zinc-500">
          Hanya satuan 1 wajib diisi. Tingkat 2–3 opsional — kosongkan jika tidak dipakai. Stok dicatat pada
          satuan terkecil yang diisi.
        </p>
        {satuanLocked ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Satuan tidak dapat diubah karena item ini sudah memiliki transaksi (pembelian, penjualan, atau
            mutasi stok).
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-3 rounded-xl border border-brand-200/80 bg-brand-50/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">Satuan 1 (terbesar)</p>
          <TokoInput
            id="satuan-1-nama"
            label="Nama satuan *"
            labelSize="sm"
            value={t1?.nama ?? ""}
            onChange={(e) => onChange(patchTier(tiers, 0, { nama: e.target.value }))}
            placeholder="dus"
            disabled={sectionDisabled}
            required
          />
          <HargaPair
            idPrefix="s1"
            hargaJual={t1?.hargaJual ?? ""}
            hargaBeli={t1?.hargaBeli ?? ""}
            onJual={(v) => onChange(patchTier(tiers, 0, { hargaJual: v }))}
            onBeli={(v) => onChange(patchTier(tiers, 0, { hargaBeli: v }))}
            disabled={sectionDisabled}
          />
          <BarcodeField
            id="satuan-1-barcode"
            value={t1?.kodeBarcode ?? ""}
            onChange={(v) => onChange(patchTier(tiers, 0, { kodeBarcode: v }))}
            disabled={sectionDisabled}
          />
          {stokCol === 0 ? stokField : null}
        </div>

        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Konversi ke satuan 2 (opsional)</p>
          <div className="flex items-end gap-3">
            <TokoInput
              id="satuan-1-qty"
              label="Isi"
              labelSize="sm"
              inputMode="numeric"
              value={t1?.qtyIsi ?? ""}
              onChange={(e) => onChange(patchTier(tiers, 0, { qtyIsi: e.target.value }))}
              placeholder="10"
              className="w-20"
              disabled={sectionDisabled}
            />
            <span className="pb-2.5 text-sm font-medium text-zinc-500">×</span>
            <TokoInput
              id="satuan-2-nama"
              label="Satuan 2 (opsional)"
              labelSize="sm"
              wrapperClassName="min-w-[8rem] flex-1"
              value={t2?.nama ?? ""}
              onChange={(e) => onChange(patchTier(tiers, 1, { nama: e.target.value }))}
              placeholder="pack"
              disabled={sectionDisabled}
            />
          </div>
          <HargaPair
            idPrefix="s2"
            hargaJual={t2?.hargaJual ?? ""}
            hargaBeli={t2?.hargaBeli ?? ""}
            onJual={(v) => onChange(patchTier(tiers, 1, { hargaJual: v }))}
            onBeli={(v) => onChange(patchTier(tiers, 1, { hargaBeli: v }))}
            disabled={sectionDisabled}
          />
          <BarcodeField
            id="satuan-2-barcode"
            value={t2?.kodeBarcode ?? ""}
            onChange={(v) => onChange(patchTier(tiers, 1, { kodeBarcode: v }))}
            disabled={sectionDisabled}
          />
          {stokCol === 1 ? stokField : null}
        </div>

        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Konversi ke satuan 3 — terkecil (opsional)
          </p>
          <div className="flex items-end gap-3">
            <TokoInput
              id="satuan-2-qty"
              label="Isi"
              labelSize="sm"
              inputMode="numeric"
              value={t2?.qtyIsi ?? ""}
              onChange={(e) => onChange(patchTier(tiers, 1, { qtyIsi: e.target.value }))}
              placeholder="8"
              className="w-20"
              disabled={sectionDisabled}
            />
            <span className="pb-2.5 text-sm font-medium text-zinc-500">×</span>
            <TokoInput
              id="satuan-3-nama"
              label="Satuan 3 (opsional)"
              labelSize="sm"
              wrapperClassName="min-w-[8rem] flex-1"
              value={t3?.nama ?? ""}
              onChange={(e) => onChange(patchTier(tiers, 2, { nama: e.target.value }))}
              placeholder="pcs"
              disabled={sectionDisabled}
            />
          </div>
          <HargaPair
            idPrefix="s3"
            hargaJual={t3?.hargaJual ?? ""}
            hargaBeli={t3?.hargaBeli ?? ""}
            onJual={(v) => onChange(patchTier(tiers, 2, { hargaJual: v }))}
            onBeli={(v) => onChange(patchTier(tiers, 2, { hargaBeli: v }))}
            disabled={sectionDisabled}
          />
          <BarcodeField
            id="satuan-3-barcode"
            value={t3?.kodeBarcode ?? ""}
            onChange={(v) => onChange(patchTier(tiers, 2, { kodeBarcode: v }))}
            disabled={sectionDisabled}
          />
          {stokCol === 2 ? stokField : null}
        </div>
      </div>
    </section>
  );
}
