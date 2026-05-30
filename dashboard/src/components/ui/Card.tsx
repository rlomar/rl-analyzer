import type { ReactNode, HTMLAttributes } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  glow?: boolean;
}

export function Card({ children, hover = true, glow = false, className = "", ...props }: Props) {
  return (
    <div
      className={`glass rounded-2xl p-5 transition-all duration-300 ${
        hover ? "hover:scale-[1.02] hover:bg-white/[0.05]" : ""
      } ${glow ? "shadow-glow" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
