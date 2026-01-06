"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Stack,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  ListItemIcon,
  Avatar,
  Tooltip,
} from "@mui/material";
import {
  DashboardRounded,
  PersonRounded,
  QuizRounded,
  VideoLibraryRounded,
  AssignmentTurnedInRounded,
  BarChartRounded,
  SettingsRounded,
} from "@mui/icons-material";
import { LogoutButton } from "@/components/logout-button";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

const PALETTE = {
  deepTeal: "#088395",
  gold: "#E19800",
  darkOlive: "#1A1D0F",
  sidebarBg: "#12140B",
  activeLight: "rgba(8, 131, 149, 0.15)",
};

function SidebarNav({ sid }: { sid?: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sidParam = sid !== undefined ? String(sid) : (searchParams.get("student_id") ?? undefined);
  const withSid = (href: string) => (sidParam ? `${href}?student_id=${sidParam}` : href);

  const links = [
    { href: "/student", label: "لوحة الطالب", icon: <DashboardRounded /> },
    { href: "/student#profile", label: "الملف الشخصي", icon: <PersonRounded /> },
    { href: "/student#progress", label: "التقدم", icon: <BarChartRounded /> },
    { href: "/student/videos", label: "الجلسات التعليمية", icon: <VideoLibraryRounded /> },
    { href: "/student/exams", label: "الامتحانات", icon: <QuizRounded /> },
    { href: "/student#results", label: "النتائج", icon: <AssignmentTurnedInRounded /> },
  ];

  return (
    <Box sx={{ flexGrow: 1, px: 2, overflowY: "auto" }}>
      <Typography variant="overline" sx={{ px: 2, color: "rgba(255,255,255,0.3)", fontWeight: 700 }}>
        صفحات الطالب
      </Typography>
      <List sx={{ mt: 1 }}>
        {links.map((link) => {
          const base = link.href.split("#")[0];
          const active = pathname === base || pathname.startsWith(base + "/");
          return (
            <ListItemButton
              key={link.href}
              component={Link}
              href={withSid(link.href)}
              selected={active}
              sx={{
                borderRadius: "12px",
                mb: 0.8,
                py: 1.2,
                transition: "all 0.2s ease-in-out",
                "&.Mui-selected": {
                  bgcolor: PALETTE.deepTeal,
                  color: "white",
                  "&:hover": { bgcolor: PALETTE.deepTeal },
                  "& .MuiListItemIcon-root": { color: "white" },
                },
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.08)",
                  transform: "scale(1.02)",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: active ? "white" : "rgba(255,255,255,0.6)",
                  transition: "0.2s",
                }}
              >
                {link.icon}
              </ListItemIcon>
              <ListItemText
                primary={link.label}
                primaryTypographyProps={{
                  fontSize: "0.9rem",
                  fontWeight: active ? 600 : 400,
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}

function HeaderBar() {
  const pathname = usePathname();
  const headerLabel =
    pathname.startsWith("/student/videos")
      ? "الجلسات التعليمية"
      : pathname.startsWith("/student/exams")
      ? "الامتحانات"
      : "لوحة الطالب";
  return (
    <Box
      sx={{
        height: 70,
        bgcolor: "white",
        display: "flex",
        alignItems: "center",
        px: 4,
        boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        borderBottom: "1px solid #E0E0E0",
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 700, color: PALETTE.darkOlive }}>
        {headerLabel}
      </Typography>
    </Box>
  );
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sid, setSid] = React.useState<number | undefined>(undefined);
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    const run = async () => {
      const supabase = createSupabaseClient();
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? null;
      if (!uid) {
        router.replace("/student/login");
        return;
      }
      const { data: stu } = await supabase
        .from("students")
        .select("id")
        .eq("auth_user_id", uid)
        .maybeSingle();
      const myId = (stu?.id as number | undefined) ?? undefined;
      if (!myId) {
        router.replace("/auth/login");
        return;
      }
      if (!alive) return;
      setSid(myId);
      setChecked(true);
      const currentSid = searchParams.get("student_id");
      if (!currentSid || Number(currentSid) !== myId) {
        const sp = new URLSearchParams(searchParams.toString());
        sp.set("student_id", String(myId));
        router.replace(`${pathname}?${sp.toString()}`);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [router, pathname, searchParams]);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", direction: "rtl", bgcolor: "#F0F2F5" }}>
      <Box
        component="aside"
        sx={{
          width: 280,
          bgcolor: PALETTE.sidebarBg,
          color: "white",
          position: "sticky",
          top: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "10px 0 30px rgba(0,0,0,0.2)",
          zIndex: 1100,
        }}
      >
        <Box sx={{ p: 3, mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
            <Avatar sx={{ bgcolor: PALETTE.deepTeal, width: 45, height: 45, fontWeight: "bold" }}>S</Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2, color: "white" }}>
                لوحة <span style={{ color: PALETTE.gold }}>الطالب</span>
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                مساحة الطالب الخاصة
              </Typography>
            </Box>
          </Stack>
        </Box>

        <React.Suspense fallback={<Box sx={{ flexGrow: 1, px: 2 }} />}>
          <SidebarNav sid={sid} />
        </React.Suspense>

        <Box sx={{ p: 2, mt: "auto" }}>
          <Box
            sx={{
              p: 2,
              borderRadius: "16px",
              bgcolor: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
              mb: 2,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>v1.0.0</Typography>
              <Tooltip title="الإعدادات">
                <SettingsRounded sx={{ fontSize: 18, color: "rgba(255,255,255,0.5)", cursor: "pointer" }} />
              </Tooltip>
            </Stack>
            <Divider sx={{ my: 1.5, bgcolor: "rgba(255,255,255,0.05)" }} />
            <LogoutButton variant="contained" fullWidth />
          </Box>
        </Box>
      </Box>

      <Box
        component="main"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          position: "relative",
        }}
      >
        <React.Suspense fallback={<Box sx={{ height: 70 }} />}>
          <HeaderBar />
        </React.Suspense>

        <Box sx={{ p: 4, flex: 1, overflowY: "auto" }}>{children}</Box>
      </Box>

      {/* Sidebar navigation wrapped in Suspense */}
      <Box
        sx={{
          position: "fixed",
          left: 0,
          top: 0,
          height: 0,
          width: 0,
          visibility: "hidden",
        }}
      />
    </Box>
  );
}
