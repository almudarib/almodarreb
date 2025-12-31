import React from "react";
import { cn } from "@/lib/utils";

export function Label({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"label">) {
  return <label className={cn("text-sm", className)} {...props} />;
}

