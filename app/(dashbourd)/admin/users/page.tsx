'use client';

import * as React from 'react';
import { Container, Stack, Box, Typography } from '@mui/material';
import { Button } from '@/components/ui/button';
import { PersonAddAlt1 } from '@mui/icons-material';
import UsersTable from './UsersTable';
import AddUserModal from './AddUserModal';

export default function AdminUsersPage() {
  const [reloadKey, setReloadKey] = React.useState(0);
  const [addOpen, setAddOpen] = React.useState(false);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--brand-dark)' }}>إدارة المستخدمين</Typography>
          <Typography variant="body2" sx={{ color: 'var(--neutral-700)', mt: 0.5 }}>إضافة وتعديل صلاحيات المعلمين والمدراء</Typography>
        </Box>
        <Button 
          variant="contained" 
          onClick={() => setAddOpen(true)}
          sx={{ 
            bgcolor: 'var(--brand-teal)', 
            px: 3, py: 1.2, 
            borderRadius: '10px',
            '&:hover': { bgcolor: 'var(--brand-teal-hover)' },
            boxShadow: '0 4px 14px var(--teal-shadow-30)'
          }}
          startIcon={<PersonAddAlt1 sx={{ ml: 1 }} />}
        >
          مستخدم جديد
        </Button>
      </Stack>

      <UsersTable key={reloadKey} />

      <AddUserModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => {
          setReloadKey((k) => k + 1);
        }}
      />
    </Container>
  );
}
