import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, Zap } from "lucide-react";
import { useQuickAccess } from "./QuickAccessContext";
import { TONE_PILL_CLASS } from "@/config/quickActions";
import type { QuickAction } from "@/config/quickActions";
import { openPOSWindow } from "@/lib/posWindow";

/**
 * Floating Action Button untuk akses cepat. Ditempel di pojok kanan bawah
 * shell aplikasi utama. Klik tombol → daftar pill aksi muncul di atasnya
 * dengan animasi fade + slide. Klik di luar / tombol Esc menutup menu.
 *
 * - Tidak akan render bila user belum login, FAB dimatikan di pengaturan,
 *   atau tidak ada aksi yang lolos filter izin.
 * - Aksi `open-pos` membuka window POS via helper, bukan navigasi router.
 */
export function QuickAccessFab() {
  const navigate = useNavigate();
  const { settings, visibleActions } = useQuickAccess();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Tutup saat klik di luar atau tekan Esc.
  useEffect(() => {
    if (!open) return;
    function onPointer(ev: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(ev.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") {
        ev.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const runAction = useCallback(
    async (action: QuickAction) => {
      setOpen(false);
      if (action.kind === "open-pos") {
        try {
          await openPOSWindow();
        } catch (e) {
          console.error("openPOSWindow failed", e);
        }
        return;
      }
      if (action.kind === "navigate" && action.path) {
        navigate(action.path);
      }
    },
    [navigate],
  );

  if (!settings.enabled || visibleActions.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 print:hidden"
    >
      {/* Menu items — render selalu, animasikan visibility lewat opacity/translate
          supaya pointer-event mati ketika tertutup tanpa unmount-mount. */}
      <ul
        role="menu"
        aria-label="Menu akses cepat"
        className={`flex flex-col items-end gap-2 transition-all duration-200 ${
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0"
        }`}
      >
        {visibleActions.map((action, idx) => {
          const Icon = action.icon;
          // Stagger animasi: item terbawah (index terakhir) muncul duluan.
          const delay = open ? (visibleActions.length - 1 - idx) * 30 : 0;
          return (
            <li
              key={action.id}
              role="none"
              className="transition-all duration-200"
              style={{ transitionDelay: `${delay}ms` }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => void runAction(action)}
                className={`group inline-flex h-11 items-center gap-2.5 rounded-full px-4 text-sm font-semibold shadow-lg shadow-zinc-900/10 ring-1 ring-black/5 transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${TONE_PILL_CLASS[action.tone]}`}
              >
                <span>{action.label}</span>
                <span
                  aria-hidden
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/15 group-hover:bg-white/25"
                >
                  <Icon className="h-4 w-4" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        aria-label={open ? "Tutup menu akses cepat" : "Buka menu akses cepat"}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={`pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-xl shadow-brand-900/20 ring-1 ring-black/10 transition-all hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 ${
          open ? "rotate-45" : ""
        }`}
      >
        {/* Ikon Zap di state default, jadi Plus saat hover untuk mengisyaratkan
            "tambah cepat". Karena rotate-45 aktif saat open, Plus jadi X. */}
        {open ? (
          <Plus className="h-6 w-6" aria-hidden />
        ) : (
          <span className="relative inline-flex h-6 w-6 items-center justify-center">
            <Zap className="absolute h-6 w-6 transition-opacity group-hover:opacity-0" aria-hidden />
            <X className="sr-only" aria-hidden />
          </span>
        )}
      </button>
    </div>
  );
}
