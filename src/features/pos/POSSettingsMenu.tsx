import { useEffect, useRef, useState } from "react";
import { ChevronDown, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Item satu baris di menu pengaturan. Deklaratif — caller cukup menambah
 * entry baru ke `sections[].items`; komponen menu sendiri tidak perlu
 * diubah (Open/Closed Principle).
 */
export type POSSettingsItem = {
  id: string;
  icon: LucideIcon;
  label: string;
  /** Penjelasan singkat di bawah label (mis. nilai aktif saat ini). */
  description?: string;
  /** Aksi yang dijalankan saat klik. Tidak dipanggil bila `disabled` true. */
  onClick?: () => void;
  /** Bila true, item ditampilkan abu-abu dan tidak bisa diklik. */
  disabled?: boolean;
  /** Penyebab disable — ditampilkan sebagai tooltip dan teks kecil. */
  disabledReason?: string;
  /** Tandai sebagai placeholder fitur yang akan datang. */
  comingSoon?: boolean;
};

export type POSSettingsSection = {
  id: string;
  title?: string;
  items: POSSettingsItem[];
};

type Props = {
  sections: POSSettingsSection[];
  /** Posisi panel relatif tombol. Default: kanan (anchor di pojok kanan). */
  align?: "left" | "right";
};

/**
 * Tombol gear + dropdown menu pengaturan untuk POS.
 *
 * - Klik di luar / Esc menutup menu.
 * - Tidak menyatu dengan logika fitur tertentu — semua tindakan didorong
 *   lewat prop `sections`. Untuk menambah pengaturan baru, tambahkan item
 *   pada array tanpa mengubah komponen ini.
 */
export function POSSettingsMenu({ sections, align = "right" }: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(ev: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(ev.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") {
        ev.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const hasAnyItem = sections.some((s) => s.items.length > 0);
  if (!hasAnyItem) return null;

  return (
    <div ref={wrapperRef} className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Pengaturan POS"
        title="Pengaturan POS"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 transition cursor-pointer hover:bg-zinc-50 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
          open ? "ring-2 ring-brand-300/40" : ""
        }`}
      >
        <Settings className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Pengaturan</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Pengaturan POS"
          className={`absolute top-full z-30 mt-2 w-72 origin-top rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl shadow-zinc-900/10 ring-1 ring-black/5 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {sections.map((section, sIdx) => (
            <div key={section.id} role="none">
              {sIdx > 0 ? (
                <div role="separator" className="my-1.5 h-px bg-zinc-100" />
              ) : null}
              {section.title ? (
                <p
                  role="none"
                  className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400"
                >
                  {section.title}
                </p>
              ) : null}

              {section.items.map((item) => {
                const Icon = item.icon;
                const isDisabled = item.disabled || item.comingSoon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    disabled={isDisabled}
                    title={item.disabledReason || undefined}
                    onClick={() => {
                      if (isDisabled) return;
                      setOpen(false);
                      item.onClick?.();
                    }}
                    className={`group flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition ${
                      isDisabled
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        isDisabled
                          ? "bg-zinc-100 text-zinc-400"
                          : "bg-brand-50 text-brand-600 group-hover:bg-brand-100"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-zinc-900">
                          {item.label}
                        </span>
                        {item.comingSoon ? (
                          <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                            Segera
                          </span>
                        ) : null}
                      </span>
                      {item.description ? (
                        <span className="mt-0.5 block truncate text-xs text-zinc-500">
                          {item.description}
                        </span>
                      ) : null}
                      {item.disabledReason && !item.comingSoon ? (
                        <span className="mt-0.5 block text-xs text-amber-700">
                          {item.disabledReason}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
