'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Container,
  MenuItem,
  Snackbar,
  Stack,
  Typography,
  IconButton,
  Paper,
  Chip,
} from '@mui/material';
import { 
  Input, 
  Card, 
  CardHeader, 
  CardContent, 
  CardActions, 
  Button, 
  Form 
} from '@/components/ui';
import { addExamQuestion, listExams, listExamGroups, type ExamRecord } from '@/app/actions/exam';
import { 
  DeleteSweepRounded, 
  AddCircleOutlineRounded, 
  CloudUploadRounded, 
  ImageOutlined,
  CheckCircleRounded
} from '@mui/icons-material';

type Correct = 'A' | 'B' | 'C' | 'D';

type UIQuestion = {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: Correct | '';
  image_file?: { base64: string; filename: string; contentType: string };
};

export default function AdminQuestionsManualPage() {
  const [selectedExamId, setSelectedExamId] = React.useState<number | ''>('');
  const [questions, setQuestions] = React.useState<UIQuestion[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successOpen, setSuccessOpen] = React.useState(false);
  const [createdInfo, setCreatedInfo] = React.useState<{ examId: number; count: number } | null>(null);
  const [exams, setExams] = React.useState<ExamRecord[]>([]);
  const [loadingExams, setLoadingExams] = React.useState(false);
  const [groups, setGroups] = React.useState<Map<number, string>>(new Map());

  // تحميل الامتحانات مع إدارة الأخطاء بشكل آمن
  const loadExams = React.useCallback(async () => {
    setLoadingExams(true);
    try {
      const res = await listExams({ sort_by: 'created_at', sort_dir: 'desc', page: 1, per_page: 100 });
      if (!res.ok) {
        setError(res.error);
        setExams([]);
        return;
      }
      setExams(res.exams);
      const gs = await listExamGroups();
      if (gs.ok) {
        const m = new Map<number, string>();
        for (const g of gs.groups) m.set(g.id, g.title);
        setGroups(m);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف');
      setExams([]);
    } finally {
      setLoadingExams(false);
    }
  }, []);

  React.useEffect(() => { loadExams(); }, [loadExams]);

  // إضافة سؤال جديد (يُعاد استخدام المرجع لتحسين الأداء)
  const addQuestion = React.useCallback(() => {
    setQuestions((prev) => [...prev, { question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: '' }]);
  }, []);

  // حذف سؤال حسب الفهرس
  const removeQuestion = React.useCallback((index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // تحديث بيانات سؤال معين
  const updateQuestion = React.useCallback((index: number, data: Partial<UIQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...data } : q)));
  }, []);

  // معالجة رفع صورة السؤال وتحويلها إلى Base64
  const handleFileChange = React.useCallback((index: number, file: File | null) => {
    if (!file) {
      updateQuestion(index, { image_file: undefined });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      updateQuestion(index, {
        image_file: {
          base64: result.includes('base64,') ? (result.split('base64,').pop() as string) : result,
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
        }
      });
    };
    reader.readAsDataURL(file);
  }, [updateQuestion]);

  // تحقق شامل للمدخلات قبل الإرسال
  function validate(): boolean {
    if (!selectedExamId) {
      setError('يرجى اختيار الامتحان أولاً');
      return false;
    }
    if (questions.length === 0) {
      setError('يرجى إضافة سؤال واحد على الأقل');
      return false;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]!;
      const baseValid =
        !!String(q.question).trim() &&
        !!String(q.option_a).trim() &&
        !!String(q.option_b).trim() &&
        !!String(q.option_c).trim() &&
        !!String(q.option_d).trim();
      const co = String(q.correct_option).toUpperCase();
      const correctValid = ['A', 'B', 'C', 'D'].includes(co);
      if (!baseValid || !correctValid) {
        setError(`تأكد من اكتمال الحقول والخيار الصحيح للسؤال رقم ${i + 1}`);
        return false;
      }
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // تحقق قبل الإرسال
    if (!validate()) return;
    
    setSubmitting(true);
    setError(null);

    try {
      let count = 0;
      for (const q of questions) {
        const res = await addExamQuestion({
          exam_id: Number(selectedExamId),
          ...q,
          correct_option: q.correct_option as Correct,
          image: q.image_file
        });
        if (!res.ok) throw new Error(res.error);
        count++;
      }
      setCreatedInfo({ examId: Number(selectedExamId), count });
      setSuccessOpen(true);
      setQuestions([]);
      setSelectedExamId('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: 5 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4, pb: 2, borderBottom: '1px solid', borderColor: 'var(--neutral-200)' }}>
        <Box sx={{ textAlign: 'center', flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 900, color: 'var(--brand-dark)', mb: 1, letterSpacing: 0.2 }}>
            بناء محتوى الامتحان
          </Typography>
          <Typography variant="body1" sx={{ color: 'var(--neutral-700)' }}>
            قم بإضافة الأسئلة يدوياً وتحديد الإجابات الصحيحة بكل سهولة
          </Typography>
        </Box>
      </Stack>

      <Form onSubmit={handleSubmit}>
        {/* اختيار الامتحان */}
        <Card sx={{ mb: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <Input
              label="الامتحان المستهدف"
              select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value === '' ? '' : Number(e.target.value))}
              fullWidth
            >
              <MenuItem value="">{loadingExams ? 'جاري تحميل القائمة...' : 'اختر الامتحان من القائمة'}</MenuItem>
              {exams.map((ex) => (
                <MenuItem key={ex.id} value={ex.id}>
                  {ex.title} | {groups.get(ex.group_id) ?? `#${ex.group_id}`}
                </MenuItem>
              ))}
            </Input>

          </CardContent>
        </Card>

        {/* قائمة الأسئلة */}
        <Stack spacing={3}>
          {questions.map((q, index) => (
            <Paper 
              key={index}
              elevation={0}
              sx={{ 
                p: 3, 
                borderRadius: 4, 
                border: '1px solid', 
                borderColor: 'divider',
                position: 'relative',
                bgcolor: 'background.paper',
                '&:hover': { borderColor: 'primary.light' }
              }}
            >
              {/* رقم السؤال وزر الحذف */}
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Chip
                  label={`السؤال ${index + 1}`}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    bgcolor: 'var(--neutral-200)',
                    color: 'var(--brand-dark)'
                  }}
                />
                <IconButton color="error" onClick={() => removeQuestion(index)}>
                  <DeleteSweepRounded />
                </IconButton>
              </Stack>

              <Stack spacing={2.5}>
                {/* نص السؤال */}
                <Input
                  label="نص السؤال"
                  multiline
                  minRows={2}
                  value={q.question}
                  onChange={(e) => updateQuestion(index, { question: e.target.value })}
                  fullWidth
                />

                {/* الخيارات في شبكة 2x2 */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  {(['a', 'b', 'c', 'd'] as const).map((opt) => (
                    <Input
                      key={opt}
                      label={`الخيار ${opt.toUpperCase()}`}
                      value={q[`option_${opt}` as keyof UIQuestion] as string}
                      onChange={(e) => updateQuestion(index, { [`option_${opt}`]: e.target.value })}
                      fullWidth
                    />
                  ))}
                </Box>

                {/* الخيار الصحيح ورفع الصورة */}
<Stack spacing={2}>
  {/* تسمية توضيحية بسيطة */}
  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: -1 }}>
    تحديد الإجابة الصحيحة وإرفاق الوسائط
  </Typography>

  <Stack 
    direction={{ xs: 'column', md: 'row' }} 
    spacing={2} 
    alignItems="stretch"
  >
    {/* أزرار اختيار الإجابة السريع (Toggle Group Style) */}
    <Box 
      sx={{ 
        display: 'flex',
        bgcolor: 'var(--neutral-100)',
        p: 0.5, 
        borderRadius: 2.5,
        flexGrow: 1,
        border: '1px solid',
        borderColor: 'var(--neutral-200)'
      }}
    >
      {(['A', 'B', 'C', 'D'] as const).map((option) => {
        const isSelected = q.correct_option === option;
        return (
          <Box
            key={option}
            onClick={() => updateQuestion(index, { correct_option: option })}
            sx={{
              flex: 1,
              py: 1.5,
              textAlign: 'center',
              cursor: 'pointer',
              borderRadius: 2,
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              bgcolor: isSelected ? 'var(--brand-white)' : 'transparent',
              color: isSelected ? 'var(--brand-teal)' : 'var(--neutral-700)',
              boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
              border: isSelected ? '1px solid' : '1px solid transparent',
              borderColor: isSelected ? 'var(--brand-teal)' : 'transparent',
              '&:hover': { bgcolor: isSelected ? 'var(--brand-white)' : 'var(--neutral-100)' }
            }}
          >
            {isSelected && <CheckCircleRounded sx={{ fontSize: 18 }} />}
            {option}
          </Box>
        );
      })}
    </Box>

    {/* منطقة رفع الصورة مع المعاينة */}
    <Box sx={{ minWidth: { md: 200 } }}>
      <input
        accept="image/*"
        style={{ display: 'none' }}
        id={`file-${index}`}
        type="file"
        onChange={(e) => handleFileChange(index, e.target.files?.[0] || null)}
      />
      <label htmlFor={`file-${index}`} style={{ height: '100%', display: 'block' }}>
        <Button
          variant={q.image_file ? "contained" : "outlined"} // استخدام قيم مدعومة من MUI بدل "soft"
          component="span"
          color={q.image_file ? 'success' : 'inherit'}
          fullWidth
          sx={{
            height: '100%',
            minHeight: 52,
            borderRadius: 2.5,
            borderStyle: q.image_file ? 'solid' : 'dashed',
            display: 'flex',
            flexDirection: 'column',
            py: 1
          }}
        >
          {q.image_file ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <ImageOutlined fontSize="small" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>تم الرفع</Typography>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1} alignItems="center">
              <CloudUploadRounded fontSize="small" />
              <Typography variant="body2">إرفاق صورة</Typography>
            </Stack>
          )}
        </Button>
      </label>
    </Box>
  </Stack>

  {/* عرض معاينة الصورة في حال وجودها */}
  {q.image_file && (
    <Box 
      sx={{ 
        mt: 1, 
        position: 'relative', 
        width: 120, 
        height: 80, 
        borderRadius: 2, 
        overflow: 'hidden',
        border: '2px solid',
        borderColor: 'success.light'
      }}
    >
      <img 
        src={`data:${q.image_file.contentType};base64,${q.image_file.base64}`} 
        alt="Preview" 
        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
      />
      <IconButton 
        size="small" 
        onClick={() => updateQuestion(index, { image_file: undefined })}
        sx={{ 
          position: 'absolute', 
          top: 2, 
          right: 2, 
          bgcolor: 'rgba(255,255,255,0.8)',
          '&:hover': { bgcolor: 'error.main', color: 'white' }
        }}
      >
        <DeleteSweepRounded sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
  )}
</Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>

        {/* أزرار التحكم السفلية */}
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            variant="outlined"
            onClick={addQuestion}
            startIcon={<AddCircleOutlineRounded />}
            sx={{ px: 4, py: 1.5, borderRadius: 3, border: '2px dashed' }}
          >
            إضافة سؤال جديد
          </Button>

          <Button
            type="submit"
            variant="contained"
            size="large"
            loading={submitting}
            disabled={questions.length === 0}
            sx={{ px: 6, py: 1.5, borderRadius: 3, fontWeight: 'bold' }}
          >
            حفظ وإرسال الأسئلة
          </Button>
        </Box>
      </Form>

      {/* تنبيهات النجاح والخطأ */}
      <Snackbar
        open={successOpen}
        autoHideDuration={4000}
        onClose={() => setSuccessOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" sx={{ width: '100%', borderRadius: 2, bgcolor: 'var(--brand-teal)', color: 'var(--brand-white)' }}>
          {`تم بنجاح! إضافة ${createdInfo?.count} سؤال إلى الامتحان.`}
        </Alert>
      </Snackbar>

      {error && (
        <Alert severity="error" variant="outlined" sx={{ mt: 3, borderRadius: 2, borderColor: 'var(--neutral-400)', color: 'var(--brand-dark)' }}>
          {error}
        </Alert>
      )}
    </Container>
  );
}
