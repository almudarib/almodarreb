import React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<"input">
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn("border rounded h-9 px-3 bg-background", className)}
      {...props}
    />
  );
});

