"use client";

import { createClient } from "@/lib/supabase/client";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import * as React from "react";

export function LogoutButton({
  label = "تسجيل الخروج",
  sx,
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
      variant="contained"
      sx={
        sx
          ? [
              {
                '&.MuiButton-contained': {
                  bgcolor: 'var(--brand-gold-dark)',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'var(--brand-gold-dark)',
                  },
                },
              },
              ...(Array.isArray(sx) ? sx : [sx]),
            ]
          : {
              '&.MuiButton-contained': {
                bgcolor: 'var(--brand-gold-dark)',
                color: 'white',
                '&:hover': {
                  bgcolor: 'var(--brand-gold-dark)',
                },
              },
            }
      }
      {...props}
    >
      {label}
    </Button>
  );
}
