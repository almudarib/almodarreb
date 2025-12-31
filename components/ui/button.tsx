import React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ComponentPropsWithoutRef<"button"> & {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md";
  asChild?: boolean;
};

export function Button({
  className,
  variant = "default",
  size = "md",
  asChild,
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded transition-colors disabled:opacity-50 disabled:pointer-events-none";
  const sizes = {
    sm: "h-8 px-3 text-sm",
    md: "h-9 px-4 text-sm",
  } as const;
  const variants = {
    default: "bg-foreground text-background",
    outline: "border bg-background text-foreground",
    ghost: "bg-transparent text-foreground",
  } as const;

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ className?: string }>;
    return React.cloneElement(child, {
      className: cn(
        base,
        sizes[size],
        variants[variant],
        className,
        child.props?.className,
      ),
    });
  }

  return (
    <button
      className={cn(base, sizes[size], variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}
