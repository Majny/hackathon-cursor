import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg" | "xl";

const variants: Record<Variant, string> = {
  primary: "bg-brick text-white hover:bg-brick-dark shadow-sm",
  secondary: "bg-card text-ink border border-line hover:bg-paper-dark",
  ghost: "bg-transparent text-brick hover:bg-paper-dark",
  danger: "bg-red-700 text-white hover:bg-red-800",
};
const sizes: Record<Size, string> = {
  md: "px-4 py-2 text-base rounded-lg",
  lg: "px-6 py-3 text-xl rounded-xl",
  xl: "px-10 py-6 text-3xl rounded-2xl",
};

export function Button({
  variant = "primary", size = "md", className = "", ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
