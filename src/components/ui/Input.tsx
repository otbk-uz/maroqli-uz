"use client";

import React, { forwardRef, useState } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightAction?: React.ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightAction,
      type = "text",
      className = "",
      containerClassName = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className={`space-y-1.5 w-full ${containerClassName}`}>
        {label && (
          <label className="block text-xs font-bold text-secondary uppercase tracking-wider ml-1">
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-secondary pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            type={inputType}
            disabled={disabled}
            className={`w-full bg-white/5 border ${
              error ? "border-primary/60 focus:border-primary shadow-[0_0_15px_rgba(255,51,85,0.2)]" : "border-white/10 hover:border-white/20 focus:border-primary/50 focus:shadow-[0_0_15px_rgba(255,51,85,0.15)]"
            } rounded-2xl ${leftIcon ? "pl-11" : "pl-4"} ${
              isPassword || rightAction ? "pr-11" : "pr-4"
            } py-3.5 text-sm text-white placeholder:text-secondary/50 outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 p-1 text-secondary hover:text-white transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Parolni berkitish" : "Parolni ko'rsatish"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}

          {!isPassword && rightAction && (
            <div className="absolute right-3.5 flex items-center">{rightAction}</div>
          )}
        </div>

        {error && (
          <p className="flex items-center gap-1.5 text-[11px] text-primary font-medium ml-1 animate-shake">
            <AlertCircle size={12} className="shrink-0" />
            <span>{error}</span>
          </p>
        )}

        {!error && helperText && (
          <p className="text-[11px] text-secondary/70 ml-1 leading-normal">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
