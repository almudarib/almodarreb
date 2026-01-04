"use client";

import { createClient } from "@/lib/supabase/client";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import * as React from "react";

export function LogoutButton({
  label = "Logout",
  ...props
}: Omit<ButtonProps, "onClick"> & { label?: React.ReactNode }) {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <Button
      onClick={logout}
      variant="outlined"
      color="error"
      sx={{
        '&.MuiButton-outlined': {
          borderColor: '#D32F2F',
          color: '#D32F2F',
          '&:hover': {
            borderColor: '#B71C1C',
            backgroundColor: 'rgba(211,47,47,0.08)',
          },
        },
      }}
      {...props}
    >
      {label}
    </Button>
  );
}
