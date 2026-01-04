'use client';
import * as React from 'react';
import { Box, Stack, Typography, LinearProgress } from '@mui/material';
import type { StudentProgressData } from '@/app/actions/students';
import { computeProgressPercent } from '@/lib/student/progress';

export type StudentProgressProps = {
  data: StudentProgressData | null;
};

export function StudentProgress({ data }: StudentProgressProps) {
  // شريط تقدم بسيط يعتمد على الدرجة الأخيرة كنسبة مئوية
  const percent = computeProgressPercent(data?.lastScore ?? null);
  return (
    <Box dir="rtl">
      <Stack spacing={1}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'var(--brand-dark)' }}>تقدم الطالب</Typography>
        <LinearProgress
          variant="determinate"
          value={percent}
          aria-label="مؤشر تقدم الطالب"
          sx={{
            height: 8,
            borderRadius: '12px',
            bgcolor: 'var(--neutral-200)',
            '& .MuiLinearProgress-bar': {
              bgcolor: 'var(--brand-teal)',
              borderRadius: '12px'
            }
          }}
        />
        <Stack direction="row" spacing={2} justifyContent="space-between">
          <Typography variant="body2">النتيجة الأخيرة: {data?.lastScore ?? '--'}</Typography>
          <Typography variant="body2">الدراسة: {data?.totalStudyMinutes ?? 0} دقيقة</Typography>
          <Typography variant="body2">الاختبارات: {data?.examsTaken ?? 0}</Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

export default StudentProgress;
