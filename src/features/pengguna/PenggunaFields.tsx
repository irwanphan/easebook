import type { ReactNode } from "react";

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
  "mt-1 min-h-[72px] w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

export type PenggunaFormValues = {
  username: string;
  namaLengkap: string;
  email: string;
  password: string;
  passwordConfirm: string;
  departemen: string;
  nomorHp: string;
  aktif: boolean;
  isAdmin: boolean;
  catatan: string;
};

type PenggunaFieldsProps = {
  values: PenggunaFormValues;
  onChange: (patch: Partial<PenggunaFormValues>) => void;
  /** Saat ubah: username tidak bisa diedit. */
  isEdit?: boolean;
};

export function PenggunaFields({ values, onChange, isEdit = false }: PenggunaFieldsProps) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <FieldLabel htmlFor="pengguna-username">Username</FieldLabel>
        <input
          id="pengguna-username"
          className={inputClass}
          value={values.username}
          onChange={(e) => onChange({ username: e.target.value })}
          disabled={isEdit}
          autoComplete="username"
          placeholder="contoh: budi.santoso"
        />
        {isEdit ? (
          <p className="mt-1 text-xs text-zinc-500">Username tidak dapat diubah setelah dibuat.</p>
        ) : null}
      </div>

      <div>
        <FieldLabel htmlFor="pengguna-nama">Nama lengkap</FieldLabel>
        <input
          id="pengguna-nama"
          className={inputClass}
          value={values.namaLengkap}
          onChange={(e) => onChange({ namaLengkap: e.target.value })}
          autoComplete="name"
          placeholder="Nama tampilan di aplikasi"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="pengguna-email">Email</FieldLabel>
          <input
            id="pengguna-email"
            type="email"
            className={inputClass}
            value={values.email}
            onChange={(e) => onChange({ email: e.target.value })}
            autoComplete="email"
            placeholder="opsional"
          />
        </div>
        <div>
          <FieldLabel htmlFor="pengguna-hp">Nomor HP</FieldLabel>
          <input
            id="pengguna-hp"
            type="tel"
            className={inputClass}
            value={values.nomorHp}
            onChange={(e) => onChange({ nomorHp: e.target.value })}
            autoComplete="tel"
            placeholder="+62 …"
          />
        </div>
      </div>

      <div>
        <FieldLabel htmlFor="pengguna-departemen">Departemen</FieldLabel>
        <input
          id="pengguna-departemen"
          className={inputClass}
          value={values.departemen}
          onChange={(e) => onChange({ departemen: e.target.value })}
          placeholder="contoh: Gudang, Keuangan, Penjualan"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="pengguna-password">
            {isEdit ? "Password baru" : "Password"}
          </FieldLabel>
          <input
            id="pengguna-password"
            type="password"
            className={inputClass}
            value={values.password}
            onChange={(e) => onChange({ password: e.target.value })}
            autoComplete={isEdit ? "new-password" : "new-password"}
            placeholder={isEdit ? "Kosongkan jika tidak diubah" : "Minimal 6 karakter"}
          />
        </div>
        <div>
          <FieldLabel htmlFor="pengguna-password-confirm">Konfirmasi password</FieldLabel>
          <input
            id="pengguna-password-confirm"
            type="password"
            className={inputClass}
            value={values.passwordConfirm}
            onChange={(e) => onChange({ passwordConfirm: e.target.value })}
            autoComplete="new-password"
            placeholder={isEdit ? "Kosongkan jika tidak diubah" : ""}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
            checked={values.aktif}
            onChange={(e) => onChange({ aktif: e.target.checked })}
          />
          Akun aktif
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
            checked={values.isAdmin}
            onChange={(e) => onChange({ isAdmin: e.target.checked })}
          />
          Administrator (akses penuh)
        </label>
      </div>

      <div>
        <FieldLabel htmlFor="pengguna-catatan">Catatan</FieldLabel>
        <textarea
          id="pengguna-catatan"
          className={textareaClass}
          value={values.catatan}
          onChange={(e) => onChange({ catatan: e.target.value })}
          placeholder="Opsional — keterangan internal"
        />
      </div>
    </div>
  );
}
