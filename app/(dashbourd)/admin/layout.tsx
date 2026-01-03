'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Stack, Typography, List, ListItemButton, ListItemText } from '@mui/material';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const links: Array<{ href: string; label: string }> = [
    { href: '/admin', label: 'لوحة التحكم' },
    { href: '/admin/users', label: 'المستخدمون' },
    { href: '/admin/students', label: 'الطلاب' },
    { href: '/admin/exam', label: 'الامتحانات' },
    { href: '/admin/questions', label: 'الأسئلة' },
    { href: '/admin/video', label: 'الفيديو' },
    { href: '/admin/accounting', label: 'الحسابات' },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', flexDirection: 'row', direction: 'rtl' }}>
      <Box
        component="aside"
        sx={{
          width: 240,
          borderLeft: '1px solid',
          borderColor: 'divider',
          p: 2,
          position: 'sticky',
          top: 0,
          alignSelf: 'flex-start',
          height: '100vh',
          textAlign: 'right',
        }}
      >
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ textAlign: 'right' }}>الإدارة</Typography>
          <List dense sx={{ direction: 'rtl' }}>
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + '/');
              return (
                <ListItemButton
                  key={link.href}
                  component={Link}
                  href={link.href}
                  selected={active}
                  sx={{ borderRadius: 1, justifyContent: 'flex-end' }}
                >
                  <ListItemText primary={link.label} primaryTypographyProps={{ sx: { textAlign: 'right' } }} />
                </ListItemButton>
              );
            })}
          </List>
        </Stack>
      </Box>
      <Box component="main" sx={{ flex: 1, p: 3 }}>
        {children}
      </Box>
    </Box>
  );
}
