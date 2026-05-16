import type { FormEvent, ReactNode } from "react";
import type { AkunKeuanganRow, JurnalKonfigurasi } from "@/data/keuangan";
import { Button } from "@/components/ui/Button";
import { isJurnalKonfigurasiComplete, JURNAL_KONFIGURASI_FIELDS } from "@/features/keuangan/jurnalKonfigurasi";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

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
        <div key={key}>
          <label className="block text-sm font-medium text-zinc-700">{label}</label>
          {hint ? <p className="mt-0.5 text-xs text-zinc-500">{hint}</p> : null}
          <select
            value={config?.[key] ?? ""}
            onChange={(e) => {
              if (!config) return;
              onConfigChange({
                ...config,
                [key]: e.target.value ? e.target.value : null,
              });
            }}
            className={inputClass}
            disabled={fieldsDisabled || saving}
          >
            <option value="">— Pilih akun —</option>
            {akunList.map((a) => (
              <option key={a.kode} value={a.kode}>
                {a.kode} — {a.nama}
              </option>
            ))}
          </select>
        </div>
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
