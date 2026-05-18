import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

/** Kelas dasar kontrol form (tanpa lebar — lebar diatur per instance). */
export const tokoControlClass =
  "rounded-xl border border-zinc-200 bg-white px-3 h-10 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500";

const WIDTH_CLASS_RE = /\b(w-|max-w-|min-w-)/;

function mergeControlClassName(className: string, fullWidth: boolean, withOffset: boolean): string {
  const useFullWidth = fullWidth && !WIDTH_CLASS_RE.test(className);
  return [withOffset ? "mt-1" : "", tokoControlClass, useFullWidth ? "w-full" : "", className]
    .filter(Boolean)
    .join(" ");
}

const labelMdClass = "block text-sm font-medium text-zinc-700";
const labelSmClass = "block text-xs font-medium text-zinc-600";
const hintClass = "mt-1 text-xs text-zinc-500";
const errorClass = "mt-1 text-xs text-red-600";

type LabelSize = "sm" | "md";

type TokoFieldMetaProps = {
  label?: ReactNode;
  labelSize?: LabelSize;
  hint?: ReactNode;
  error?: ReactNode;
  /** Kelas pada wrapper luar (mis. grid cell). */
  wrapperClassName?: string;
};

function labelClass(size: LabelSize) {
  return size === "sm" ? labelSmClass : labelMdClass;
}

type TokoFieldShellProps = TokoFieldMetaProps & {
  controlId: string;
  describedBy?: string;
  children: ReactNode;
};

function TokoFieldShell({
  label,
  labelSize = "md",
  hint,
  error,
  wrapperClassName = "",
  controlId,
  describedBy,
  children,
}: TokoFieldShellProps) {
  return (
    <div className={wrapperClassName}>
      {label != null ? (
        <label htmlFor={controlId} className={labelClass(labelSize)}>
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p id={describedBy} className={errorClass} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={describedBy} className={hintClass}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export type TokoInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> &
  TokoFieldMetaProps & {
    /** Default `true`. Set `false` jika lebar diatur lewat `className` (mis. `w-10`). */
    fullWidth?: boolean;
    /** Tanpa label, jangan tambah margin atas pada input. */
    withLabelOffset?: boolean;
  };

export function TokoInput({
  label,
  labelSize = "md",
  hint,
  error,
  wrapperClassName = "",
  className = "",
  id,
  fullWidth = true,
  withLabelOffset,
  ...rest
}: TokoInputProps) {
  const autoId = useId();
  const hintId = useId();
  const errorId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? errorId : hint ? hintId : undefined;
  const offset = withLabelOffset ?? label != null;

  return (
    <TokoFieldShell
      label={label}
      labelSize={labelSize}
      hint={hint}
      error={error}
      wrapperClassName={wrapperClassName}
      controlId={inputId}
      describedBy={describedBy}
    >
      <input
        id={inputId}
        className={mergeControlClassName(className, fullWidth, offset)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
    </TokoFieldShell>
  );
}

export type TokoSelectProps = SelectHTMLAttributes<HTMLSelectElement> &
  TokoFieldMetaProps & {
    fullWidth?: boolean;
  };

export function TokoSelect({
  label,
  labelSize = "md",
  hint,
  error,
  wrapperClassName = "",
  className = "",
  id,
  fullWidth = true,
  children,
  ...rest
}: TokoSelectProps) {
  const autoId = useId();
  const hintId = useId();
  const errorId = useId();
  const selectId = id ?? autoId;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <TokoFieldShell
      label={label}
      labelSize={labelSize}
      hint={hint}
      error={error}
      wrapperClassName={wrapperClassName}
      controlId={selectId}
      describedBy={describedBy}
    >
      <select
        id={selectId}
        className={mergeControlClassName(className, fullWidth, label != null)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      >
        {children}
      </select>
    </TokoFieldShell>
  );
}
