'use client';

import * as React from 'react';
import { Alert, Box, FormControl, MenuItem, Select, Stack, Typography } from '@mui/material';
import { CircularProgress } from '@mui/material';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form } from '@/components/ui/Form';
import { PeopleAltRounded } from '@mui/icons-material';
import { createUser, type CreateUserInput } from '@/app/actions/users';

type UserKind = 'admin' | 'teacher';

export default function AddUserForm({
  onCreated,
  formId,
  onSubmittingChange,
}: {
  onCreated: () => void;
  formId?: string;
  onSubmittingChange?: (submitting: boolean) => void;
}) {
  const [kind, setKind] = React.useState<UserKind | ''>('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [defaultFee, setDefaultFee] = React.useState('20');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors] = React.useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    onSubmittingChange?.(true);
    let input: CreateUserInput =
      kind === 'admin'
        ? { kind, email, password, name } as any
        : { kind: 'teacher', email, password, name, per_student_fee: Number(defaultFee) } as any;
    const res = await createUser(input);
    setSubmitting(false);
    onSubmittingChange?.(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onCreated();
    setKind('');
    setEmail('');
    setPassword('');
    setName('');
    setDefaultFee('20');
  }

  return (
    <Box sx={{ p: 1, position: 'relative' }}>
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>{error}</Alert>}
      <Form id={formId} onSubmit={handleSubmit}>
        <Stack spacing={4} sx={{ p: 1 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: -2, fontWeight: 500, textAlign: 'right', direction: 'rtl' }}>
            الرجاء إدخال بيانات الحساب الجديدة بدقة
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <FormControl fullWidth error={!!fieldErrors.kind} sx={{ gridColumn: { md: '1 / span 2' } }}>
              <Label sx={{ mb: 5, fontWeight: 700, color: 'var(--brand-dark)', display: 'flex', alignItems: 'center', gap: 1, flexDirection: 'row-reverse' }}>
                <PeopleAltRounded sx={{ fontSize: 20, color: 'var(--brand-teal)' }} />
                نوع المستخدم
              </Label>
              <Select
                value={kind}
                onChange={(e) => setKind(e.target.value as UserKind)}
                sx={{ borderRadius: '12px', bgcolor: '#f8fafc', '& .MuiOutlinedInput-notchedOutline': { border: '1px solid #e2e8f0' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--brand-teal)' }, direction: 'rtl' }}
                MenuProps={{ PaperProps: { sx: { direction: 'rtl' } } }}
                displayEmpty
              >
                <MenuItem value="teacher">معلّم </MenuItem>
                <MenuItem value="admin">مسؤول </MenuItem>
              </Select>
            </FormControl>
            <Box>
              <Label sx={{ mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                الاسم الكامل
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="أدخل الاسم الثلاثي"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[var(--brand-teal)] focus:border-transparent transition-all outline-none"
                inputProps={{ dir: 'rtl', style: { textAlign: 'right' } }}
              />
            </Box>
            <Box>
              <Label sx={{ mb: 1, fontWeight: 600 }}>البريد الإلكتروني</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[var(--brand-teal)] transition-all outline-none"
                inputProps={{ dir: 'rtl', style: { textAlign: 'right' } }}
              />
            </Box>
            <Box>
              <Label sx={{ mb: 1, fontWeight: 600 }}>كلمة المرور</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="******"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[var(--brand-teal)] transition-all outline-none"
                inputProps={{ dir: 'rtl', style: { textAlign: 'right' } }}
              />
            </Box>
            {kind === 'teacher' && (
              <Box sx={{ animation: 'fadeIn 0.4s ease-out', bgcolor: 'var(--brand-teal-5)', p: 2, borderRadius: '12px', border: '1px dashed var(--brand-teal)', gridColumn: { md: 'span 1' } }}>
                <Label sx={{ mb: 1, fontWeight: 700, color: 'var(--brand-teal)' }}>القيمة لكل طالب بالدولار</Label>
                <Input
                  type="number"
                  value={defaultFee}
                  onChange={(e) => setDefaultFee(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border-none bg-white shadow-sm outline-none focus:ring-2 focus:ring-[var(--brand-teal)]"
                  placeholder="0.00"
                  inputProps={{ dir: 'rtl', style: { textAlign: 'right' } }}
                />
                <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
                  سيتم احتساب هذه القيمة تلقائياً عند تسجيل طلاب جدد مع هذا المعلم.
                </Typography>
              </Box>
            )}
          </Box>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(-10px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}} />
        </Stack>
      </Form>
      {submitting && (
        <Box sx={{
          position: 'absolute',
          inset: 0,
          bgcolor: 'rgba(255,255,255,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '12px'
        }}>
          <CircularProgress size={28} />
        </Box>
      )}
    </Box>
  );
}
