import type { ButtonHTMLAttributes, ReactNode } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

const variants = {
  primary: "gradient-primary text-white shadow-glow hover:shadow-glow active:scale-[0.98]",
  secondary: "glass glass-hover text-dark-100",
  danger: "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/20 hover:shadow-red-600/30 active:scale-[0.98]",
  ghost: "bg-transparent text-dark-300 hover:text-white hover:bg-white/5",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2.5 text-sm rounded-xl",
  lg: "px-6 py-3 text-base rounded-xl",
};

export function Button({ variant = "primary", size = "md", className = "", children, ...props }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
