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
  Divider,
} from '@mui/material';
import {
  ExpandMore,
  EditOutlined,
  DeleteOutline,
  ImageOutlined,
} from '@mui/icons-material';

import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Input,
  Modal,
  DeleteWarning,
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

import ExportQuestionsExcel from './ExportQuestionsExcel';

/* ------------------------------------------------------------------ */
/* Edit Question Modal */
/* ------------------------------------------------------------------ */

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
  onSaved: () => void;
}) {
  const [state, setState] = React.useState<EditableQuestion | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open && question) {
      setState(question);
      setError(null);
    }
  }, [open, question]);

  async function handleSubmit() {
    if (!state) return;
    setSaving(true);
    setError(null);

    const res = await updateExamQuestion(state as any);

    if (res.ok) {
      onSaved();
    } else {
      setError(res.error);
    }

    setSaving(false);
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
      {!state ? null : (
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}

          <Typography fontWeight={700}>نص السؤال</Typography>
          <Input
            multiline
            minRows={2}
            value={state.question}
            onChange={(e) =>
              setState({ ...state, question: e.target.value })
            }
          />

          <Divider />

          <Typography fontWeight={700}>الخيارات</Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 2,
            }}
          >
            <Input label="A" value={state.option_a} onChange={(e) => setState({ ...state, option_a: e.target.value })} />
            <Input label="B" value={state.option_b} onChange={(e) => setState({ ...state, option_b: e.target.value })} />
            <Input label="C" value={state.option_c} onChange={(e) => setState({ ...state, option_c: e.target.value })} />
            <Input label="D" value={state.option_d} onChange={(e) => setState({ ...state, option_d: e.target.value })} />
          </Box>

          <Input
            select
            label="الإجابة الصحيحة"
            value={state.correct_option}
            onChange={(e) =>
              setState({
                ...state,
                correct_option: e.target.value as any,
              })
            }
          >
            {['A', 'B', 'C', 'D'].map((o) => (
              <MenuItem key={o} value={o}>
                {o}
              </MenuItem>
            ))}
          </Input>
        </Stack>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Page */
/* ------------------------------------------------------------------ */

