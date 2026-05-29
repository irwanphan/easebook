import type { HTMLAttributes } from "react";

type SeparatorOrientation = "horizontal" | "vertical";

type SeparatorProps = Omit<HTMLAttributes<HTMLSpanElement>, "role" | "aria-orientation"> & {
  orientation?: SeparatorOrientation;
  /**
   * Untuk separator yang murni visual (default). Bila `false`, akan diberi
   * `role="separator"` agar diumumkan oleh assistive technologies sebagai
   * pembatas konten yang bermakna.
   */
  decorative?: boolean;
};

const orientationClass: Record<SeparatorOrientation, string> = {
  horizontal: "block h-px w-full",
  vertical: "inline-block h-8 w-px self-stretch my-auto mx-1",
};

export function Separator({
  orientation = "horizontal",
  decorative = true,
  className = "",
  ...rest
}: SeparatorProps) {
  const a11yProps = decorative
    ? ({ "aria-hidden": true } as const)
    : ({ role: "separator", "aria-orientation": orientation } as const);
  return (
    <span
      {...a11yProps}
      className={`shrink-0 bg-zinc-300 ${orientationClass[orientation]} ${className}`}
      {...rest}
    />
  );
}

export function VerticalSeparator(props: Omit<SeparatorProps, "orientation">) {
  return <Separator orientation="vertical" {...props} />;
}
