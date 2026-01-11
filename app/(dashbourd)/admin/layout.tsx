'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Stack, Typography, List, ListItemButton, ListItemText, Divider, ListItemIcon, Avatar, Tooltip } from '@mui/material';
import { 
  DashboardRounded, 
  PeopleAltRounded, 
  SchoolRounded, 
  QuizRounded, 
  QuestionAnswerRounded, 
  VideoLibraryRounded, 
  AccountBalanceWalletRounded,
  SettingsRounded
} from '@mui/icons-material';
import { LogoutButton } from '@/components/logout-button';

const PALETTE = {
  deepTeal: 'var(--brand-teal)',
  gold: 'var(--brand-gold)',
  darkOlive: 'var(--brand-dark)',
  sidebarBg: 'var(--brand-teal)',
  activeLight: 'var(--brand-teal-13)',
  primary: 'var(--brand-teal)',
  dark: 'var(--brand-dark)',
  goldDark: 'var(--brand-gold-dark)',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const links = [
    { href: '/admin', label: 'لوحة التحكم', icon: <DashboardRounded /> },
    { href: '/admin/users', label: 'المستخدمون', icon: <PeopleAltRounded /> },
    { href: '/admin/students', label: 'الطلاب', icon: <SchoolRounded /> },
    { href: '/admin/exam', label: 'الامتحانات', icon: <QuizRounded /> },
    { href: '/admin/questions', label: 'الأسئلة', icon: <QuestionAnswerRounded /> },
    { href: '/admin/video', label: 'الفيديو', icon: <VideoLibraryRounded /> },
    { href: '/admin/accounting', label: 'الحسابات', icon: <AccountBalanceWalletRounded /> },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', direction: 'rtl', bgcolor: 'var(--brand-light-bg)' }}>
      {/* Sidebar */}
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
        {/* Header/Logo Section */}
        <Box sx={{ p: 3, mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
            <Avatar sx={{ bgcolor: PALETTE.primary, width: 45, height: 45, fontWeight: 'bold' }}>A</Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2, color: 'white' }}>
                لوحة <span style={{ color: PALETTE.gold }}>الإدارة</span>
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                نظام إدارة المحتوى
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Navigation */}
        <Box sx={{ flexGrow: 1, px: 2, overflowY: 'auto' }}>
          <Typography variant="overline" sx={{ px: 2, color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>
            القائمة الرئيسية
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
                      bgcolor: PALETTE.goldDark,
                      color: 'white',
                      '&:hover': { bgcolor: PALETTE.goldDark },
                      '& .MuiListItemIcon-root': { color: 'white' },
                    },
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.08)',
                      transform: 'scale(1.02)',
                    }
                  }}
                >
                  <ListItemIcon sx={{ 
                    minWidth: 40, 
                    color: active ? 'white' : 'rgba(255,255,255,0.6)',
                    transition: '0.2s' 
                  }}>
                    {link.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={link.label} 
                    primaryTypographyProps={{ 
                      fontSize: '0.9rem', 
                      fontWeight: active ? 600 : 400 
                    }} 
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Box>

        {/* Footer Section */}
        <Box sx={{ p: 2, mt: 'auto' }}>
          <Box 
            sx={{ 
              p: 2, 
              borderRadius: '16px', 
              bgcolor: 'rgba(255,255,255,0.03)', 
              border: '1px solid rgba(255,255,255,0.05)',
              mb: 2 
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>v2.0.4</Typography>
              <Tooltip title="الإعدادات">
                <SettingsRounded sx={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }} />
              </Tooltip>
            </Stack>
            <Divider sx={{ my: 1.5, bgcolor: 'rgba(255,255,255,0.05)' }} />
            <LogoutButton
              variant="contained"
              fullWidth
              sx={{
                bgcolor: PALETTE.goldDark,
                color: 'white',
                '&:hover': { bgcolor: PALETTE.goldDark },
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Main Content Area */}
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
        {/* Header Bar (Optional but Recommended) */}
        <Box sx={{ 
          height: 70, 
          bgcolor: 'white', 
          display: 'flex', 
          alignItems: 'center', 
          px: 4, 
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          borderBottom: '1px solid #E0E0E0'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: PALETTE.primary }}>
             {links.find(l => pathname.startsWith(l.href))?.label || 'لوحة التحكم'}
          </Typography>
        </Box>

        <Box sx={{ p: 4, flex: 1, overflowY: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
