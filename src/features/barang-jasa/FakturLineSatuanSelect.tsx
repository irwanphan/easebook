import type { BarangJasaRow } from "@/data/barangJasa";
import { findSatuanPilihan, getSatuanPilihanOptions } from "@/data/barangJasa";

const selectClass =
  "w-full min-w-[5.5rem] rounded-xl border border-zinc-200 bg-white px-2.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-zinc-50";

type FakturLineSatuanSelectProps = {
  barang: BarangJasaRow | undefined;
  tingkat: number;
  onChange: (tingkat: number, hargaJual: number) => void;
  disabled?: boolean;
};

export function FakturLineSatuanSelect({ barang, tingkat, onChange, disabled }: FakturLineSatuanSelectProps) {
  if (!barang) {
    return <span className="inline-block pt-2.5 text-sm text-zinc-400">—</span>;
  }

  const options = getSatuanPilihanOptions(barang);
  const current = findSatuanPilihan(barang, tingkat) ?? options[0];

  if (options.length <= 1) {
    return <span className="inline-block pt-2.5 text-sm font-medium text-zinc-700">{current?.nama ?? "—"}</span>;
  }

  return (
    <select
      value={current?.tingkat ?? 1}
      onChange={(e) => {
        const t = Number.parseInt(e.target.value, 10);
        const opt = options.find((o) => o.tingkat === t);
        if (opt) onChange(opt.tingkat, opt.hargaJual);
      }}
      className={selectClass}
      disabled={disabled}
      aria-label="Satuan"
    >
      {options.map((o) => (
        <option key={o.tingkat} value={o.tingkat}>
          {o.nama}
        </option>
      ))}
    </select>
  );
}
