import { toast } from "sonner";

/**
 * Wrapper tipis di atas library toast (sonner) supaya halaman tidak
 * bergantung langsung ke implementasi. Kalau suatu saat ingin pindah
 * ke library lain (mis. react-hot-toast) atau ke notif sistem Tauri,
 * cukup ubah file ini.
 *
 * API tetap minimal: success / error / info / warning / promise.
 */

export type NotifyAction = {
  label: string;
  onClick: () => void;
};

export type NotifyOptions = {
  description?: string;
  /** Durasi tampil (ms). Default mengikuti default library. */
  duration?: number;
  /** Tombol aksi opsional, mis. "Buka folder". */
  action?: NotifyAction;
};

export const notify = {
  success(message: string, opts?: NotifyOptions) {
    toast.success(message, mapOpts(opts));
  },
  error(message: string, opts?: NotifyOptions) {
    toast.error(message, mapOpts(opts));
  },
  info(message: string, opts?: NotifyOptions) {
    toast.info(message, mapOpts(opts));
  },
  warning(message: string, opts?: NotifyOptions) {
    toast.warning(message, mapOpts(opts));
  },
  /** Toast yang berubah otomatis dari loading → success / error. */
  promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((value: T) => string);
      error: string | ((err: unknown) => string);
    },
  ) {
    toast.promise(promise, messages);
  },
};

function mapOpts(opts?: NotifyOptions) {
  if (!opts) return undefined;
  return {
    description: opts.description,
    duration: opts.duration,
    action: opts.action
      ? {
          label: opts.action.label,
          onClick: opts.action.onClick,
        }
      : undefined,
  };
}
