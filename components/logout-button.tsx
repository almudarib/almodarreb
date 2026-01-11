"use client";

import { createClient } from "@/lib/supabase/client";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import * as React from "react";
import { LogoutRounded } from "@mui/icons-material";

export function LogoutButton({
  label = "تسجيل الخروج",
  isCollapsed,
  sx,
  ...props
}: Omit<ButtonProps, "onClick"> & { label?: React.ReactNode; isCollapsed?: boolean }) {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <Button
      onClick={logout}
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
                '&.MuiButton-text': {
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
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
              '&.MuiButton-text': {
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
              },
            }
      }
      {...props}
    >
      {isCollapsed ? <LogoutRounded fontSize="small" /> : label}
    </Button>
  );
}
