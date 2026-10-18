"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  actionHref,
  onAction,
  className = "",
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`glass-card py-16 px-6 text-center flex flex-col items-center justify-center max-w-lg mx-auto border-white/10 ${className}`}
    >
      <div className="relative mb-5">
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
        <div className="relative w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary shadow-glow">
          {icon}
        </div>
      </div>

      <h3 className="font-display text-lg md:text-xl font-black text-white uppercase tracking-tight mb-2">
        {title}
      </h3>
      <p className="text-secondary text-xs leading-relaxed max-w-sm mb-6">
        {description}
      </p>

      {actionText && actionHref && (
        <Link href={actionHref} className="btn-primary !py-3 !px-7 text-xs font-bold tracking-wider uppercase">
          {actionText}
        </Link>
      )}

      {actionText && !actionHref && onAction && (
        <button onClick={onAction} className="btn-primary !py-3 !px-7 text-xs font-bold tracking-wider uppercase">
          {actionText}
        </button>
      )}
    </motion.div>
  );
};
