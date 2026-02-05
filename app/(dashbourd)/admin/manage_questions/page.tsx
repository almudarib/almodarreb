'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Alert,
  Box,
  Container,
  Stack,
  Typography,
  Chip,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Snackbar,
} from '@mui/material';
import { ExpandMore, EditOutlined, DeleteOutline, ImageOutlined } from '@mui/icons-material';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Input,
  Modal,
  DeleteWarning,
  Form,
  Table,
} from '@/components/ui';
import {
  listExamGroups,
  listExams,
  listExamQuestions,
  type ExamGroupRecord,
  type ExamRecord,
  type QuestionRecord,
  updateExamQuestion,
  deleteExamQuestion,
} from '@/app/actions/exam';

type EditableQuestion = {
  id: number;
  exam_id: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
  image_url: string | null;
};

function EditQuestionModal({
  open,
  onClose,
  question,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  question: EditableQuestion | null;
  onSaved: (notice?: { warnings?: string[]; message?: string }) => void;
}) {
  const [text, setText] = React.useState('');
  const [a, setA] = React.useState('');
  const [b, setB] = React.useState('');
  const [c, setC] = React.useState('');
  const [d, setD] = React.useState('');
  const [correct, setCorrect] = React.useState<'A' | 'B' | 'C' | 'D'>('A');
  const [imageChoice, setImageChoice] = React.useState<
    { mode: 'keep' } | { mode: 'remove' } | { mode: 'url'; url: string } | { mode: 'upload'; base64: string; filename: string; contentType: string }
  >({ mode: 'keep' });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = React.useState(0);
  const [warning, setWarning] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!question || !open) return;
    setText(question.question);
    setA(question.option_a);
    setB(question.option_b);
    setC(question.option_c);
    setD(question.option_d);
    setCorrect(question.correct_option);
    setImageChoice({ mode: 'keep' });
    setError(null);
    setWarning(null);
    setFileInputKey((k) => k + 1);
  }, [question, open]);

  function handleFileChange(file: File | null) {
    if (!file) {
      setImageChoice({ mode: 'keep' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes('base64,') ? (result.split('base64,').pop() as string) : result;
      setImageChoice({
        mode: 'upload',
        base64,
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
      });
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    if (!question) return;
    setSaving(true);
    setError(null);
    setWarning(null);
    try {
      console.log('edit-question:start', { id: question.id, oldImageUrl: question.image_url });
      const payload: Record<string, unknown> = {
        id: question.id,
        question: String(text).trim(),
        option_a: String(a).trim(),
        option_b: String(b).trim(),
        option_c: String(c).trim(),
        option_d: String(d).trim(),
        correct_option: correct,
      };
      if (imageChoice.mode === 'remove') {
        payload.image = { remove: true };
      } else if (imageChoice.mode === 'url') {
        payload.image = { url: imageChoice.url };
      } else if (imageChoice.mode === 'upload') {
        payload.image = {
          base64: imageChoice.base64,
          filename: imageChoice.filename,
          contentType: imageChoice.contentType,
        };
      }
      const res = await updateExamQuestion(payload as any);
      if (res.ok) {
        if ((res as any).warnings && Array.isArray((res as any).warnings) && (res as any).warnings.length > 0) {
          const msg = (res as any).warnings.join('، ');
          setWarning(msg);
          console.log('edit-question:warning', { id: question.id, warnings: (res as any).warnings });
          onSaved({ warnings: (res as any).warnings, message: 'تم حفظ التعديلات مع تحذير' });
        } else {
          console.log('edit-question:success', { id: question.id });
          onSaved({ message: 'تم حفظ التعديلات بنجاح' });
        }
      } else {
        setError(res.error);
        console.error('edit-question:error', { id: question.id, error: res.error });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف');
      console.error('edit-question:exception', { id: question?.id, error: err });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تعديل السؤال"
      submitText={saving ? 'جاري الحفظ...' : 'حفظ'}
      cancelText="إلغاء"
      onSubmit={handleSubmit}
      onCancel={onClose}
      fullWidth
      maxWidth="md"
    >
      {!question ? null : (
        <Box>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {!error && warning && <Alert severity="warning" sx={{ mb: 2 }}>{warning}</Alert>}
          <Stack spacing={2}>
            <Input label="نص السؤال" multiline minRows={2} value={text} onChange={(e) => setText(e.target.value)} fullWidth />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <Input label="الخيار A" value={a} onChange={(e) => setA(e.target.value)} fullWidth />
              <Input label="الخيار B" value={b} onChange={(e) => setB(e.target.value)} fullWidth />
              <Input label="الخيار C" value={c} onChange={(e) => setC(e.target.value)} fullWidth />
              <Input label="الخيار D" value={d} onChange={(e) => setD(e.target.value)} fullWidth />
            </Box>
            <Input
              label="الإجابة الصحيحة"
              select
              value={correct}
              onChange={(e) => setCorrect(e.target.value as 'A' | 'B' | 'C' | 'D')}
              fullWidth
            >
              <MenuItem value="A">A</MenuItem>
              <MenuItem value="B">B</MenuItem>
              <MenuItem value="C">C</MenuItem>
              <MenuItem value="D">D</MenuItem>
            </Input>
            <Stack spacing={1}>
              <Typography variant="body2">إدارة الصورة</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button variant={imageChoice.mode === 'keep' ? 'contained' : 'outlined'} onClick={() => setImageChoice({ mode: 'keep' })}>
                  إبقاء الحالية
                </Button>
                <Button variant={imageChoice.mode === 'remove' ? 'contained' : 'outlined'} onClick={() => setImageChoice({ mode: 'remove' })} color="error">
                  إزالة
                </Button>
                <Button
                  variant={imageChoice.mode === 'url' ? 'contained' : 'outlined'}
                  onClick={() => setImageChoice({ mode: 'url', url: '' })}
                >
                  رابط صورة
                </Button>
                <label>
                  <input key={fileInputKey} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileChange(e.target.files?.[0] || null)} />
                  <Button component="span" variant={imageChoice.mode === 'upload' ? 'contained' : 'outlined'} startIcon={<ImageOutlined />}>
                    رفع صورة
                  </Button>
                </label>
              </Stack>
              {imageChoice.mode === 'url' && (
                <Input label="الرابط" value={(imageChoice as any).url ?? ''} onChange={(e) => setImageChoice({ mode: 'url', url: e.target.value })} fullWidth />
              )}
              {question.image_url && imageChoice.mode === 'keep' && (
                <Box sx={{ mt: 1, width: 160, height: 100, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                  <img src={question.image_url} alt="question" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
              )}
            </Stack>
          </Stack>
        </Box>
      )}
    </Modal>
  );
}

export default function ManageQuestionsPage() {
  const [groups, setGroups] = React.useState<ExamGroupRecord[]>([]);
  const [examsByGroup, setExamsByGroup] = React.useState<Map<number, ExamRecord[]>>(new Map());
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [snack, setSnack] = React.useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({ open: false, message: '', severity: 'success' });

  const [questionsByExam, setQuestionsByExam] = React.useState<Map<number, QuestionRecord[]>>(new Map());
  const [loadingQuestions, setLoadingQuestions] = React.useState<Map<number, boolean>>(new Map());
  const [selectedQuestion, setSelectedQuestion] = React.useState<EditableQuestion | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const g = await listExamGroups();
      if (!g.ok) {
        setError(g.error);
        setGroups([]);
        setExamsByGroup(new Map());
        return;
      }
      setGroups(g.groups);
      const e = await listExams({ sort_by: 'created_at', sort_dir: 'desc', page: 1, per_page: 500 });
      if (!e.ok) {
        setError(e.error);
        setExamsByGroup(new Map());
        return;
      }
      const byGroup = new Map<number, ExamRecord[]>();
      for (const ex of e.exams) {
        const list = byGroup.get(ex.group_id) ?? [];
        list.push(ex);
        byGroup.set(ex.group_id, list);
      }
      setExamsByGroup(byGroup);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف');
      setGroups([]);
      setExamsByGroup(new Map());
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  async function ensureExamQuestionsLoaded(examId: number, force: boolean = false) {
    const current = questionsByExam.get(examId);
    if (!force && current && current.length > 0) return;
    setLoadingQuestions((m) => new Map(m).set(examId, true));
    try {
      const res = await listExamQuestions(examId);
      if (res.ok) {
        setQuestionsByExam((m) => new Map(m).set(examId, res.questions));
      }
    } finally {
      setLoadingQuestions((m) => new Map(m).set(examId, false));
    }
  }

  function handleEdit(q: QuestionRecord) {
    setSelectedQuestion({
      id: q.id,
      exam_id: q.exam_id,
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_option: q.correct_option,
      image_url: q.image_url,
    });
    setEditOpen(true);
  }

  function handleDelete(q: QuestionRecord) {
    setSelectedQuestion({
      id: q.id,
      exam_id: q.exam_id,
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_option: q.correct_option,
      image_url: q.image_url,
    });
    setDeleteError(null);
    setDeleteOpen(true);
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }} dir="rtl">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--brand-dark)' }}>إدارة الأسئلة</Typography>
          <Typography variant="body2" sx={{ color: 'var(--neutral-700)', mt: 0.5 }}>
            استعرض المجموعات والامتحانات وعدّل أو احذف الأسئلة
          </Typography>
        </Box>
        <Button component={Link} href="/admin/questions" variant="outlined">
          إضافة أسئلة يدوياً
        </Button>
      </Stack>

      <Card elevation={1}>
        <CardHeader title="المجموعات" />
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {loading ? (
            <Typography>جاري التحميل...</Typography>
          ) : groups.length === 0 ? (
            <Typography>لا توجد مجموعات</Typography>
          ) : (
            <Stack spacing={2}>
              {groups.map((g) => {
                const exams = examsByGroup.get(g.id) ?? [];
                return (
                  <Accordion key={g.id}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography sx={{ fontWeight: 700 }}>{g.title}</Typography>
                        <Chip label={g.language === 'ar' ? 'العربية' : g.language === 'tr' ? 'التركية' : 'الإنجليزية'} size="small" />
                        <Chip label={g.is_active ? 'نشطة' : 'غير نشطة'} size="small" />
                        <Chip label={`${exams.length} امتحان`} size="small" />
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      {exams.length === 0 ? (
                        <Typography sx={{ color: 'text.secondary' }}>لا توجد امتحانات ضمن هذه المجموعة</Typography>
                      ) : (
                        <Stack spacing={2}>
                          {exams.map((ex) => {
                            const qs = questionsByExam.get(ex.id) ?? [];
                            const isLoading = (loadingQuestions.get(ex.id) ?? false) === true;
                            return (
                              <Card key={ex.id} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                                <CardHeader title={ex.title} />
                                <CardContent>
                                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                    <Chip label={`${qs.length} سؤال`} size="small" />
                                    <Button variant="outlined" onClick={() => ensureExamQuestionsLoaded(ex.id)}>
                                      تحميل الأسئلة
                                    </Button>
                                  </Stack>
                                  {isLoading ? (
                                    <Typography>جاري التحميل...</Typography>
                                  ) : qs.length === 0 ? (
                                    <Typography sx={{ color: 'text.secondary' }}>لا توجد أسئلة</Typography>
                                  ) : (
                                    <Table
                                      columns={[
                                        { id: 'id', label: '#' },
                                        { id: 'question', label: 'السؤال' },
                                        {
                                          id: 'correct',
                                          label: 'الصحيح',
                                          render: (q: QuestionRecord) => q.correct_option,
                                        },
                                        {
                                          id: 'image',
                                          label: 'صورة',
                                          render: (q: QuestionRecord) =>
                                            q.image_url ? (
                                              <IconButton href={q.image_url} target="_blank" rel="noopener noreferrer">
                                                <ImageOutlined />
                                              </IconButton>
                                            ) : (
                                              '-'
                                            ),
                                        },
                                        {
                                          id: 'actions',
                                          label: 'إجراء',
                                          align: 'right',
                                          render: (q: QuestionRecord) => (
                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                              <Button variant="outlined" onClick={() => handleEdit(q)}>
                                                <EditOutlined fontSize="small" />
                                              </Button>
                                              <Button variant="outlined" color="error" onClick={() => handleDelete(q)}>
                                                <DeleteOutline fontSize="small" />
                                              </Button>
                                            </Stack>
                                          ),
                                        },
                                      ]}
                                      data={qs}
                                      getRowId={(q) => q.id}
                                    />
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </Stack>
                      )}
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>

      <EditQuestionModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        question={selectedQuestion}
        onSaved={async (notice) => {
          setEditOpen(false);
          if (selectedQuestion) {
            await ensureExamQuestionsLoaded(selectedQuestion.exam_id, true);
          }
          if (notice?.warnings && notice.warnings.length > 0) {
            setSnack({ open: true, message: notice.warnings.join('، '), severity: 'warning' });
          } else if (notice?.message) {
            setSnack({ open: true, message: notice.message, severity: 'success' });
          } else {
            setSnack({ open: true, message: 'تم حفظ التعديلات بنجاح', severity: 'success' });
          }
        }}
      />

      <DeleteWarning
        open={deleteOpen}
        onCancel={() => {
          setDeleteOpen(false);
          setDeleteError(null);
        }}
        onConfirm={async () => {
          if (!selectedQuestion) return;
          const res = await deleteExamQuestion(selectedQuestion.id);
          if (res.ok) {
            setDeleteOpen(false);
            setDeleteError(null);
            await ensureExamQuestionsLoaded(selectedQuestion.exam_id, true);
            setSnack({ open: true, message: 'تم حذف السؤال بنجاح', severity: 'success' });
          } else {
            setDeleteError(res.error);
            setSnack({ open: true, message: res.error, severity: 'error' });
          }
        }}
        title="تأكيد حذف السؤال"
        entityName={selectedQuestion?.question}
        impacts={['حذف السؤال من الامتحان']}
        confirmText="تأكيد المسح"
        dangerNote={deleteError ?? undefined}
      />
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        message={snack.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Container>
  );
}
