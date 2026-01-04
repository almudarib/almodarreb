'use client';
import * as React from 'react';
import {
  Alert,
  Box,
  Chip,
  Container,
  MenuItem,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { Input, Card, CardHeader, CardContent, CardActions, Button, Form, Table } from '@/components/ui';
import { addExamQuestion, listExams, type ExamRecord } from '@/app/actions/exam';

type Lang = 'AR' | 'EN';
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
  const [languageFilter, setLanguageFilter] = React.useState<'all' | Lang>('all');

  const [questions, setQuestions] = React.useState<UIQuestion[]>([]);

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successOpen, setSuccessOpen] = React.useState(false);
  const [createdInfo, setCreatedInfo] = React.useState<{ examId: number; count: number } | null>(null);

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [exams, setExams] = React.useState<ExamRecord[]>([]);
  const [loadingExams, setLoadingExams] = React.useState(false);

  const loadExams = React.useCallback(async () => {
    setLoadingExams(true);
    try {
      const res = await listExams({
        language: languageFilter === 'all' ? undefined : languageFilter,
        sort_by: 'created_at',
        sort_dir: 'desc',
        page: 1,
        per_page: 200,
      });
      if (!res.ok) {
        setError(res.error);
        setExams([]);
        return;
      }
      setExams(res.exams);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف');
      setExams([]);
    } finally {
      setLoadingExams(false);
    }
  }, [languageFilter]);

  React.useEffect(() => {
    loadExams();
  }, [loadExams]);

  function addQuestion() {
    setQuestions((qs) => [
      ...qs,
      {
        question: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_option: '',
      },
    ]);
  }
  function removeQuestion(index: number) {
    setQuestions((qs) => qs.filter((_, i) => i !== index));
  }
  function updateQuestion<K extends keyof UIQuestion>(index: number, key: K, value: UIQuestion[K]) {
    setQuestions((qs) =>
      qs.map((q, i) => (i === index ? { ...q, [key]: value } : q)),
    );
  }
  function handleFileChange(index: number, file: File | null) {
    if (!file) {
      updateQuestion(index, 'image_file', undefined);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes('base64,') ? result.split('base64,').pop() as string : result;
      updateQuestion(index, 'image_file', {
        base64,
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
      });
    };
    reader.readAsDataURL(file);
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (selectedExamId === '' || Number(selectedExamId) <= 0) errs.exam = 'اختر الامتحان أولًا';
    if (questions.length === 0) errs.questions = 'أضف سؤالًا واحدًا على الأقل';
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return false;
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
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const examId = Number(selectedExamId);
      let count = 0;
      for (const q of questions) {
        const image =
          q.image_file
            ? { base64: q.image_file.base64, filename: q.image_file.filename, contentType: q.image_file.contentType }
            : undefined;
        const res = await addExamQuestion({
          exam_id: examId,
          question: q.question.trim(),
          option_a: q.option_a.trim(),
          option_b: q.option_b.trim(),
          option_c: q.option_c.trim(),
          option_d: q.option_d.trim(),
          correct_option: q.correct_option as Correct,
          image,
        });
        if (!res.ok) {
          setError(res.error);
          setSubmitting(false);
          return;
        }
        count += 1;
      }
      setCreatedInfo({ examId, count });
      setSuccessOpen(true);
      setSelectedExamId('');
      setQuestions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }} dir="rtl">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--brand-dark)' }}>
            إدارة أسئلة الامتحانات
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--neutral-700)', mt: 0.5 }}>
            اختيار الامتحان وإضافة أسئلة جديدة يدويًا
          </Typography>
        </Box>
        <Chip label="exam_questions" sx={{ bgcolor: 'var(--neutral-200)', fontWeight: 600 }} />
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card elevation={1} sx={{ mb: 3 }}>
        <CardHeader title="اختيار الامتحان وإدخال الأسئلة" />
        <CardContent>
          <Form onSubmit={handleSubmit}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 2,
              }}
            >
              <Box>
                <Input
                  label="تصفية اللغة"
                  select
                  aria-label="تصفية لغة الامتحانات"
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value as 'all' | Lang)}
                  fullWidth
                >
                  <MenuItem value="all">الكل</MenuItem>
                  <MenuItem value="AR">AR</MenuItem>
                  <MenuItem value="EN">EN</MenuItem>
                </Input>
              </Box>
              <Box>
                <Input
                  label="اختر الامتحان"
                  select
                  aria-label="اختيار الامتحان"
                  value={selectedExamId}
                  onChange={(e) =>
                    setSelectedExamId(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  fullWidth
                  error={!!fieldErrors.exam}
                  helperText={fieldErrors.exam}
                >
                  <MenuItem value="">
                    {loadingExams ? 'جاري التحميل...' : '— اختر —'}
                  </MenuItem>
                  {exams.map((ex) => (
                    <MenuItem key={ex.id} value={ex.id}>
                      {ex.title} ({String(ex.language).toUpperCase()}) - {ex.duration_minutes} دقيقة
                    </MenuItem>
                  ))}
                </Input>
              </Box>
            </Box>

            <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
              إدخال الأسئلة
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
              <Button variant="outlined" onClick={addQuestion}>
                إضافة سؤال يدويًا
              </Button>
            </Stack>

            <Box sx={{ mt: 1 }}>
              <Table
                columns={[
                  {
                    id: 'editor',
                    label: 'السؤال',
                    render: (row: UIQuestion) => {
                      const idx = questions.indexOf(row);
                      return (
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1, p: 1 }}>
                          <Input
                            label="نص السؤال"
                            multiline
                            minRows={4}
                            aria-label="نص السؤال"
                            value={row.question}
                            onChange={(e) => idx >= 0 && updateQuestion(idx, 'question', e.target.value)}
                          />
                          <Input
                            label="A"
                            multiline
                            minRows={2}
                            aria-label="الخيار A"
                            value={row.option_a}
                            onChange={(e) => idx >= 0 && updateQuestion(idx, 'option_a', e.target.value)}
                          />
                          <Input
                            label="B"
                            multiline
                            minRows={2}
                            aria-label="الخيار B"
                            value={row.option_b}
                            onChange={(e) => idx >= 0 && updateQuestion(idx, 'option_b', e.target.value)}
                          />
                          <Input
                            label="C"
                            multiline
                            minRows={2}
                            aria-label="الخيار C"
                            value={row.option_c}
                            onChange={(e) => idx >= 0 && updateQuestion(idx, 'option_c', e.target.value)}
                          />
                          <Input
                            label="D"
                            multiline
                            minRows={2}
                            aria-label="الخيار D"
                            value={row.option_d}
                            onChange={(e) => idx >= 0 && updateQuestion(idx, 'option_d', e.target.value)}
                          />
                          <Input
                            label="الخيار الصحيح"
                            select
                            aria-label="الخيار الصحيح"
                            value={row.correct_option ?? ''}
                            onChange={(e) => idx >= 0 && updateQuestion(idx, 'correct_option', e.target.value as Correct)}
                          >
                            <MenuItem value="A">A</MenuItem>
                            <MenuItem value="B">B</MenuItem>
                            <MenuItem value="C">C</MenuItem>
                            <MenuItem value="D">D</MenuItem>
                          </Input>
                          <Box>
                            <input
                              type="file"
                              accept="image/*"
                              aria-label="صورة السؤال (اختياري)"
                              onChange={(ev) => {
                                const f = ev.currentTarget.files && ev.currentTarget.files[0] ? ev.currentTarget.files[0] : null;
                                if (idx >= 0) handleFileChange(idx, f);
                              }}
                            />
                          </Box>
                        </Box>
                      );
                    },
                  },
                  {
                    id: 'actions',
                    label: 'إجراء',
                    align: 'right',
                    render: (row: UIQuestion) => {
                      const idx = questions.indexOf(row);
                      return (
                        <Button color="error" size="small" onClick={() => idx >= 0 && removeQuestion(idx)}>
                          حذف
                        </Button>
                      );
                    },
                  },
                ]}
                data={questions}
                emptyText="لا توجد أسئلة بعد"
                getRowId={(_, idx) => idx}
              />
            </Box>

            <CardActions sx={{ mt: 2, justifyContent: 'flex-end' }}>
              <Button type="submit" variant="contained" loading={submitting}>
                إضافة الأسئلة إلى الامتحان
              </Button>
            </CardActions>
          </Form>

          <Snackbar
            open={successOpen}
            autoHideDuration={4000}
            onClose={() => setSuccessOpen(false)}
            message={
              createdInfo
                ? `تمت إضافة ${createdInfo.count} سؤالًا إلى الامتحان رقم ${createdInfo.examId}`
                : 'تم التنفيذ بنجاح'
            }
          />
        </CardContent>
      </Card>
    </Container>
  );
}

