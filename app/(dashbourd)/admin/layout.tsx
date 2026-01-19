'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Box, Stack, Typography, List, ListItemButton, 
  ListItemText, Divider, ListItemIcon, Avatar, 
  Tooltip, IconButton 
} from '@mui/material';
import { 
  DashboardRounded, 
  PeopleAltRounded, 
  SchoolRounded, 
  QuizRounded, 
  QuestionAnswerRounded, 
  VideoLibraryRounded, 
  AccountBalanceWalletRounded,
  SettingsRounded,
  MenuOpenRounded, // أيقونة إغلاق
  MenuRounded      // أيقونة فتح
} from '@mui/icons-material';
import { LanguageRounded } from '@mui/icons-material';
import { LogoutButton } from '@/components/logout-button';

const PALETTE = {
  sidebarBg: 'var(--brand-teal)',
  primary: 'var(--brand-teal)',
  gold: 'var(--brand-gold)',
  goldDark: 'var(--brand-gold-dark)',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  
  const sidebarWidth = isCollapsed ? 85 : 280;

  const links = [
    { href: '/admin', label: 'لوحة التحكم', icon: <DashboardRounded /> },
    { href: '/admin/users', label: 'المستخدمون', icon: <PeopleAltRounded /> },
    { href: '/admin/students', label: 'الطلاب', icon: <SchoolRounded /> },
    { href: '/admin/groups', label: 'المجموعات', icon: <LanguageRounded /> },
    { href: '/admin/exam', label: 'الامتحانات', icon: <QuizRounded /> },
    { href: '/admin/manage_questions', label: 'إدارة الأسئلة', icon: <QuestionAnswerRounded /> },
    { href: '/admin/questions', label: 'إضافة الأسئلة', icon: <QuestionAnswerRounded /> },
    { href: '/admin/video', label: 'الفيديو', icon: <VideoLibraryRounded /> },
    { href: '/admin/accounting', label: 'الحسابات', icon: <AccountBalanceWalletRounded /> },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', direction: 'rtl', bgcolor: 'var(--brand-light-bg)' }}>
      {/* Sidebar */}
      <Box
        component="aside"
        sx={{
          width: sidebarWidth,
          bgcolor: PALETTE.sidebarBg,
          color: 'white',
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '10px 0 30px rgba(0,0,0,0.15)',
          zIndex: 1100,
          transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
        }}
      >
        {/* --- Header Section with Toggle Button --- */}
        <Box sx={{ 
          p: 2, 
          height: 80, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: isCollapsed ? 'center' : 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          {!isCollapsed && (
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ bgcolor: 'white', color: PALETTE.primary, width: 35, height: 35, fontWeight: 'bold', fontSize: '1rem' }}>A</Avatar>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, whiteSpace: 'nowrap', fontSize: '1.1rem' }}>
                لوحة <span style={{ color: PALETTE.gold }}>الإدارة</span>
              </Typography>
            </Stack>
          )}

          <IconButton 
            onClick={() => setIsCollapsed(!isCollapsed)}
            sx={{ 
              color: isCollapsed ? PALETTE.goldDark : 'white', 
              bgcolor: 'rgba(255,255,255,0.05)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
              transition: '0.3s'
            }}
          >
            {isCollapsed ? <MenuRounded /> : <MenuOpenRounded />}
          </IconButton>
        </Box>

        {/* --- Navigation Links --- */}
        <Box sx={{ flexGrow: 1, px: 1.5, py: 3, overflowY: 'auto', overflowX: 'hidden' }}>
          <List>
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + '/');
              return (
                <Tooltip key={link.href} title={isCollapsed ? link.label : ""} placement="left">
                  <ListItemButton
                    component={Link}
                    href={link.href}
                    selected={active}
                    sx={{
                      borderRadius: '12px',
                      mb: 1,
                      py: 1.5,
                      justifyContent: isCollapsed ? 'center' : 'flex-start',
                      px: isCollapsed ? 0 : 2,
                      '&.Mui-selected': {
                        bgcolor: PALETTE.goldDark,
                        color: 'white',
                        '&:hover': { bgcolor: PALETTE.goldDark },
                        '& .MuiListItemIcon-root': { color: 'white' },
                      },
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.08)',
                      }
                    }}
                  >
                    <ListItemIcon sx={{ 
                      minWidth: isCollapsed ? 0 : 40, 
                      color: active ? 'white' : 'rgba(255,255,255,0.7)',
                      justifyContent: 'center'
                    }}>
                      {link.icon}
                    </ListItemIcon>
                    {!isCollapsed && (
                      <ListItemText 
                        primary={link.label} 
                        primaryTypographyProps={{ 
                          fontSize: '0.95rem', 
                          fontWeight: active ? 700 : 500,
                          whiteSpace: 'nowrap'
                        }} 
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              );
            })}
          </List>
        </Box>

        {/* --- Footer Section --- */}
{/* --- Footer Section --- */}
<Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
  <LogoutButton
    variant={isCollapsed ? "text" : "contained"}
    fullWidth={!isCollapsed}
    // نرسل حالة التصغير للمكون ليقرر عرض النص أو الأيقونة
    isCollapsed={isCollapsed} 
    sx={{
      minWidth: isCollapsed ? 0 : 'auto',
      bgcolor: isCollapsed ? 'transparent' : PALETTE.goldDark,
      color: isCollapsed ? PALETTE.goldDark : 'white',
      '&.MuiButton-text': { color: PALETTE.goldDark },
      '&:hover': { 
        bgcolor: isCollapsed ? 'rgba(255,255,255,0.1)' : PALETTE.goldDark 
      },
      // تنسيق الأيقونة لتكون في المنتصف تماماً عند التصغير
      display: 'flex',
      justifyContent: 'center',
      mx: 'auto'
    }}
  />
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
          width: `calc(100% - ${sidebarWidth}px)`,
          transition: 'margin 0.4s ease',
        }}
      >
        <Box sx={{ 
          height: 80, 
          bgcolor: 'white', 
          display: 'flex', 
          alignItems: 'center', 
          px: 4, 
          borderBottom: '1px solid #eee',
          position: 'sticky',
          top: 0,
          zIndex: 1000
        }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: PALETTE.primary }}>
             {links.find(l => pathname.startsWith(l.href))?.label || 'لوحة التحكم'}
          </Typography>
        </Box>

        <Box sx={{ p: { xs: 2, md: 4 }, flex: 1 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
} 
