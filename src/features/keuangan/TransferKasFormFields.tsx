import { useMemo } from "react";
import { TokoInput } from "@/components/ui/TokoInput";
import { TokoLookup } from "@/components/ui/TokoLookup";
import type { AkunKeuanganRow } from "@/data/keuangan";

export type TransferKasFormState = {
  tanggal: string;
  sumber: string;
  tujuan: string;
  nominalKirim: number;
  nominalTerima: number;
  biaya: number;
  akunBiaya: string;
  catatan: string;
};

export const EMPTY_TRANSFER_KAS_FORM: TransferKasFormState = {
  tanggal: "",
  sumber: "",
  tujuan: "",
  nominalKirim: 0,
  nominalTerima: 0,
  biaya: 0,
  akunBiaya: "",
  catatan: "",
};

export function todayLocalISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function sanitizeAmount(value: string): number {
  const cleaned = value.replace(/[^0-9]/g, "");
  if (!cleaned) return 0;
  return Math.max(0, parseInt(cleaned, 10) || 0);
}

export function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Validasi terpusat — dipakai untuk gating submit & menampilkan pesan ramah. */
export function validateTransferKas(state: TransferKasFormState): string | null {
  if (!state.tanggal.trim()) return "Tanggal transfer wajib diisi.";
  if (!state.sumber.trim() || !state.tujuan.trim()) return "Pilih akun kas asal dan tujuan.";
  if (state.sumber === state.tujuan) return "Akun kas asal dan tujuan tidak boleh sama.";
  if (state.nominalKirim <= 0 || state.nominalTerima <= 0) {
    return "Nominal dikirim & diterima harus lebih dari 0.";
  }
  if (state.biaya < 0) return "Biaya transfer tidak boleh negatif.";
  if (state.biaya > 0 && !state.akunBiaya.trim()) {
    return "Pilih akun biaya untuk mencatat biaya transfer.";
  }
  if (state.nominalKirim !== state.nominalTerima + state.biaya) {
    return "Nominal tidak balance: kirim harus = terima + biaya.";
  }
  return null;
}

export type TransferKasFormFieldsProps = {
  value: TransferKasFormState;
  onChange: (next: TransferKasFormState) => void;
  akunKasList: AkunKeuanganRow[];
  akunBiayaList: AkunKeuanganRow[];
  disabled?: boolean;
  loadingMaster?: boolean;
};

