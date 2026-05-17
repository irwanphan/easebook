import type { ReactNode } from "react";
import { PenggunaFotoProfilField, type PenggunaFotoState } from "@/features/pengguna/PenggunaFotoProfilField";

export type { PenggunaFotoState };

export type ProfilPenggunaFormValues = {
  username: string;
  namaLengkap: string;
  email: string;
  departemen: string;
  nomorHp: string;
  catatan: string;
  password: string;
  passwordConfirm: string;
  foto: PenggunaFotoState;
};

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

type ProfilPenggunaFieldsProps = {
  values: ProfilPenggunaFormValues;
  onChange: (patch: Partial<ProfilPenggunaFormValues>) => void;
  isAdmin?: boolean;
};

export function ProfilPenggunaFields({ values, onChange, isAdmin = false }: ProfilPenggunaFieldsProps) {
  return (
    <div className="flex flex-col gap-6">
      <PenggunaFotoProfilField value={values.foto} onChange={(foto) => onChange({ foto })} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="profil-username">Username</FieldLabel>
          <input
            id="profil-username"
            className={`${inputClass} bg-zinc-50 text-zinc-500`}
            value={values.username}
            readOnly
            disabled
          />
          <p className="mt-1 text-xs text-zinc-500">Username tidak dapat diubah.</p>
        </div>
        <div>
          <FieldLabel htmlFor="profil-nama">Nama lengkap</FieldLabel>
          <input
            id="profil-nama"
            className={inputClass}
            value={values.namaLengkap}
            onChange={(e) => onChange({ namaLengkap: e.target.value })}
            autoComplete="name"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="profil-email">Email</FieldLabel>
          <input
            id="profil-email"
            type="email"
            className={inputClass}
            value={values.email}
            onChange={(e) => onChange({ email: e.target.value })}
            autoComplete="email"
            placeholder="opsional"
          />
        </div>
        <div>
          <FieldLabel htmlFor="profil-hp">Nomor HP</FieldLabel>
          <input
            id="profil-hp"
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
        <FieldLabel htmlFor="profil-departemen">Departemen</FieldLabel>
        <input
          id="profil-departemen"
          className={inputClass}
          value={values.departemen}
          onChange={(e) => onChange({ departemen: e.target.value })}
        />
      </div>

      <div>
        <FieldLabel htmlFor="profil-catatan">Catatan</FieldLabel>
        <textarea
          id="profil-catatan"
          className={textareaClass}
          value={values.catatan}
          onChange={(e) => onChange({ catatan: e.target.value })}
          placeholder="Opsional"
        />
      </div>

      {isAdmin ? (
        <p className="rounded-xl border border-brand-200/80 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          Anda masuk sebagai administrator. Peran dan hak akses halaman hanya dapat diubah oleh admin lain
          di Manajemen → Pengguna.
        </p>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Ubah password</h3>
        <p className="mt-1 text-xs text-zinc-500">Kosongkan jika tidak ingin mengganti password.</p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="profil-password">Password baru</FieldLabel>
            <input
              id="profil-password"
              type="password"
              className={inputClass}
              value={values.password}
              onChange={(e) => onChange({ password: e.target.value })}
              autoComplete="new-password"
              placeholder="Minimal 6 karakter"
            />
          </div>
          <div>
            <FieldLabel htmlFor="profil-password-confirm">Konfirmasi password</FieldLabel>
            <input
              id="profil-password-confirm"
              type="password"
              className={inputClass}
              value={values.passwordConfirm}
              onChange={(e) => onChange({ passwordConfirm: e.target.value })}
              autoComplete="new-password"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
