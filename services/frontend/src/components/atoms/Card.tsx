"use client";

import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "@/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outlined" | "glass" | "glow";
  glowColor?: "blue" | "cyan" | "emerald" | "rose" | "amber";
  interactive?: boolean;
}

const glowMap: Record<string, string> = {
  blue: "glow-border-blue hover:shadow-glow",
  cyan: "glow-border-cyan hover:shadow-glow-cyan",
  emerald: "glow-border-emerald hover:shadow-glow-emerald",
  rose: "glow-border-rose hover:shadow-glow-rose",
  amber: "glow-border-amber hover:shadow-glow-amber",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", glowColor = "blue", interactive = false, children, ...props }, ref) => {
    const variants: Record<string, string> = {
      default: "bg-gradient-to-b from-gray-800/50 to-gray-900/50 border-white/[0.06] shadow-inner-highlight",
      elevated: "bg-gradient-to-b from-gray-800/60 to-gray-900/60 border-white/[0.08] shadow-xl shadow-inner-highlight",
      outlined: "bg-transparent border-gray-700/50",
      glass: "glass-card",
      glow: `bg-gradient-to-b from-gray-800/50 to-gray-900/50 border-white/[0.06] ${glowMap[glowColor] || ""}`,
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl border backdrop-blur-sm transition-all duration-300",
          variants[variant],
          interactive && "cursor-pointer hover:border-white/[0.12] hover:-translate-y-0.5",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-6 py-4 border-b border-white/[0.06]", className)}
    {...props}
  />
));

CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-semibold text-white tracking-tight", className)}
    {...props}
  />
));

CardTitle.displayName = "CardTitle";

export const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("px-6 py-4", className)} {...props} />
));

CardContent.displayName = "CardContent";
