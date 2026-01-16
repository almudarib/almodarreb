'use client';

import * as React from 'react';
import { Box, MenuItem, Select, Stack } from '@mui/material';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/Modal';
import { updateUser } from '@/app/actions/users';
import type { UserKind, UserSummary } from '@/app/actions/users';

export default function EditUserModal({
  open,
  user,
  onClose,
  onSaved,
  setMessage,
  setError,
}: {
  open: boolean;
  user: UserSummary | null;
  onClose: () => void;
  onSaved: () => void;
  setMessage: (msg: string | null) => void;
  setError: (msg: string | null) => void;
}) {
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState<{
    name: string;
    email: string;
    password: string;
    kind: UserKind;
  }>({ name: '', email: '', password: '', kind: 'teacher' });

  React.useEffect(() => {
    if (user) {
      setForm({
        name: user.name,
        email: user.email,
        password: '',
        kind: user.kind,
      });
    }
  }, [user]);

  async function handleSubmit() {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    const res = await updateUser({
      id: user.id,
      kind: form.kind,
      name: form.name,
      email: form.email,
      password: form.password || undefined,
    });
    setSubmitting(false);
    if (res.ok) {
      onClose();
      setMessage('تم حفظ التعديلات بنجاح');
      onSaved();
    } else {
      setError(res.error ?? 'فشلت عملية التعديل');
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      onCancel={onClose}
      title="تعديل المستخدم"
      submitText={submitting ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
      onSubmit={handleSubmit}
      fullWidth
      maxWidth="sm"
    >
      <Box sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Label>الاسم الكامل</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            inputProps={{ dir: 'rtl', style: { textAlign: 'right' } }}
          />
          <Label>البريد الإلكتروني</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            inputProps={{ dir: 'rtl', style: { textAlign: 'right' } }}
          />
          <Label>كلمة المرور (اختياري)</Label>
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            placeholder="اتركها فارغة إن لم ترغب بالتغيير"
            inputProps={{ dir: 'rtl', style: { textAlign: 'right' } }}
          />
          <Label>نوع المستخدم</Label>
          <Select
            value={form.kind}
            onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value as UserKind }))}
            sx={{ borderRadius: '12px', direction: 'rtl' }}
            displayEmpty
          >
            <MenuItem value="teacher">معلّم</MenuItem>
            <MenuItem value="admin">ادمن</MenuItem>
          </Select>
        </Stack>
      </Box>
    </Modal>
  );
}
