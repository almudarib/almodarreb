'use client';
import * as React from 'react';
import { Box, Stack, Typography, LinearProgress } from '@mui/material';
import type { StudentProgressData } from '@/app/actions/students';

export type StudentProgressProps = {
  data: StudentProgressData | null;
};

export function StudentProgress({ data }: StudentProgressProps) {
  const examsPart =
    data && (data.totalActiveExams ?? 0) > 0
      ? 50 * Math.min(1, (data.examsTaken ?? 0) / (data.totalActiveExams ?? 1))
      : 0;
  const videosPart =
    data && (data.totalActiveSessions ?? 0) > 0
      ? 50 * Math.min(1, (data.sessionsWatched ?? 0) / (data.totalActiveSessions ?? 1))
      : 0;
  const percent = Math.round(examsPart + videosPart);
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
          <Typography variant="body2">الاختبارات: {(data?.examsTaken ?? 0)} / {(data?.totalActiveExams ?? 0)}</Typography>
          <Typography variant="body2">الفيديوهات: {(data?.sessionsWatched ?? 0)} / {(data?.totalActiveSessions ?? 0)}</Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

export default StudentProgress;
