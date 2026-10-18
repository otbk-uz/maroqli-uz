"use client";

import React from "react";

export type BadgeVariant =
  | "live"
  | "pro"
  | "primary"
  | "violet"
  | "cyan"
  | "success"
  | "warning"
  | "muted"
  | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "muted",
  size = "md",
  icon,
  children,
  className = "",
  ...props
}) => {
  const sizeStyles = {
    sm: "text-[9px] px-2 py-0.5 gap-1",
    md: "text-[10px] px-2.5 py-1 gap-1.5",
  };

  const variantStyles: Record<BadgeVariant, string> = {
    live: "bg-primary text-white border border-primary/40 shadow-[0_0_12px_rgba(255,51,85,0.4)] animate-pulse",
    pro: "bg-gradient-to-r from-amber-400 to-amber-600 text-black border border-amber-300/40 shadow-[0_0_14px_rgba(245,158,11,0.35)] font-black",
    primary: "bg-primary/15 text-primary border border-primary/30",
    violet: "bg-violet/15 text-violet border border-violet/30 shadow-glow-violet",
    cyan: "bg-cyan/15 text-cyan border border-cyan/30",
    success: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    muted: "bg-white/5 text-secondary border border-white/10",
    outline: "bg-transparent text-white/80 border border-white/15",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-display font-black uppercase tracking-wider ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
