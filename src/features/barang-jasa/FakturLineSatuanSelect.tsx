import type { BarangJasaRow } from "@/data/barangJasa";
import { findSatuanPilihan, getSatuanPilihanOptions } from "@/data/barangJasa";
import { TokoSelect } from "@/components/ui/TokoInput";

type FakturLineSatuanSelectProps = {
  id?: string;
  barang: BarangJasaRow | undefined;
  tingkat: number;
  onChange: (tingkat: number, hargaJual: number) => void;
  disabled?: boolean;
};

export function FakturLineSatuanSelect({ id, barang, tingkat, onChange, disabled }: FakturLineSatuanSelectProps) {
  if (!barang) {
    return <span className="inline-block pt-2.5 text-sm text-zinc-400">—</span>;
  }

  const options = getSatuanPilihanOptions(barang);
  const current = findSatuanPilihan(barang, tingkat) ?? options[0];

  if (options.length <= 1) {
    return <span className="inline-block pt-2.5 text-sm font-medium text-zinc-700">{current?.nama ?? "—"}</span>;
  }

  return (
    <TokoSelect
      id={id}
      value={current?.tingkat ?? 1}
      onChange={(e) => {
        const t = Number.parseInt(e.target.value, 10);
        const opt = options.find((o) => o.tingkat === t);
        if (opt) onChange(opt.tingkat, opt.hargaJual);
      }}
      disabled={disabled}
      required
    >
      {options.map((o) => (
        <option key={o.tingkat} value={o.tingkat}>
          {o.nama}
        </option>
      ))}
    </TokoSelect>
  );
}