export function TransferKasFormFields({
  value,
  onChange,
  akunKasList,
  akunBiayaList,
  disabled = false,
  loadingMaster = false,
}: TransferKasFormFieldsProps) {
  const sumberRow = useMemo(
    () => akunKasList.find((a) => a.kode === value.sumber),
    [akunKasList, value.sumber],
  );
  const tujuanRow = useMemo(
    () => akunKasList.find((a) => a.kode === value.tujuan),
    [akunKasList, value.tujuan],
  );

  const selisih = value.nominalKirim - (value.nominalTerima + value.biaya);
  const balanced = selisih === 0;

  function patch(p: Partial<TransferKasFormState>) {
    onChange({ ...value, ...p });
  }

  return (
    <div className="flex flex-col gap-5">
      <TokoInput
        label="Tanggal transfer"
        type="date"
        value={value.tanggal}
        onChange={(e) => patch({ tanggal: e.target.value })}
        disabled={disabled}
        required
      />

      <div className="grid gap-4 md:grid-cols-2">
        <TokoLookup<AkunKeuanganRow>
          label="Kas asal"
          options={akunKasList}
          value={value.sumber || null}
          getKey={(a) => a.kode}
          getLabel={(a) => `${a.kode} — ${a.nama}`}
          getDescription={(a) => `Saldo: ${formatRupiah(a.saldo)}`}
          onChange={(opt) => patch({ sumber: opt ? opt.kode : "" })}
          placeholder="— Pilih akun kas —"
          searchPlaceholder="Cari kode atau nama akun kas…"
          emptyMessage="Akun kas tidak ditemukan."
          hint={sumberRow ? `Saldo ${formatRupiah(sumberRow.saldo)}` : undefined}
          disabled={disabled || loadingMaster}
          required
        />
        <TokoInput
          label="Nominal dikirim"
          type="text"
          inputMode="numeric"
          value={value.nominalKirim ? value.nominalKirim.toLocaleString("id-ID") : ""}
          onChange={(e) => patch({ nominalKirim: sanitizeAmount(e.target.value) })}
          disabled={disabled}
          placeholder="0"
          className="text-right"
          required
        />
        <TokoLookup<AkunKeuanganRow>
          label="Kas tujuan"
          options={akunKasList.filter((a) => a.kode !== value.sumber)}
          value={value.tujuan || null}
          getKey={(a) => a.kode}
          getLabel={(a) => `${a.kode} — ${a.nama}`}
          getDescription={(a) => `Saldo: ${formatRupiah(a.saldo)}`}
          onChange={(opt) => patch({ tujuan: opt ? opt.kode : "" })}
          placeholder="— Pilih akun kas —"
          searchPlaceholder="Cari kode atau nama akun kas…"
          emptyMessage="Akun kas tidak ditemukan."
          error={
            value.sumber && value.tujuan && value.sumber === value.tujuan
              ? "Tidak boleh sama dengan kas asal."
              : undefined
          }
          hint={
            value.sumber && value.tujuan && value.sumber !== value.tujuan && tujuanRow
              ? `Saldo ${formatRupiah(tujuanRow.saldo)}`
              : undefined
          }
          disabled={disabled || loadingMaster}
          required
        />
        <TokoInput
          label="Nominal diterima"
          type="text"
          inputMode="numeric"
          value={value.nominalTerima ? value.nominalTerima.toLocaleString("id-ID") : ""}
          onChange={(e) => patch({ nominalTerima: sanitizeAmount(e.target.value) })}
          disabled={disabled}
          placeholder="0"
          className="text-right"
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TokoInput
          label="Biaya transfer"
          type="text"
          inputMode="numeric"
          value={value.biaya ? value.biaya.toLocaleString("id-ID") : ""}
          onChange={(e) => patch({ biaya: sanitizeAmount(e.target.value) })}
          disabled={disabled}
          placeholder="0"
          className="text-right"
          hint="Selisih kirim − terima; jadi 0 jika sama besar."
        />
        <TokoLookup<AkunKeuanganRow>
          label="Akun biaya"
          options={akunBiayaList}
          value={value.akunBiaya || null}
          getKey={(a) => a.kode}
          getLabel={(a) => `${a.kode} — ${a.nama}`}
          onChange={(opt) => patch({ akunBiaya: opt ? opt.kode : "" })}
          placeholder="— Pilih akun biaya —"
          searchPlaceholder="Cari kode atau nama akun biaya…"
          emptyMessage="Akun biaya tidak ditemukan."
          hint={value.biaya === 0 ? "Tidak diperlukan jika biaya 0." : "Catat biaya ke akun ini."}
          disabled={disabled || value.biaya === 0 || loadingMaster}
          required={value.biaya > 0}
        />
      </div>

      <div
        className={`rounded-xl border px-4 py-3 text-sm ${
          balanced
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        {balanced ? (
          <p>
            Balance — kirim <strong>{formatRupiah(value.nominalKirim)}</strong> = terima{" "}
            <strong>{formatRupiah(value.nominalTerima)}</strong> + biaya{" "}
            <strong>{formatRupiah(value.biaya)}</strong>.
          </p>
        ) : (
          <p>
            Selisih <strong>{formatRupiah(Math.abs(selisih))}</strong> — pastikan kirim = terima +
            biaya sebelum menyimpan.
          </p>
        )}
      </div>

      <TokoInput
        label="Catatan"
        type="text"
        value={value.catatan}
        onChange={(e) => patch({ catatan: e.target.value })}
        disabled={disabled}
        placeholder="opsional"
      />
    </div>
  );
}
