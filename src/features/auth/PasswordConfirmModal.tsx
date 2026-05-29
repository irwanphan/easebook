import { useEffect, useState, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AlertTriangle, Eye, EyeOff, Lock } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthContext";
import { tauriErrorMessage } from "@/lib/tauriError";

type PasswordConfirmModalProps = {
  open: boolean;
  /** Judul modal — jelaskan aksi spesifik. */
  title: string;
  /** Penjelasan singkat kenapa password diminta. */
  description: string;
  /** Label tombol konfirmasi. Default: "Lanjutkan". */
  confirmLabel?: string;
  /** Style tombol konfirmasi. Default: "primary". */
  confirmVariant?: "primary" | "danger";
  onClose: () => void;
  /** Dipanggil setelah verifikasi password sukses. */
  onConfirmed: () => void;
};

/**
 * Modal konfirmasi password untuk aksi sensitif.
 *
 * Memverifikasi password pengguna yang sedang login via
 * `pengguna_verifikasi_kata_sandi`. Bisa dipakai ulang untuk berbagai aksi
 * (mis. ubah pengaturan kritis, hapus data sensitif, dll.) — pemanggil
 * cukup memberi `title`, `description`, dan callback `onConfirmed`.
 *
 * Tidak menyimpan kata sandi di memory lebih lama dari yang diperlukan;
 * field dibersihkan setiap kali modal ditutup atau berhasil diverifikasi.
 */
export function PasswordConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Lanjutkan",
  confirmVariant = "primary",
  onClose,
  onConfirmed,
}: PasswordConfirmModalProps) {
  const { session } = useAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPassword("");
      setError(null);
      setShowPassword(false);
      setSubmitting(false);
    }
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session?.username) {
      setError("Sesi pengguna tidak valid.");
      return;
    }
    if (!password) {
      setError("Kata sandi wajib diisi.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await invoke("pengguna_verifikasi_kata_sandi", {
        username: session.username,
        password,
      });
      setPassword("");
      onConfirmed();
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      panelClassName="max-w-md"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button
            type="submit"
            form="form-password-confirm"
            variant={confirmVariant}
            disabled={submitting || !password}
          >
            {submitting ? "Memverifikasi…" : confirmLabel}
          </Button>
        </div>
      }
    >
      <form id="form-password-confirm" onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{description}</span>
        </div>

        <div>
          <label htmlFor="pwd-confirm" className="block text-sm font-medium text-zinc-700">
            Masukkan kata sandi Anda untuk konfirmasi
          </label>
          <p className="mt-0.5 text-xs text-zinc-500">
            Login sebagai <strong className="text-zinc-700">{session?.namaLengkap || session?.username || "—"}</strong>
          </p>
          <div className="relative mt-1">
            <Lock
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400"
              aria-hidden
            />
            <input
              id="pwd-confirm"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 pl-9 pr-10 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              disabled={submitting}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 cursor-pointer"
              aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
          >
            {error}
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
