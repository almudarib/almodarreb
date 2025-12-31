import React, { createContext, useContext } from "react";

type DropdownMenuContextType = {
  onValueChange?: (value: string) => void;
};

const DropdownCtx = createContext<DropdownMenuContextType>({});

export function DropdownMenu({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}

export function DropdownMenuTrigger({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

export function DropdownMenuContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={className}>{children}</div>;
}

export function DropdownMenuRadioGroup({
  onValueChange,
  children,
}: {
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <DropdownCtx.Provider value={{ onValueChange }}>
      <div>{children}</div>
    </DropdownCtx.Provider>
  );
}

export function DropdownMenuRadioItem({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { onValueChange } = useContext(DropdownCtx);
  return (
    <button
      type="button"
      className={className}
      onClick={() => onValueChange?.(value)}
    >
      {children}
    </button>
  );
}
