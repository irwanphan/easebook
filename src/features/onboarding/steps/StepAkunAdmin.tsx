/**
 * Step 6 — Setup akun admin secara penuh.
 *
 * Sebelumnya step ini hanya mengganti password. Sekarang user bisa
 * sekaligus mengatur identitas akun: username, nama lengkap, email,
 * nomor HP, departemen, dan password. Tujuannya: setelah wizard
 * selesai, akun admin sudah berbentuk "akun nyata milik user", bukan
 * akun generik `admin / admin123`.
 *
 * Aturan submit (lewat tombol Lanjut):
 *  - Nama lengkap wajib.
 *  - Username valid (3+ char, alfanumerik + `._-`). Boleh ganti dari
 *    "admin" → backend `pengguna_rename` aman karena semua FK ke
 *    `pengguna(username)` `ON UPDATE CASCADE`.
 *  - Password:
 *      • Bila masih default (`admin123`) → WAJIB diisi & berbeda dari
 *        default, minimal 8 karakter.
 *      • Bila sudah aman → opsional. Kosong = pertahankan password.
 *  - Email & lainnya bebas (validasi minimal di backend).
 *
 * Urutan operasi backend (semuanya non-atomik antar-tabel, tapi tiap
 * operasi atomik di sisinya sendiri):
 *  1. `pengguna_rename` bila username berubah.
 *  2. `pengguna_update` untuk field lain (PK = username terbaru).
 *  3. `refreshSession` bila yang diupdate adalah user yang sedang
 *     login (umum, karena onboarding biasanya dijalankan oleh admin).
 *
 * Jika `pengguna_rename` sukses tapi `pengguna_update` gagal,
 * username sudah terganti — user diberi error message dan dapat
 * mengulang. Risiko inkonsistensi minimal karena field non-PK belum
 * berubah.
 *
 * Auto-skip: jika akun `admin` (bawaan) sudah pernah dihapus/rename,
 * step ini tidak lagi menemukan baris admin → submit() langsung
 * return true, wizard maju.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  AlertTriangle,
  Info,
  Mail,
  Phone,
  ShieldCheck,
  User,
  UserCog,
} from "lucide-react";
import { TokoInput } from "@/components/ui/TokoInput";
import type { PenggunaRow, PenggunaUpdate } from "@/data/pengguna";
import { useAuth } from "@/features/auth/AuthContext";
import { tauriErrorMessage } from "@/lib/tauriError";
import { OnboardingStepHeader } from "@/features/onboarding/components/OnboardingStepHeader";
import type { OnboardingStepHandle } from "@/features/onboarding/stepHandle";

const DEFAULT_USERNAME = "admin";
const DEFAULT_PASSWORD = "admin123";
const MIN_PASSWORD_LEN = 8;

type Props = {
  onSaved: () => Promise<void>;
};

type FormState = {
  username: string;
  namaLengkap: string;
  email: string;
  nomorHp: string;
  departemen: string;
  password: string;
  konfirmasi: string;
};

const EMPTY_FORM: FormState = {
  username: "",
  namaLengkap: "",
  email: "",
  nomorHp: "",
  departemen: "",
  password: "",
  konfirmasi: "",
};

async function fetchAdminRow(): Promise<{
  row: PenggunaRow | null;
  halamanAkses: string[];
}> {
  const list = await invoke<PenggunaRow[]>("pengguna_list");
  // Cari user yang aktif sebagai admin; fallback ke username "admin".
  const admin =
    list.find((r) => r.username.toLowerCase() === DEFAULT_USERNAME) ??
    list.find((r) => r.isAdmin) ??
    null;
  if (!admin) return { row: null, halamanAkses: [] };
  if (admin.isAdmin) return { row: admin, halamanAkses: [] };
  const halaman = await invoke<string[]>("pengguna_halaman_akses_get", {
    username: admin.username,
  });
  return { row: admin, halamanAkses: halaman };
}

async function isPasswordMasihDefault(username: string): Promise<boolean> {
  try {
    await invoke("pengguna_verifikasi_kata_sandi", {
      username,
      password: DEFAULT_PASSWORD,
    });
    return true;
  } catch {
    return false;
  }
}

function isUsernameValid(u: string): boolean {
  if (u.length < 3) return false;
  return /^[a-z0-9._-]+$/.test(u);
}

export const StepAkunAdmin = forwardRef<OnboardingStepHandle, Props>(
  function StepAkunAdmin({ onSaved }, ref) {
    const { session, refreshSession } = useAuth();

    const [adminRow, setAdminRow] = useState<PenggunaRow | null>(null);
    const [adminAkses, setAdminAkses] = useState<string[]>([]);
    const [adminMissing, setAdminMissing] = useState(false);
    const [stillDefault, setStillDefault] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const { row, halamanAkses } = await fetchAdminRow();
        setAdminRow(row);
        setAdminAkses(halamanAkses);
        setAdminMissing(!row);
        if (row) {
          const masihDefault =
            row.username.toLowerCase() === DEFAULT_USERNAME
              ? await isPasswordMasihDefault(row.username)
              : false;
          setStillDefault(masihDefault);
          setForm({
            username: row.username,
            namaLengkap: row.namaLengkap,
            email: row.email,
            nomorHp: row.nomorHp,
            departemen: row.departemen,
            password: "",
            konfirmasi: "",
          });
        } else {
          setStillDefault(false);
        }
      } catch (e) {
        setError(tauriErrorMessage(e));
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      void refresh();
    }, [refresh]);

    const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setError(null);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        async submit() {
          if (loading) {
            setError("Sedang memeriksa akun admin. Coba lagi sebentar.");
            return false;
          }
          if (adminMissing || !adminRow) {
            // Tidak ada admin bawaan untuk di-setup; wizard lanjut.
            return true;
          }

          const usernameLama = adminRow.username;
          const usernameBaru = form.username.trim().toLowerCase();
          const nama = form.namaLengkap.trim();
          const email = form.email.trim();
          const nomorHp = form.nomorHp.trim();
          const departemen = form.departemen.trim();
          const password = form.password;
          const konfir = form.konfirmasi;

          if (!nama) {
            setError("Nama lengkap wajib diisi.");
            return false;
          }
          if (!isUsernameValid(usernameBaru)) {
            setError(
              "Username minimal 3 karakter dan hanya boleh huruf kecil, angka, titik, strip, atau garis bawah.",
            );
            return false;
          }

          const akanGantiPassword = password.length > 0;
          if (stillDefault && !akanGantiPassword) {
            setError(
              `Password admin masih bawaan. Wajib diisi minimal ${MIN_PASSWORD_LEN} karakter untuk melanjutkan.`,
            );
            return false;
          }
          if (akanGantiPassword) {
            if (password.length < MIN_PASSWORD_LEN) {
              setError(`Password baru minimal ${MIN_PASSWORD_LEN} karakter.`);
              return false;
            }
            if (password === DEFAULT_PASSWORD) {
              setError("Password baru tidak boleh sama dengan password bawaan.");
              return false;
            }
            if (password !== konfir) {
              setError("Konfirmasi password tidak cocok.");
              return false;
            }
          }

          try {
            // 1) Rename username bila berubah.
            if (usernameBaru !== usernameLama.toLowerCase()) {
              await invoke("pengguna_rename", {
                oldUsername: usernameLama,
                newUsername: usernameBaru,
              });
            }

            // 2) Update field non-PK (termasuk password bila diisi).
            const payload: PenggunaUpdate = {
              namaLengkap: nama,
              email,
              password: akanGantiPassword ? password : "",
              departemen,
              nomorHp,
              aktif: adminRow.aktif,
              isAdmin: adminRow.isAdmin,
              catatan: adminRow.catatan,
              halamanAkses: adminRow.isAdmin ? [] : adminAkses,
            };
            await invoke("pengguna_update", {
              username: usernameBaru,
              row: payload,
            });

            // 3) Refresh session bila admin yang lagi login adalah dia.
            if (
              session?.username.toLowerCase() === usernameLama.toLowerCase() ||
              session?.username.toLowerCase() === usernameBaru
            ) {
              try {
                await refreshSession();
              } catch {
                /* non-kritikal */
              }
            }

            await refresh();
            await onSaved();
            return true;
          } catch (err) {
            setError(tauriErrorMessage(err));
            return false;
          }
        },
      }),
      [
        loading,
        adminMissing,
        adminRow,
        adminAkses,
        stillDefault,
        form,
        refresh,
        session,
        refreshSession,
        onSaved,
      ],
    );

    return (
      <div className="flex flex-1 flex-col gap-6">
        <OnboardingStepHeader
          icon={UserCog}
          judul="Akun admin Anda"
          wajib
          deskripsi="Setel identitas dan kata sandi akun administrator. Akun ini yang akan Anda pakai sehari-hari untuk masuk ke aplikasi."
        />

        {loading ? (
          <p className="text-sm text-zinc-500">Memeriksa akun admin…</p>
        ) : adminMissing ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              <p className="font-semibold">Akun admin tidak ditemukan.</p>
              <p className="mt-0.5 text-xs">
                Sepertinya akun admin sudah pernah dihapus. Langkah ini akan otomatis dilewati.
              </p>
            </div>
          </div>
        ) : (
          <>
            {stillDefault ? (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div>
                  <p className="font-semibold">Akun masih memakai kredensial bawaan.</p>
                  <p className="mt-0.5 text-xs">
                    Saat ini siapapun dapat masuk dengan{" "}
                    <code>{DEFAULT_USERNAME}</code> / <code>{DEFAULT_PASSWORD}</code>. Ganti
                    sekarang supaya akun Anda aman.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div>
                  <p className="font-semibold">Akun admin sudah aman.</p>
                  <p className="mt-0.5 text-xs">
                    Anda tetap dapat memperbarui identitas di sini. Kosongkan password jika
                    tidak ingin menggantinya.
                  </p>
                </div>
              </div>
            )}

            {error ? (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
              >
                {error}
              </div>
            ) : null}

            <section
              aria-labelledby="akun-profil-heading"
              className="flex flex-col gap-4 rounded-2xl border border-zinc-200/80 bg-white p-4"
            >
              <header className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <User className="h-3.5 w-3.5" aria-hidden />
                <span id="akun-profil-heading">Profil</span>
              </header>

              <div className="grid gap-5 sm:grid-cols-2">
                <TokoInput
                  label={
                    <span>
                      Username <span className="text-rose-600">*</span>
                    </span>
                  }
                  value={form.username}
                  onChange={(e) => update("username", e.target.value.toLowerCase())}
                  autoComplete="username"
                  placeholder="mis. budi.santoso"
                  hint="Huruf kecil, angka, titik, strip, atau garis bawah. Minimal 3 karakter."
                />
                <TokoInput
                  label={
                    <span>
                      Nama lengkap <span className="text-rose-600">*</span>
                    </span>
                  }
                  value={form.namaLengkap}
                  onChange={(e) => update("namaLengkap", e.target.value)}
                  autoComplete="name"
                  placeholder="mis. Budi Santoso"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <TokoInput
                  label={
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
                      Email
                    </span>
                  }
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  autoComplete="email"
                  placeholder="nama@perusahaan.com"
                />
                <TokoInput
                  label={
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
                      Nomor HP
                    </span>
                  }
                  type="tel"
                  value={form.nomorHp}
                  onChange={(e) => update("nomorHp", e.target.value)}
                  autoComplete="tel"
                  placeholder="+62 812-0000-0000"
                />
              </div>

              <TokoInput
                label="Departemen"
                value={form.departemen}
                onChange={(e) => update("departemen", e.target.value)}
                placeholder="mis. Direksi, Keuangan, Operasional"
              />
            </section>

            <section
              aria-labelledby="akun-sandi-heading"
              className="flex flex-col gap-4 rounded-2xl border border-zinc-200/80 bg-white p-4"
            >
              <header className="flex items-center justify-between gap-2">
                <span
                  id="akun-sandi-heading"
                  className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500"
                >
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                  Kata sandi
                </span>
                <span className="text-[11px] font-medium text-zinc-500">
                  {stillDefault ? "Wajib diisi" : "Opsional"}
                </span>
              </header>

              <div className="flex items-start gap-2 rounded-xl bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-zinc-600">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
                <span>
                  {stillDefault
                    ? `Buat password baru minimal ${MIN_PASSWORD_LEN} karakter — campurkan huruf, angka, dan simbol.`
                    : "Kosongkan kedua kolom untuk mempertahankan password sekarang."}
                </span>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <TokoInput
                  label={
                    <span>
                      Password baru
                      {stillDefault ? <span className="text-rose-600"> *</span> : null}
                    </span>
                  }
                  type="password"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  autoComplete="new-password"
                  placeholder={
                    stillDefault ? `Minimal ${MIN_PASSWORD_LEN} karakter` : "(kosong = no-change)"
                  }
                />
                <TokoInput
                  label={
                    <span>
                      Konfirmasi password
                      {stillDefault ? <span className="text-rose-600"> *</span> : null}
                    </span>
                  }
                  type="password"
                  value={form.konfirmasi}
                  onChange={(e) => update("konfirmasi", e.target.value)}
                  autoComplete="new-password"
                  placeholder="Ulangi password baru"
                  disabled={form.password.length === 0}
                />
              </div>
            </section>
          </>
        )}
      </div>
    );
  },
);
