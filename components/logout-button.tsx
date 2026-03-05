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
  const [loading, setLoading] = React.useState(false);

  const logout = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      try {
        if (typeof window !== "undefined") {
          try {
            window.localStorage?.clear?.();
          } catch {}
          try {
            window.sessionStorage?.clear?.();
          } catch {}
          try {
            const names = ["app_role"];
            names.forEach((n) => {
              document.cookie = `${n}=; Max-Age=0; path=/`;
            });
          } catch {}
        }
      } catch {}
      router.replace("/auth/login");
    }
  };

  return (
    <Button
      loading={loading}
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
