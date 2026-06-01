/**
 * Opsi pilihan ber-tampilan "card + check" — selected state ditandai
 * ikon Check di pojok, bukan titik bulat radio tradisional. Visual ini
 * membantu user awam yang lebih familiar dengan ikon centang.
 *
 * Dapat beroperasi sebagai **radio** (single-select, default) maupun
 * **checkbox** (multi-select) lewat prop `selectionMode`. Visual sama
 * persis di kedua mode — hanya semantic input (HTML `type` + role yang
 * di-derive otomatis oleh browser) yang berbeda. Itu disengaja: kami
 * ingin pengguna tidak bingung membedakan radio vs checkbox secara
 * visual; semua "pilih satu" dan "pilih banyak" terasa konsisten.
 *
 * Single-Responsibility: komponen ini **hanya** merepresentasikan satu
 * opsi. Grouping/orchestration (state pilihan aktif, perubahan, dll)
 * ditangani parent. Untuk pemakaian a11y yang benar:
 *  - Mode `radio`: bungkus sekelompok dengan `<fieldset>` + `<legend>`,
 *    semua item beri `name` yang sama (browser otomatis menerapkan
 *    keyboard nav antar-radio dalam group).
 *  - Mode `checkbox`: tetap bungkus dengan `<fieldset>` + `<legend>`
 *    untuk grup; `name` boleh sama (sebagai array submission) atau
 *    berbeda (toggle independen).
 *
 * Open/Closed: `description` & `badge` opsional; bila perlu konten kaya
 * (mis. preview tabel) gunakan `children` — slot rendering bebas di
 * bawah area title/description.
 */
import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { Check } from "lucide-react";

export type TokoOptionProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size" | "title" | "children"
> & {
  /** Judul opsi (line pertama, font semibold). */
  title: ReactNode;
  /** Deskripsi singkat di bawah judul. Opsional. */
  description?: ReactNode;
  /**
   * Badge kecil di sebelah judul, mis. "Rekomendasi" atau "Beta".
   * Akan diberi style brand jika `badgeVariant="brand"` (default `neutral`).
   */
  badge?: ReactNode;
  badgeVariant?: "brand" | "warning" | "neutral";
  /** Konten tambahan (kaya) di bawah deskripsi — preview, hint, dll. */
  children?: ReactNode;
  /** Kelas tambahan untuk wrapper luar. */
  wrapperClassName?: string;
  /**
   * Mode pemilihan: `radio` (single-select dalam grup) atau `checkbox`
   * (toggle multi-select). Default `radio` agar pemakaian existing
   * tetap kompatibel.
   */
  selectionMode?: "radio" | "checkbox";
};

const BADGE_CLASS: Record<NonNullable<TokoOptionProps["badgeVariant"]>, string> = {
  brand:
    "bg-brand-100 text-brand-800 ring-brand-200",
  warning:
    "bg-amber-100 text-amber-800 ring-amber-200",
  neutral:
    "bg-zinc-100 text-zinc-700 ring-zinc-200",
};

export function TokoOption({
  title,
  description,
  badge,
  badgeVariant = "neutral",
  children,
  wrapperClassName = "",
  className = "",
  id,
  checked,
  disabled,
  selectionMode = "radio",
  ...rest
}: TokoOptionProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  // Wrapper-as-label: seluruh card adalah label, sehingga klik di mana
  // pun di card memilih opsi (a11y bonus: focus ring tetap pada input).
  const baseClass = [
    "group relative flex w-full cursor-pointer items-start gap-3 rounded-2xl border bg-white px-4 py-3.5 text-left transition",
    "hover:border-brand-300 hover:bg-brand-50/30",
    "focus-within:ring-2 focus-within:ring-brand-500/30 focus-within:ring-offset-1",
    checked
      ? "border-brand-500 bg-brand-50/60 shadow-sm shadow-brand-500/10"
      : "border-zinc-200",
    disabled
      ? checked
        // Locked-active: tetap full opacity supaya terbaca sebagai
        // "aktif permanen", hanya cursor yang menandakan tidak bisa
        // diubah. Border brand dari state `checked` tetap dominan.
        ? "cursor-not-allowed hover:border-brand-500 hover:bg-brand-50/60"
        : "cursor-not-allowed opacity-60 hover:border-zinc-200 hover:bg-white"
      : "",
    wrapperClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <label htmlFor={inputId} className={baseClass}>
      <input
        id={inputId}
        type={selectionMode}
        className="sr-only"
        checked={checked}
        disabled={disabled}
        {...rest}
      />

      <span
        aria-hidden
        className={[
          "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
          checked
            ? "border-brand-600 bg-brand-600 text-white shadow-sm shadow-brand-500/30"
            : "border-zinc-300 bg-white text-transparent group-hover:border-brand-300",
        ].join(" ")}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>

      <span className={["flex flex-1 flex-col gap-1", className].filter(Boolean).join(" ")}>
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-zinc-900">{title}</span>
          {badge ? (
            <span
              className={[
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
                BADGE_CLASS[badgeVariant],
              ].join(" ")}
            >
              {badge}
            </span>
          ) : null}
        </span>
        {description ? (
          <span className="text-xs leading-relaxed text-zinc-600">{description}</span>
        ) : null}
        {children ? <span className="mt-1 block">{children}</span> : null}
      </span>
    </label>
  );
}
