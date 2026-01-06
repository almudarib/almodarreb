'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Stack, Typography, List, ListItemButton, ListItemText, Divider, ListItemIcon, Avatar, Tooltip } from '@mui/material';
import { DashboardRounded, SchoolRounded, SettingsRounded, PaidRounded } from '@mui/icons-material';
import { LogoutButton } from '@/components/logout-button';

const PALETTE = {
  deepTeal: '#088395',
  gold: '#E19800',
  darkOlive: '#1A1D0F',
  sidebarBg: '#12140B',
  activeLight: 'rgba(8, 131, 149, 0.15)',
};

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const links = [
    { href: '/teacher', label: 'لوحة الأستاذ', icon: <DashboardRounded /> },
    { href: '/teacher/students', label: 'الطلاب', icon: <SchoolRounded /> },
    { href: '/teacher/accounting', label: 'الحساب مع المدير', icon: <PaidRounded /> },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', direction: 'rtl', bgcolor: '#F0F2F5' }}>
      <Box
        component="aside"
        sx={{
          width: 280,
          bgcolor: PALETTE.sidebarBg,
          color: 'white',
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '10px 0 30px rgba(0,0,0,0.2)',
          zIndex: 1100,
        }}
      >
        <Box sx={{ p: 3, mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
            <Avatar sx={{ bgcolor: PALETTE.deepTeal, width: 45, height: 45, fontWeight: 'bold' }}>T</Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2, color: 'white' }}>
                لوحة <span style={{ color: PALETTE.gold }}>الأستاذ</span>
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                إدارة الطلاب والمحتوى
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box sx={{ flexGrow: 1, px: 2, overflowY: 'auto' }}>
          <Typography variant="overline" sx={{ px: 2, color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>
            القائمة
          </Typography>
          <List sx={{ mt: 1 }}>
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + '/');
              return (
                <ListItemButton
                  key={link.href}
                  component={Link}
                  href={link.href}
                  selected={active}
                  sx={{
                    borderRadius: '12px',
                    mb: 0.8,
                    py: 1.2,
                    transition: 'all 0.2s ease-in-out',
                    '&.Mui-selected': {
                      bgcolor: PALETTE.deepTeal,
                      color: 'white',
                      '&:hover': { bgcolor: PALETTE.deepTeal },
                      '& .MuiListItemIcon-root': { color: 'white' },
                    },
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.08)',
                      transform: 'scale(1.02)',
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: active ? 'white' : 'rgba(255,255,255,0.6)', transition: '0.2s' }}>
                    {link.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={link.label}
                    primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: active ? 600 : 400 }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Box>

        <Box sx={{ p: 2, mt: 'auto' }}>
          <Box
            sx={{
              p: 2,
              borderRadius: '16px',
              bgcolor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
              mb: 2,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>v1.0.0</Typography>
              <Tooltip title="الإعدادات">
                <SettingsRounded sx={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }} />
              </Tooltip>
            </Stack>
            <Divider sx={{ my: 1.5, bgcolor: 'rgba(255,255,255,0.05)' }} />
            <LogoutButton variant="contained" fullWidth sx={{ bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: '#d32f2f' } }} />
          </Box>
        </Box>
      </Box>

      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            height: 70,
            bgcolor: 'white',
            display: 'flex',
            alignItems: 'center',
            px: 4,
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            borderBottom: '1px solid #E0E0E0',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, color: PALETTE.darkOlive }}>
            {links.find((l) => pathname.startsWith(l.href))?.label || 'لوحة الأستاذ'}
          </Typography>
        </Box>

        <Box sx={{ p: 4, flex: 1, overflowY: 'auto' }}>{children}</Box>
      </Box>
    </Box>
  );
}
