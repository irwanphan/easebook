import type { FormEvent, ReactNode } from "react";
import type { AkunKeuanganRow, JurnalKonfigurasi } from "@/data/keuangan";
import { labelKelompokAkun } from "@/data/keuangan";
import { Button } from "@/components/ui/Button";
import { isJurnalKonfigurasiComplete, JURNAL_KONFIGURASI_FIELDS } from "@/features/keuangan/jurnalKonfigurasi";
import { TokoLookup } from "@/components/ui/TokoLookup";

export type JurnalKonfigurasiFormProps = {
  config: JurnalKonfigurasi | null;
  akunList: AkunKeuanganRow[];
  saving?: boolean;
  disabled?: boolean;
  onConfigChange: (config: JurnalKonfigurasi) => void;
  onSubmit: (e: FormEvent) => void;
  footer?: ReactNode;
};

export function JurnalKonfigurasiForm({
  config,
  akunList,
  saving = false,
  disabled = false,
  onConfigChange,
  onSubmit,
  footer,
}: JurnalKonfigurasiFormProps) {
  const complete = isJurnalKonfigurasiComplete(config);
  const fieldsDisabled = disabled || !config;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {JURNAL_KONFIGURASI_FIELDS.map(({ key, label, hint }) => (
        <TokoLookup<AkunKeuanganRow>
          key={key}
          label={label}
          hint={hint}
          options={akunList}
          value={config?.[key] ?? null}
          getKey={(a) => a.kode}
          getLabel={(a) => `${a.kode} — ${a.nama}`}
          getDescription={(a) => labelKelompokAkun(a.kelompok)}
          onChange={(opt) => {
            if (!config) return;
            onConfigChange({ ...config, [key]: opt ? opt.kode : null });
          }}
          placeholder="— Pilih akun —"
          searchPlaceholder="Cari kode atau nama akun…"
          emptyMessage="Akun tidak ditemukan."
          clearable
          disabled={fieldsDisabled || saving}
        />
      ))}

      <div className="pt-1">
        <Button type="submit" disabled={fieldsDisabled || saving} className="w-full sm:w-auto">
          {saving ? "Menyimpan…" : "Simpan konfigurasi"}
        </Button>
      </div>

      {footer}

      {complete ? (
        <p className="text-sm text-emerald-700">Konfigurasi siap dipakai untuk jurnal otomatis.</p>
      ) : (
        <p className="text-sm text-amber-700">
          Lengkapi semua akun agar template jurnal dan transaksi pembelian/penjualan dapat dicatat.
        </p>
      )}
    </form>
  );
}
