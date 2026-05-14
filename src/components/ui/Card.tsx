import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
