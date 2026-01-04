'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Stack, Typography, List, ListItemButton, ListItemText, Divider } from '@mui/material';
import { LogoutButton } from '@/components/logout-button';

// لوحة الألوان المستخرجة من الهوية
const PALETTE = {
  deepTeal: '#088395',    // اللون الأزرق البترولي في السيارة
  gold: '#E19800',        // اللون الذهبي/البرتقالي
  darkOlive: '#252815',   // اللون الداكن جداً
  softSand: '#FDF7E1',    // لون خلفية فاتح مستوحى من السماء في الصورة
  sidebarBg: '#1A1D0F',   // لون غامق للقائمة (يعطي فخامة)
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const links = [
    { href: '/admin', label: 'لوحة التحكم' },
    { href: '/admin/users', label: 'المستخدمون' },
    { href: '/admin/students', label: 'الطلاب' },
    { href: '/admin/exam', label: 'الامتحانات' },
    { href: '/admin/questions', label: 'الأسئلة' },
    { href: '/admin/video', label: 'الفيديو' },
    { href: '/admin/accounting', label: 'الحسابات' },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', flexDirection: 'row', direction: 'rtl', bgcolor: '#F8F9FA' }}>
      {/* القائمة الجانبية المطورة */}
      <Box
        component="aside"
        sx={{
          width: 260,
          bgcolor: PALETTE.darkOlive, // استخدام اللون الداكن من الهوية
          color: 'white',
          p: 0,
          position: 'sticky',
          top: 0,
          alignSelf: 'flex-start',
          height: '100vh',
          textAlign: 'right',
          boxShadow: '4px 0 10px rgba(0,0,0,0.1)',
        }}
      >
        <Stack spacing={0} sx={{ height: '100%' }}>
          {/* Logo / Header المنطقة العلوية */}
          <Box sx={{ p: 4, textAlign: 'center', background: `linear-gradient(135deg, ${PALETTE.darkOlive} 0%, #343a1c 100%)` }}>
            <Typography variant="h5" sx={{ fontWeight: 900, color: PALETTE.gold, letterSpacing: 1 }}>
              إدارة <span style={{ color: PALETTE.deepTeal }}>المنصة</span>
            </Typography>
          </Box>

          <Divider sx={{ bgcolor: 'rgba(255,255,255,0.05)', mb: 2 }} />

          {/* Navigation Links */}
          <List sx={{ px: 2 }}>
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
                    mb: 1,
                    justifyContent: 'flex-start',
                    transition: 'all 0.3s ease',
                    // حالة العنصر المختار
                    '&.Mui-selected': {
                      bgcolor: PALETTE.deepTeal,
                      color: 'white',
                      '&:hover': { bgcolor: PALETTE.deepTeal },
                      boxShadow: `0 4px 12px ${PALETTE.deepTeal}66`,
                    },
                    // حالة التمرير (Hover)
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.05)',
                      transform: 'translateX(-5px)', // تأثير حركة بسيط لليسار بما أن الاتجاه RTL
                    }
                  }}
                >
                  <ListItemText 
                    primary={link.label} 
                    primaryTypographyProps={{ 
                      sx: { 
                        textAlign: 'right', 
                        fontWeight: active ? 700 : 400,
                        fontSize: '0.95rem'
                      } 
                    }} 
                  />
                  {/* علامة بسيطة بجانب العنصر النشط */}
                  {active && (
                    <Box sx={{ width: 4, height: 20, bgcolor: PALETTE.gold, borderRadius: 2, ml: 1 }} />
                  )}
                </ListItemButton>
              );
            })}
          </List>

          {/* Footer أو معلومات إضافية أسفل القائمة */}
          <Box sx={{ mt: 'auto', p: 3, textAlign: 'center' }}>
            <Stack spacing={2}>
              <Box 
                sx={{ 
                  p: 2, 
                  borderRadius: '12px', 
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px dashed rgba(255,255,255,0.1)' 
                }}
              >
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                  الإصدار 2.0.1
                </Typography>
              </Box>
              <LogoutButton label="تسجيل الخروج" variant="outlined" size="small" />
            </Stack>
          </Box>
        </Stack>
      </Box>

      {/* منطقة المحتوى الرئيسية */}
      <Box 
        component="main" 
        sx={{ 
          flex: 1, 
          p: 4, 
          bgcolor: '#f4f7f6', // لون خلفية محايد لإبراز البطاقات
          minHeight: '100vh',
          overflowY: 'auto'
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
