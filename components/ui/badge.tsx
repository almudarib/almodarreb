import React from "react";
import { cn } from "@/lib/utils";

type BadgeProps = React.ComponentPropsWithoutRef<"span"> & {
  variant?: "default" | "outline";
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const base =
    "inline-flex items-center rounded border px-2 py-0.5 text-xs";
  const variants = {
    default: "bg-foreground text-background border-transparent",
    outline: "bg-background text-foreground border-foreground/20",
  } as const;
  return <span className={cn(base, variants[variant], className)} {...props} />;
}

