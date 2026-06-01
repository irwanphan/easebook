import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { LogIn, Sparkles } from "lucide-react";
import easebookIcon from "@/assets/icons/easebook-icon.svg";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthContext";
import { tauriErrorMessage } from "@/lib/tauriError";
import { onboardingStatusGet } from "@/features/onboarding/onboardingApi";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading, login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /**
   * Onboarding belum selesai → tampilkan banner ramah yang menjelaskan
   * akun bawaan, dan prefill username `admin` supaya satu klik selanjutnya
   * langsung masuk ke wizard. Null saat masih loading status.
   */
  const [pertamaKaliPakai, setPertamaKaliPakai] = useState<boolean | null>(null);

  const from =
    (location.state as { from?: string } | null)?.from && (location.state as { from?: string }).from !== "/login"
      ? (location.state as { from: string }).from
      : "/";

  useEffect(() => {
    const stored = window.localStorage.getItem("easybook_session");
    let usernameFromStorage: string | null = null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { username?: string };
        if (parsed.username) usernameFromStorage = parsed.username;
      } catch {
        /* abaikan */
      }
    }
    if (usernameFromStorage) setUsername(usernameFromStorage);

    let cancelled = false;
    void (async () => {
      try {
        const status = await onboardingStatusGet();
        if (cancelled) return;
        const belum = !status.completed;
        setPertamaKaliPakai(belum);
        // Hanya prefill ke "admin" kalau memang first-run dan user belum
        // pernah login sebelumnya (tidak ada session di localStorage).
        if (belum && !usernameFromStorage) setUsername("admin");
      } catch {
        if (!cancelled) setPertamaKaliPakai(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loading && session) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError("Username wajib diisi.");
      return;
    }
    if (!password) {
      setError("Password wajib diisi.");
      return;
    }

    setSubmitting(true);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-brand-950">
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <img
              src={easebookIcon}
              alt="EasyBook"
              width={56}
              height={56}
              className="mx-auto h-14 w-14 rounded-2xl object-cover shadow-lg shadow-brand-600/30"
            />
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">EasyBook</h1>
            <p className="mt-1 text-sm text-zinc-400">Masuk untuk melanjutkan ke aplikasi</p>
          </div>

          {pertamaKaliPakai ? (
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-brand-500/30 bg-brand-900/40 p-4 text-sm text-brand-100">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden />
              <div className="space-y-1">
                <p className="font-semibold text-white">Pertama kali memakai EasyBook?</p>
                <p className="text-xs leading-relaxed text-brand-100/90">
                  Masuk dengan akun bawaan{" "}
                  <code className="rounded bg-brand-950/60 px-1 py-0.5 text-brand-200">admin</code>{" "}
                  dan password{" "}
                  <code className="rounded bg-brand-950/60 px-1 py-0.5 text-brand-200">admin123</code>{" "}
                  untuk memulai pengaturan awal. Password akan diganti di langkah terakhir wizard.
                </p>
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/90 p-6 shadow-xl shadow-black/40 backdrop-blur-sm">
            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
              <div>
                <label htmlFor="login-username" className="block text-sm font-medium text-zinc-200">
                  Username
                </label>
                <input
                  id="login-username"
                  className={inputClass}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  placeholder="contoh: admin"
                  disabled={submitting || loading}
                />
              </div>

              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-zinc-200">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  disabled={submitting || loading}
                />
              </div>

              {error ? (
                <p className="rounded-xl border border-red-500/30 bg-red-950/50 px-4 py-3 text-sm text-red-200">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                className="mt-1 w-full py-3"
                disabled={submitting || loading}
              >
                <LogIn className="h-4 w-4" aria-hidden />
                {submitting ? "Memproses…" : "Masuk"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
