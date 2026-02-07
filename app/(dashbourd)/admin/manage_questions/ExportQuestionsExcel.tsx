 'use client';
 
 import * as React from 'react';
 import { Box, Stack, MenuItem } from '@mui/material';
 import { Input } from '@/components/ui';
 import { listExamQuestions, type ExamGroupRecord, type ExamRecord, type QuestionRecord } from '@/app/actions/exam';
 import ExportDataButton from '@/components/ExportDataButton';
 
 export type NoticeSeverity = 'success' | 'error' | 'warning';
 
 export default function ExportQuestionsExcel({
   groups,
   examsByGroup,
   onNotice,
 }: {
   groups: ExamGroupRecord[];
   examsByGroup: Map<number, ExamRecord[]>;
   onNotice?: (message: string, severity: NoticeSeverity) => void;
 }) {
   const [exportGroupId, setExportGroupId] = React.useState<number | ''>('');
  const [selectedExamId, setSelectedExamId] = React.useState<number | ''>('');
  const [building, setBuilding] = React.useState(false);
 
   function sanitizeSheetName(name: string): string {
     const illegal = /[:\\/?*\[\]]/g;
     let n = name.replace(illegal, ' ').trim();
     if (n.length === 0) n = 'ورقة';
     if (n.length > 31) n = n.slice(0, 31);
     return n;
   }
 
   function sanitizeFilename(name: string): string {
     const illegal = /[<>:"/\\|?*\x00-\x1F]/g;
     const clean = name.replace(illegal, '_').trim() || 'مجموعة';
     const d = new Date();
     const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
     return `${clean}_${stamp}.xlsx`;
   }
 
  async function buildSheets() {
    if (!exportGroupId || typeof exportGroupId !== 'number') {
      throw new Error('الرجاء اختيار مجموعة للتصدير');
    }
    const group = groups.find((g) => g.id === exportGroupId);
    const exams = examsByGroup.get(exportGroupId) ?? [];
    if (!group) {
      throw new Error('المجموعة غير موجودة');
    }
    if (exams.length === 0) {
      throw new Error('لا توجد امتحانات ضمن هذه المجموعة');
    }
    setBuilding(true);
    try {
      const questionsMap = new Map<number, QuestionRecord[]>();
      const toLoad: number[] = [];
      for (const ex of exams) {
        toLoad.push(ex.id);
      }
      const concurrency = 6;
      for (let i = 0; i < toLoad.length; i += concurrency) {
        const chunk = toLoad.slice(i, i + concurrency);
        const results = await Promise.all(chunk.map((id) => listExamQuestions(id)));
        results.forEach((res, idx) => {
          const eid = chunk[idx]!;
          if (res.ok) {
            questionsMap.set(eid, res.questions);
          } else {
            questionsMap.set(eid, []);
          }
        });
      }
      let totalQuestions = 0;
      const sheets: Array<{ name: string; header?: string[]; rows: Array<Record<string, unknown>> }> = [];
      exams.forEach((ex) => {
        const qs = questionsMap.get(ex.id) ?? [];
        totalQuestions += qs.length;
        const rows = qs.map((q) => ({
          رقم: q.id,
          السؤال: q.question,
          'الخيار A': q.option_a,
          'الخيار B': q.option_b,
          'الخيار C': q.option_c,
          'الخيار D': q.option_d,
          الصحيح: q.correct_option,
          'رابط الصورة': q.image_url ?? '',
        }));
        const header = ['رقم', 'السؤال', 'الخيار A', 'الخيار B', 'الخيار C', 'الخيار D', 'الصحيح', 'رابط الصورة'];
        sheets.push({ name: sanitizeSheetName(ex.title), header, rows });
      });
      const metaRows = [
        { المفتاح: 'اسم المجموعة', القيمة: group.title },
        { المفتاح: 'اللغة', القيمة: group.language === 'ar' ? 'العربية' : group.language },
        { المفتاح: 'نشطة', القيمة: group.is_active ? 'نعم' : 'لا' },
        { المفتاح: 'تاريخ الإنشاء', القيمة: new Date(group.created_at).toLocaleString('ar-EG') },
        { المفتاح: 'عدد الامتحانات', القيمة: String(exams.length) },
        { المفتاح: 'إجمالي الأسئلة', القيمة: String(totalQuestions) },
      ];
      sheets.push({ name: sanitizeSheetName('بيانات المجموعة'), header: ['المفتاح', 'القيمة'], rows: metaRows as any });
      return { fileName: group.title, sheets };
    } finally {
      setBuilding(false);
    }
  }
 
  async function buildSingleExamSheets() {
    if (!exportGroupId || typeof exportGroupId !== 'number') {
      throw new Error('الرجاء اختيار مجموعة أولاً');
    }
    if (!selectedExamId || typeof selectedExamId !== 'number') {
      throw new Error('الرجاء اختيار فحص للتصدير');
    }
    const group = groups.find((g) => g.id === exportGroupId);
    const exams = examsByGroup.get(exportGroupId) ?? [];
    const exam = exams.find((e) => e.id === selectedExamId);
    if (!group) {
      throw new Error('المجموعة غير موجودة');
    }
    if (!exam) {
      throw new Error('الفحص غير موجود ضمن المجموعة المحددة');
    }
    setBuilding(true);
    try {
      const res = await listExamQuestions(selectedExamId);
      const qs = res.ok ? res.questions : [];
      const rows = qs.map((q) => ({
        رقم: q.id,
        السؤال: q.question,
        'الخيار A': q.option_a,
        'الخيار B': q.option_b,
        'الخيار C': q.option_c,
        'الخيار D': q.option_d,
        الصحيح: q.correct_option,
        'رابط الصورة': q.image_url ?? '',
      }));
      const header = ['رقم', 'السؤال', 'الخيار A', 'الخيار B', 'الخيار C', 'الخيار D', 'الصحيح', 'رابط الصورة'];
      const sheets: Array<{ name: string; header?: string[]; rows: Array<Record<string, unknown>> }> = [];
      sheets.push({ name: sanitizeSheetName(exam.title), header, rows });
      const metaRows = [
        { المفتاح: 'اسم المجموعة', القيمة: group.title },
        { المفتاح: 'لغة المجموعة', القيمة: group.language === 'ar' ? 'العربية' : group.language },
        { المفتاح: 'اسم الفحص', القيمة: exam.title },
        { المفتاح: 'لغة الفحص', القيمة: exam.language },
        { المفتاح: 'المدة بالدقائق', القيمة: String(exam.duration_minutes) },
        { المفتاح: 'نشط', القيمة: exam.is_active ? 'نعم' : 'لا' },
        { المفتاح: 'تاريخ إنشاء الفحص', القيمة: new Date(exam.created_at).toLocaleString('ar-EG') },
        { المفتاح: 'عدد الأسئلة', القيمة: String(rows.length) },
      ];
      sheets.push({ name: sanitizeSheetName('بيانات الفحص'), header: ['المفتاح', 'القيمة'], rows: metaRows as any });
      const baseName = `${group.title}_${exam.title}`;
      return { fileName: baseName, sheets };
    } finally {
      setBuilding(false);
    }
  }
 
   return (
    <Stack spacing={2} sx={{ mb: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
        <Box sx={{ flex: 1 }}>
          <Input
            label="اختيار مجموعة للتصدير"
            select
            value={exportGroupId}
            onChange={(e) => {
              const val = Number(e.target.value) || '';
              setExportGroupId(val);
              setSelectedExamId('');
            }}
            fullWidth
          >
            <MenuItem value="">—</MenuItem>
            {groups.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                {g.title}
              </MenuItem>
            ))}
          </Input>
        </Box>
        <ExportDataButton
          label="تصدير كل امتحانات المجموعة"
          disabled={building || !exportGroupId}
          onNotice={onNotice}
          build={buildSheets}
        />
      </Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
        <Box sx={{ flex: 1 }}>
          <Input
            label="اختيار فحص ضمن المجموعة"
            select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(Number(e.target.value) || '')}
            fullWidth
            disabled={!exportGroupId}
          >
            <MenuItem value="">—</MenuItem>
            {(exportGroupId ? (examsByGroup.get(exportGroupId as number) ?? []) : []).map((ex) => (
              <MenuItem key={ex.id} value={ex.id}>
                {ex.title}
              </MenuItem>
            ))}
          </Input>
        </Box>
        <ExportDataButton
          label="تصدير الفحص المحدد"
          disabled={building || !exportGroupId || !selectedExamId}
          onNotice={onNotice}
          build={buildSingleExamSheets}
        />
      </Stack>
    </Stack>
   );
 }
 
