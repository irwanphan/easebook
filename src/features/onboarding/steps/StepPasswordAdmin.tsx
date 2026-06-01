/**
 * Step 5 — Ganti password akun admin bawaan.
 *
 * Aplikasi men-seed user `admin` dengan password `admin123` saat pertama
 * dijalankan. Ini berbahaya kalau ditinggalkan apa adanya, karena siapa
 * pun yang membuka mesin user bisa login sebagai admin.
 *
 * Langkah ini wajib jika password masih default. Detection-nya pakai
 * `pengguna_verifikasi_kata_sandi("admin","admin123")` — kalau berhasil,
 * berarti masih default. Setelah diganti, helper di hook checklist akan
 * gagal verifikasi dan checklist menyala hijau.
 */
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TokoInput } from "@/components/ui/TokoInput";
import type { PenggunaRow, PenggunaUpdate } from "@/data/pengguna";
import { useAuth } from "@/features/auth/AuthContext";
import { tauriErrorMessage } from "@/lib/tauriError";
import { OnboardingStepHeader } from "@/features/onboarding/components/OnboardingStepHeader";

const DEFAULT_PASSWORD = "admin123";

type Props = {
  onSaved: () => Promise<void>;
};

async function fetchAdminRow(): Promise<{
  row: PenggunaRow | null;
  halamanAkses: string[];
}> {
  const list = await invoke<PenggunaRow[]>("pengguna_list");
  const admin = list.find((r) => r.username.toLowerCase() === "admin") ?? null;
  if (!admin) return { row: null, halamanAkses: [] };
  if (admin.isAdmin) return { row: admin, halamanAkses: [] };
  const halaman = await invoke<string[]>("pengguna_halaman_akses_get", {
    username: admin.username,
  });
  return { row: admin, halamanAkses: halaman };
}

async function isAdminPasswordMasihDefault(): Promise<boolean> {
  try {
    await invoke("pengguna_verifikasi_kata_sandi", {
      username: "admin",
      password: DEFAULT_PASSWORD,
    });
    return true;
  } catch {
    return false;
  }
}

export function StepPasswordAdmin({ onSaved }: Props) {
  const { session, refreshSession } = useAuth();

  const [stillDefault, setStillDefault] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminRow, setAdminRow] = useState<PenggunaRow | null>(null);
  const [adminAkses, setAdminAkses] = useState<string[]>([]);
  const [adminMissing, setAdminMissing] = useState(false);

  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ row, halamanAkses }, masihDefault] = await Promise.all([
        fetchAdminRow(),
        isAdminPasswordMasihDefault(),
      ]);
      setAdminRow(row);
      setAdminAkses(halamanAkses);
      setAdminMissing(!row);
      setStillDefault(masihDefault);
    } catch (e) {
      setError(tauriErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setHint(null);

    if (!adminRow) {
      setError("Akun admin tidak ditemukan.");
      return;
    }
    const baru = password.trim();
    const konfir = konfirmasi.trim();
    if (baru.length < 8) {
      setError("Password baru minimal 8 karakter.");
      return;
    }
    if (baru === DEFAULT_PASSWORD) {
      setError("Password baru tidak boleh sama dengan password bawaan.");
      return;
    }
    if (baru !== konfir) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setSaving(true);
    try {
      const payload: PenggunaUpdate = {
        namaLengkap: adminRow.namaLengkap,
        email: adminRow.email,
        password: baru,
        departemen: adminRow.departemen,
        nomorHp: adminRow.nomorHp,
        aktif: adminRow.aktif,
        isAdmin: adminRow.isAdmin,
        catatan: adminRow.catatan,
        halamanAkses: adminRow.isAdmin ? [] : adminAkses,
      };
      await invoke("pengguna_update", {
        username: adminRow.username,
        row: payload,
      });

      if (session?.username.toLowerCase() === adminRow.username.toLowerCase()) {
        try {
          await refreshSession();
        } catch {
          /* refresh non-kritikal — biarkan user lanjut */
        }
      }

      setPassword("");
      setKonfirmasi("");
      setHint("Password admin berhasil diganti.");
      await refresh();
      await onSaved();
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <OnboardingStepHeader
        icon={KeyRound}
        judul="Ganti password admin"
        wajib
        deskripsi="Akun bawaan menggunakan password yang diketahui publik. Ganti dengan password kuat sebelum mulai memakai aplikasi."
      />

      {loading ? (
        <p className="text-sm text-zinc-500">Memeriksa akun admin…</p>
      ) : adminMissing ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">Akun bawaan tidak ditemukan.</p>
            <p className="mt-0.5 text-xs">
              Sepertinya akun <code>admin</code> sudah pernah dihapus atau di-rename. Langkah ini
              akan otomatis dianggap selesai jika tidak ada password default lagi.
            </p>
          </div>
        </div>
      ) : (
        <>
          {stillDefault ? (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">Password admin masih bawaan.</p>
                <p className="mt-0.5 text-xs">
                  Akun <code>admin</code> saat ini bisa dimasuki dengan password{" "}
                  <code>admin123</code>. Ganti segera supaya akun Anda aman.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">Password admin sudah aman.</p>
                <p className="mt-0.5 text-xs">
                  Akun <code>admin</code> tidak lagi memakai password bawaan. Anda bisa lanjut
                  menyelesaikan setup awal.
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
          {hint ? (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{hint}</span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <TokoInput
                label={
                  <span>
                    Password baru <span className="text-rose-600">*</span>
                  </span>
                }
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                  setHint(null);
                }}
                autoComplete="new-password"
                placeholder="Minimal 8 karakter"
                hint="Gunakan kombinasi huruf, angka, dan simbol."
                disabled={saving || !stillDefault}
              />
              <TokoInput
                label={
                  <span>
                    Konfirmasi password <span className="text-rose-600">*</span>
                  </span>
                }
                type="password"
                value={konfirmasi}
                onChange={(e) => {
                  setKonfirmasi(e.target.value);
                  setError(null);
                  setHint(null);
                }}
                autoComplete="new-password"
                placeholder="Ulangi password baru"
                disabled={saving || !stillDefault}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving || !stillDefault}>
                {saving
                  ? "Menyimpan…"
                  : stillDefault
                    ? "Ganti password admin"
                    : "Password sudah aman"}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
