import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

/** Kelas dasar kontrol form — dipakai internal & override terbatas. */
export const tokoControlClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500";

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
        className={`${offset ? "mt-1 " : ""}${tokoControlClass} ${className}`.trim()}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
    </TokoFieldShell>
  );
}

export type TokoSelectProps = SelectHTMLAttributes<HTMLSelectElement> & TokoFieldMetaProps;

export function TokoSelect({
  label,
  labelSize = "md",
  hint,
  error,
  wrapperClassName = "",
  className = "",
  id,
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
        className={`${label != null ? "mt-1 " : ""}${tokoControlClass} ${className}`.trim()}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      >
        {children}
      </select>
    </TokoFieldShell>
  );
}