export default function ManageQuestionsPage() {
  const [groups, setGroups] = React.useState<ExamGroupRecord[]>([]);
  const [examsByGroup, setExamsByGroup] = React.useState<Map<number, ExamRecord[]>>(new Map());
  const [questionsByExam, setQuestionsByExam] = React.useState<Map<number, QuestionRecord[]>>(new Map());
  const [loadingExam, setLoadingExam] = React.useState<Map<number, boolean>>(new Map());

  const [editQ, setEditQ] = React.useState<EditableQuestion | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);

  const [deleteQ, setDeleteQ] = React.useState<EditableQuestion | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const [snack, setSnack] = React.useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning',
  });

  React.useEffect(() => {
    (async () => {
      const g = await listExamGroups();
      const e = await listExams({ page: 1, per_page: 500 });

      if (g.ok) setGroups(g.groups);

      if (e.ok) {
        const map = new Map<number, ExamRecord[]>();
        e.exams.forEach((ex) => {
          const arr = map.get(ex.group_id) ?? [];
          arr.push(ex);
          map.set(ex.group_id, arr);
        });
        setExamsByGroup(map);
      }
    })();
  }, []);

  async function loadQuestions(examId: number) {
    setLoadingExam((m) => new Map(m).set(examId, true));
    const res = await listExamQuestions(examId);
    if (res.ok) {
      setQuestionsByExam((m) => new Map(m).set(examId, res.questions));
    }
    setLoadingExam((m) => new Map(m).set(examId, false));
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }} dir="rtl">
      {/* Header */}
      <Stack spacing={1} sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800}>
          إدارة الأسئلة
        </Typography>
        <Typography variant="body2" color="text.secondary">
          إدارة المجموعات، الامتحانات، وأسئلة الاختيار المتعدد
        </Typography>
      </Stack>

      <Card>
        <CardHeader title="المجموعات" />
        <CardContent>
          <ExportQuestionsExcel
            groups={groups}
            examsByGroup={examsByGroup}
            onNotice={(m, s) =>
              setSnack({ open: true, message: m, severity: s })
            }
          />

          <Stack spacing={2}>
            {groups.map((g) => {
              const exams = examsByGroup.get(g.id) ?? [];
              return (
                <Accordion
                  key={g.id}
                  disableGutters
                  elevation={0}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    '&:before': { display: 'none' },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Typography fontWeight={700}>{g.title}</Typography>
                      <Chip size="small" label={g.language} />
                      <Chip size="small" label={`${exams.length} امتحان`} />
                    </Stack>
                  </AccordionSummary>

                  <AccordionDetails>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                        gap: 2,
                      }}
                    >
                      {exams.map((ex) => {
                        const qs = questionsByExam.get(ex.id) ?? [];

                        // ✅ ترتيب الأسئلة من 1 → n لكل امتحان
                        const orderedQuestions = qs.map((q, index) => ({
                          ...q,
                          _order: index + 1,
                        }));

                        return (
                          <Card key={ex.id} variant="outlined">
                            <CardContent>
                              <Typography fontWeight={700}>{ex.title}</Typography>

                              {/* زر عرض الأسئلة فقط (بدون 0 سؤال) */}
                              <Button
                                size="small"
                                variant="contained"
                                sx={{ my: 1 }}
                                onClick={() => loadQuestions(ex.id)}
                              >
                                عرض الأسئلة
                              </Button>

                              {orderedQuestions.length > 0 && (
                                <Table
                                  columns={[
                                    {
                                      id: 'order',
                                      label: '#',
                                      align: 'center',
                                      render: (q: any) => q._order,
                                    },
                                    {
                                      id: 'question',
                                      label: 'السؤال',
                                      render: (q) => (
                                        <Typography noWrap maxWidth={220}>
                                          {q.question}
                                        </Typography>
                                      ),
                                    },
                                    {
                                      id: 'correct',
                                      label: 'الصحيح',
                                      render: (q) => q.correct_option,
                                    },
                                    {
                                      id: 'image',
                                      label: 'صورة',
                                      render: (q) =>
                                        q.image_url ? (
                                          <IconButton href={q.image_url} target="_blank">
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
                                      sx: { width: 96, whiteSpace: 'nowrap' },
                                      render: (q) => (
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', minWidth: 80 }}>
                                          <Stack direction="row" spacing={1}>
                                            <IconButton
                                              size="small"
                                              color="primary"
                                              onClick={() => {
                                                setEditQ(q as any);
                                                setEditOpen(true);
                                              }}
                                            >
                                              <EditOutlined fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                              size="small"
                                              color="error"
                                              onClick={() => {
                                                setDeleteQ(q as any);
                                                setDeleteOpen(true);
                                              }}
                                            >
                                              <DeleteOutline fontSize="small" />
                                            </IconButton>
                                          </Stack>
                                        </Box>
                                      ),
                                    },
                                  ]}
                                  data={orderedQuestions}
                                  getRowId={(q) => q.id}
                                />
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>
        </CardContent>
      </Card>

      {/* Modals */}
      <EditQuestionModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        question={editQ}
        onSaved={() => {
          setEditOpen(false);
          setSnack({
            open: true,
            message: 'تم تحديث السؤال بنجاح',
            severity: 'success',
          });
        }}
      />

      <DeleteWarning
        open={deleteOpen}
        title="تأكيد حذف السؤال"
        entityName={deleteQ?.question}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={async () => {
          if (!deleteQ) return;
          const res = await deleteExamQuestion(deleteQ.id);
          if (res.ok) {
            setSnack({
              open: true,
              message: 'تم حذف السؤال بنجاح',
              severity: 'success',
            });
            setQuestionsByExam((prev) => {
              const m = new Map(prev);
              const arr = m.get(deleteQ.exam_id) ?? [];
              const next = arr.filter((q) => q.id !== deleteQ.id);
              m.set(deleteQ.exam_id, next);
              return m;
            });
            setDeleteOpen(false);
            setDeleteQ(null);
          } else {
            setSnack({
              open: true,
              message: 'فشل حذف السؤال',
              severity: 'error',
            });
          }
        }}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        message={snack.message}
      />
    </Container>
  );
}
