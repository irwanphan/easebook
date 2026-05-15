import type { ReactNode } from "react";
import type { KontakMasterRow } from "@/data/kontakMaster";

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-zinc-700">
      {children}
    </label>
  );
}

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

const textareaClass =
  "mt-1 min-h-[88px] w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

export type KontakMasterFieldsProps = {
  idPrefix: string;
  values: KontakMasterRow;
  onChange: (next: KontakMasterRow) => void;
  kodeReadOnly: boolean;
};

export function KontakMasterFields({ idPrefix, values, onChange, kodeReadOnly }: KontakMasterFieldsProps) {
  function patch(partial: Partial<KontakMasterRow>) {
    onChange({ ...values, ...partial });
  }

  return (
    <div className="space-y-5">
      <div>
        <FieldLabel htmlFor={`${idPrefix}-kode`}>Kode</FieldLabel>
        <input
          id={`${idPrefix}-kode`}
          name="kode"
          value={values.kode}
          onChange={(e) => patch({ kode: e.target.value })}
          readOnly={kodeReadOnly}
          disabled={kodeReadOnly}
          placeholder="Contoh: PLG-003"
          className={`${inputClass} ${kodeReadOnly ? "cursor-not-allowed bg-zinc-50 text-zinc-600" : ""}`}
          autoComplete="off"
        />
      </div>

      <div>
        <FieldLabel htmlFor={`${idPrefix}-nama`}>Nama</FieldLabel>
        <input
          id={`${idPrefix}-nama`}
          name="nama"
          value={values.nama}
          onChange={(e) => patch({ nama: e.target.value })}
          placeholder="Nama perusahaan atau orang"
          className={inputClass}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FieldLabel htmlFor={`${idPrefix}-alamat`}>Alamat</FieldLabel>
          <textarea
            id={`${idPrefix}-alamat`}
            name="alamat"
            value={values.alamat}
            onChange={(e) => patch({ alamat: e.target.value })}
            placeholder="Alamat lengkap"
            className={textareaClass}
            rows={3}
          />
        </div>
        <div>
          <FieldLabel htmlFor={`${idPrefix}-kota`}>Kota</FieldLabel>
          <input
            id={`${idPrefix}-kota`}
            name="kota"
            value={values.kota}
            onChange={(e) => patch({ kota: e.target.value })}
            placeholder="Kota / kabupaten"
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel htmlFor={`${idPrefix}-telepon`}>Telepon</FieldLabel>
          <input
            id={`${idPrefix}-telepon`}
            name="telepon"
            value={values.telepon}
            onChange={(e) => patch({ telepon: e.target.value })}
            placeholder="Nomor telepon / WhatsApp"
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel htmlFor={`${idPrefix}-email`}>Email</FieldLabel>
          <input
            id={`${idPrefix}-email`}
            name="email"
            type="email"
            value={values.email}
            onChange={(e) => patch({ email: e.target.value })}
            placeholder="Opsional"
            className={inputClass}
            autoComplete="off"
          />
        </div>
        <div>
          <FieldLabel htmlFor={`${idPrefix}-npwp`}>NPWP</FieldLabel>
          <input
            id={`${idPrefix}-npwp`}
            name="npwp"
            value={values.npwp}
            onChange={(e) => patch({ npwp: e.target.value })}
            placeholder="Opsional"
            className={inputClass}
            autoComplete="off"
          />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel htmlFor={`${idPrefix}-catatan`}>Catatan</FieldLabel>
          <textarea
            id={`${idPrefix}-catatan`}
            name="catatan"
            value={values.catatan}
            onChange={(e) => patch({ catatan: e.target.value })}
            placeholder="Termin, diskon khusus, preferensi kirim, dll."
            className={textareaClass}
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
