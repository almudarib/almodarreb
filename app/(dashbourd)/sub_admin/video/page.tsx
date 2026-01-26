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
  IconButton,
  Pagination,
  LinearProgress,
} from '@mui/material';
import { Input, Card, CardHeader, CardContent, CardActions, Button, Modal, Form, Table, DeleteWarning } from '@/components/ui';
import {
  listSessions,
  createSession,
  updateSession,
  deleteSession,
  createUploadTarget,
  finalizeUpload,
  type ListSessionsQuery,
  type SessionRecord,
} from '@/app/actions/video';
import { Search, EditOutlined, DeleteOutline } from '@mui/icons-material';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';

type Lang = 'AR' | 'EN';
type Kind = 'video' | 'file';

function buildTusEndpoint(url: string) {
  const base = String(url ?? '').trim().replace(/[,\s]+$/, '').replace(/\/+$/, '');
  return `${base}/storage/v1/upload/resumable`;
}

async function uploadFileResumableTus(file: File, onProgress?: (p: number) => void): Promise<{ ok: true; ref: string } | { ok: false; error: string }> {
  try {
    const target = await createUploadTarget({
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      kind: (file.type || '').startsWith('video') ? 'video' : 'file',
      upsert: false,
    });
    if (!target.ok) {
      return { ok: false, error: target.error };
    }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const endpoint = buildTusEndpoint(supabaseUrl);
    let tusModule: { Upload: new (
      file: File,
      options: {
        endpoint: string;
        retryDelays?: number[];
        chunkSize?: number;
        metadata?: Record<string, string>;
        headers?: Record<string, string>;
        removeFingerprintOnSuccess?: boolean;
        uploadDataDuringCreation?: boolean;
        onError?: (err: Error) => void;
        onProgress?: (bytesSent: number, bytesTotal: number) => void;
        onSuccess?: () => void;
      },
    ) => { start: () => void } } | null = null;
    try {
      tusModule = (await import('tus-js-client')) as {
        Upload: new (
          file: File,
          options: {
            endpoint: string;
            retryDelays?: number[];
            chunkSize?: number;
            metadata?: Record<string, string>;
            headers?: Record<string, string>;
            removeFingerprintOnSuccess?: boolean;
            uploadDataDuringCreation?: boolean;
            onError?: (err: Error) => void;
            onProgress?: (bytesSent: number, bytesTotal: number) => void;
            onSuccess?: () => void;
          },
        ) => { start: () => void };
      };
    } catch {
      tusModule = null;
    }
    if (!tusModule) {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', (target as any).signedUrl);
        xhr.setRequestHeader('Authorization', `Bearer ${(target as any).token}`);
        xhr.setRequestHeader('x-upsert', 'false');
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable && typeof onProgress === 'function') {
            const pct = Math.max(0, Math.min(100, Math.round((ev.loaded / ev.total) * 100)));
            try {
              onProgress(pct);
            } catch {}
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed with status ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error('Network error while uploading'));
        xhr.send(file);
      });
      return { ok: true, ref: (target as any).ref as string };
    }
    const Upload = tusModule.Upload;
    await new Promise<void>((resolve, reject) => {
      const upload = new Upload(file, {
        endpoint,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        chunkSize: 6 * 1024 * 1024,
        metadata: {
          bucketName: target.bucket,
          objectName: target.path,
          contentType: file.type || 'application/octet-stream',
        },
        headers: {
          'x-signature': target.token,
          'x-upsert': 'false',
        },
        removeFingerprintOnSuccess: true,
        uploadDataDuringCreation: true,
        onError(err: unknown) {
          reject(err instanceof Error ? err : new Error('فشل الرفع القابل للاستئناف'));
        },
        onProgress(bytesSent: number, bytesTotal: number) {
          if (typeof onProgress === 'function' && bytesTotal > 0) {
            const pct = Math.max(0, Math.min(100, Math.round((bytesSent / bytesTotal) * 100)));
            try {
              onProgress(pct);
            } catch {}
          }
        },
        onSuccess() {
          resolve();
        },
      });
      upload.start();
    });
    return { ok: true, ref: target.ref };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'فشل الرفع القابل للاستئناف' };
  }
}

async function uploadFileSmart(file: File, onProgress?: (p: number) => void): Promise<{ ok: true; ref: string } | { ok: false; error: string }> {
  const isVideo =
    (file.type || '').startsWith('video') ||
    ['.mp4', '.avi', '.mov', '.webm', '.mkv', '.mpg', '.mpeg'].some((e) => file.name.toLowerCase().endsWith(e));
  const useResumable = isVideo && file.size >= 50 * 1024 * 1024;
  if (useResumable) {
    return await uploadFileResumableTus(file, onProgress);
  }
  return await uploadFileDirect(file, onProgress);
}

function isYouTubeUrl(u: string): boolean {
  const s = String(u ?? '').trim().toLowerCase();
  return s.startsWith('http://') || s.startsWith('https://')
    ? s.includes('youtube.com/') || s.includes('youtu.be/')
    : false;
}

function guessExt(name: string, type: string): string {
  const lower = String(name ?? '').toLowerCase();
  const idx = lower.lastIndexOf('.');
  if (idx !== -1 && idx < lower.length - 1) {
    const e = lower.slice(idx + 1);
    if (e.length <= 10) return e;
  }
  const m: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/x-matroska': 'mkv',
    'video/x-msvideo': 'avi',
    'video/quicktime': 'mov',
    'video/mpeg': 'mpeg',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  };
  const key = String(type ?? '').toLowerCase();
  return m[key] ?? 'bin';
}
async function uploadFileDirect(file: File, onProgress?: (p: number) => void): Promise<{ ok: true; ref: string } | { ok: false; error: string }> {
  try {
    const supabase = createSupabaseClient();
    const bucket = 'session-videos';
    const stamp = Date.now();
    const rand = Math.random().toString(36).slice(2);
    const ext = guessExt(file.name, file.type || 'application/octet-stream');
    const folder = `sessions/${new Date().getUTCFullYear()}/${String(new Date().getUTCMonth() + 1).padStart(2, '0')}/${String(new Date().getUTCDate()).padStart(2, '0')}`;
    const path = `${folder}/${stamp}_${rand.slice(0,6)}.${ext}`;
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data?.signedUrl || !data?.token) {
      const up = await supabase.storage.from(bucket).upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });
      if (up.error) {
        return { ok: false, error: up.error.message };
      }
      return { ok: true, ref: `storage://${bucket}/${path}` };
    }
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', data.signedUrl);
      xhr.setRequestHeader('Authorization', `Bearer ${data.token}`);
      xhr.setRequestHeader('x-upsert', 'false');
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable && typeof onProgress === 'function') {
          const pct = Math.max(0, Math.min(100, Math.round((ev.loaded / ev.total) * 100)));
          try {
            onProgress(pct);
          } catch {}
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed with status ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error('Network error while uploading'));
      xhr.send(file);
    });
    return { ok: true, ref: `storage://${bucket}/${path}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'فشل رفع الملف' };
  }
}

function AddSessionForm({
  onCreated,
  formId,
}: {
  onCreated: () => void;
  formId?: string;
}) {
  const [title, setTitle] = React.useState('');
  const [language, setLanguage] = React.useState<Lang | ''>('');
  const [orderNumber, setOrderNumber] = React.useState<number | ''>('');
  const [isActive, setIsActive] = React.useState(true);
  const [mode, setMode] = React.useState<'url' | 'file'>('url');
  const [url, setUrl] = React.useState('');
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const [submitting, setSubmitting] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<number>(0);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [successOpen, setSuccessOpen] = React.useState(false);

  function validate() {
    const errs: Record<string, string> = {};
    if (!String(title).trim()) errs.title = 'العنوان مطلوب';
    if (!language) errs.language = 'اللغة مطلوبة';
    if (orderNumber !== '' && (!Number.isInteger(orderNumber) || (orderNumber as number) <= 0)) {
      errs.order_number = 'الترتيب يجب أن يكون عددًا موجبًا';
    }
    if (mode === 'url') {
      const u = String(url).trim();
      if (!u) errs.url = 'رابط المحتوى مطلوب';
      else {
        const okExt = ['.mp4', '.avi', '.mov', '.webm', '.mkv', '.mpg', '.mpeg'].some((e) => u.toLowerCase().endsWith(e));
        if (!okExt && !isYouTubeUrl(u)) {
          errs.url = 'الرابط يجب أن يكون لفيديو مدعوم أو يوتيوب';
        }
      }
    } else {
      if (!selectedFile) errs.file = 'يرجى اختيار ملف';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      let finalUrl = '';
      if (mode === 'url') {
        finalUrl = url.trim();
      } else {
        const f = selectedFile!;
        const isVideo = (f.type || '').startsWith('video') || ['.mp4', '.avi', '.mov', '.webm', '.mkv', '.mpg', '.mpeg'].some((e) => f.name.toLowerCase().endsWith(e));
        const sizeLimit = isVideo ? 5 * 1024 * 1024 * 1024 : 200 * 1024 * 1024;
        if (f.size > sizeLimit) {
          setFieldErrors((prev) => ({ ...prev, file: isVideo ? 'حجم الفيديو يتجاوز 500MB' : 'حجم الملف يتجاوز 50MB' }));
          setSubmitting(false);
          return;
        }
        setUploading(true);
        setUploadProgress(0);
        const resUp = await uploadFileSmart(f, (p) => setUploadProgress(p));
        setUploading(false);
        setUploadProgress(100);
        if (!resUp.ok) {
          setError(resUp.error);
          setSubmitting(false);
          return;
        }
        finalUrl = resUp.ref;
        try {
          await finalizeUpload({
            ref: finalUrl,
            kind: isVideo ? 'video' : 'file',
            filename: f.name,
            contentType: f.type || 'application/octet-stream',
            sizeBytes: f.size,
          });
        } catch {}
      }
      const res = await createSession({
        title: title.trim(),
        language: language as Lang,
        order_number: orderNumber === '' ? undefined : Number(orderNumber),
        is_active: isActive,
        content: { url: finalUrl },
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccessOpen(true);
      setTitle('');
      setLanguage('');
      setOrderNumber('');
      setIsActive(true);
      setMode('url');
      setUrl('');
      setSelectedFile(null);
      setUploadProgress(0);
      setUploading(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card elevation={0}>
      <CardHeader title="إضافة فيديو / جلسة جديدة" />
      <CardContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Form id={formId} onSubmit={handleSubmit}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <Box>
              <Input
                label="عنوان الفيديو"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                fullWidth
                error={!!fieldErrors.title}
                helperText={fieldErrors.title}
              />
            </Box>
            <Box>
              <Input
                label="اللغة"
                select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Lang)}
                required
                fullWidth
                error={!!fieldErrors.language}
                helperText={fieldErrors.language}
              >
                <MenuItem value="AR">AR - العربية</MenuItem>
                <MenuItem value="EN">EN - الإنجليزية</MenuItem>
              </Input>
            </Box>
            <Box>
              <Input
                label="الترتيب"
                type="number"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value === '' ? '' : Number(e.target.value))}
                fullWidth
                error={!!fieldErrors.order_number}
                helperText={fieldErrors.order_number}
              />
            </Box>
            <Box>
              <Input
                label="الحالة"
                select
                value={isActive ? 'active' : 'inactive'}
                onChange={(e) => setIsActive((e.target.value as string) === 'active')}
                fullWidth
              >
                <MenuItem value="active">نشط</MenuItem>
                <MenuItem value="inactive">غير نشط</MenuItem>
              </Input>
            </Box>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" spacing={2}>
              <Button variant={mode === 'url' ? 'contained' : 'outlined'} onClick={() => setMode('url')}>
                استخدام رابط
              </Button>
              <Button variant={mode === 'file' ? 'contained' : 'outlined'} onClick={() => setMode('file')}>
                رفع ملف
              </Button>
            </Stack>
            {mode === 'url' ? (
              <Box sx={{ mt: 2 }}>
                <Input
                  label="رابط الفيديو / الملف"
                  placeholder="https://youtube.com/... أو رابط مباشر .mp4/.mov/.avi"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  fullWidth
                  error={!!fieldErrors.url}
                  helperText={fieldErrors.url}
                />
              </Box>
            ) : (
              <Box sx={{ mt: 2 }}>
                <input
                  type="file"
                  accept=".mp4,.avi,.mov,.webm,.mkv,.mpg,.mpeg,.pdf,.ppt,.pptx,.doc,.docx,video/mp4,video/webm,video/x-matroska,video/x-msvideo"
                  onChange={async (e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (!f) {
                      setSelectedFile(null);
                      return;
                    }
                    const isVideo = (f.type || '').startsWith('video');
                    const sizeLimit = isVideo ? 5 * 1024 * 1024 * 1024 : 200 * 1024 * 1024;
                    if (f.size > sizeLimit) {
                      setFieldErrors((prev) => ({ ...prev, file: isVideo ? 'حجم الفيديو يتجاوز 500MB' : 'حجم الملف يتجاوز 50MB' }));
                      setSelectedFile(null);
                      return;
                    }
                    setFieldErrors((prev) => ({ ...prev, file: '' }));
                    setSelectedFile(f);
                  }}
                />
                {fieldErrors.file ? (
                  <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                    {fieldErrors.file}
                  </Typography>
                ) : null}
                {uploading ? (
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress variant="indeterminate" />
                  </Box>
                ) : uploadProgress > 0 ? (
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress variant="determinate" value={uploadProgress} />
                  </Box>
                ) : null}
              </Box>
            )}
          </Box>
          <CardActions sx={{ mt: 2, justifyContent: 'flex-end' }}>
            <Button type="submit" variant="contained" loading={submitting}>
              حفظ
            </Button>
          </CardActions>
        </Form>
        <Snackbar open={successOpen} autoHideDuration={3000} onClose={() => setSuccessOpen(false)} message="تم إضافة الجلسة بنجاح" />
      </CardContent>
    </Card>
  );
}

function EditSessionForm({
  session,
  onUpdated,
  formId,
}: {
  session: SessionRecord;
  onUpdated: () => void;
  formId?: string;
}) {
  const [title, setTitle] = React.useState(session.title);
  const [language, setLanguage] = React.useState<Lang>(session.language as Lang);
  const [orderNumber, setOrderNumber] = React.useState<number | ''>(session.order_number ?? '');
  const [isActive, setIsActive] = React.useState(session.is_active);
  const [mode, setMode] = React.useState<'keep' | 'url' | 'file'>('keep');
  const [url, setUrl] = React.useState('');
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const [submitting, setSubmitting] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<number>(0);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [successOpen, setSuccessOpen] = React.useState(false);

  function validate() {
    const errs: Record<string, string> = {};
    if (!String(title).trim()) errs.title = 'العنوان مطلوب';
    if (!language) errs.language = 'اللغة مطلوبة';
    if (orderNumber !== '' && (!Number.isInteger(orderNumber) || (orderNumber as number) <= 0)) {
      errs.order_number = 'الترتيب يجب أن يكون عددًا موجبًا';
    }
    if (mode === 'url') {
      const u = String(url).trim();
      if (!u) errs.url = 'رابط المحتوى مطلوب';
      else {
        const okExt = ['.mp4', '.avi', '.mov', '.webm', '.mkv', '.mpg', '.mpeg'].some((e) => u.toLowerCase().endsWith(e));
        if (!okExt && !isYouTubeUrl(u)) {
          errs.url = 'الرابط يجب أن يكون لفيديو مدعوم أو يوتيوب';
        }
      }
    } else if (mode === 'file') {
      if (!selectedFile) errs.file = 'يرجى اختيار ملف';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      let content: { url: string } | undefined = undefined;
      if (mode === 'keep') {
        content = undefined;
      } else if (mode === 'url') {
        content = { url: url.trim() };
      } else {
        const f = selectedFile!;
        const isVideo = (f.type || '').startsWith('video') || ['.mp4', '.avi', '.mov', '.webm', '.mkv', '.mpg', '.mpeg'].some((e) => f.name.toLowerCase().endsWith(e));
        const sizeLimit = isVideo ? 5 * 1024 * 1024 * 1024 : 200 * 1024 * 1024;
        if (f.size > sizeLimit) {
          setFieldErrors((prev) => ({ ...prev, file: isVideo ? 'حجم الفيديو يتجاوز 500MB' : 'حجم الملف يتجاوز 50MB' }));
          setSubmitting(false);
          return;
        }
        setUploading(true);
        setUploadProgress(0);
        const resUp = await uploadFileSmart(f, (p) => setUploadProgress(p));
        setUploading(false);
        setUploadProgress(100);
        if (!resUp.ok) {
          setError(resUp.error);
          setSubmitting(false);
          return;
        }
        content = { url: resUp.ref };
        try {
          await finalizeUpload({
            ref: resUp.ref,
            kind: isVideo ? 'video' : 'file',
            filename: f.name,
            contentType: f.type || 'application/octet-stream',
            sizeBytes: f.size,
          });
        } catch {}
      }
      const res = await updateSession({
        id: session.id,
        title: title.trim(),
        language,
        order_number: orderNumber === '' ? undefined : Number(orderNumber),
        is_active: isActive,
        content,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccessOpen(true);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card elevation={0}>
      <CardHeader title="تعديل الجلسة" />
      <CardContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Form id={formId} onSubmit={handleSubmit}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <Box>
              <Input
                label="عنوان الفيديو"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                fullWidth
                error={!!fieldErrors.title}
                helperText={fieldErrors.title}
              />
            </Box>
            <Box>
              <Input
                label="اللغة"
                select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Lang)}
                required
                fullWidth
                error={!!fieldErrors.language}
                helperText={fieldErrors.language}
              >
                <MenuItem value="AR">AR - العربية</MenuItem>
                <MenuItem value="EN">EN - الإنجليزية</MenuItem>
              </Input>
            </Box>
            <Box>
              <Input
                label="الترتيب"
                type="number"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value === '' ? '' : Number(e.target.value))}
                fullWidth
                error={!!fieldErrors.order_number}
                helperText={fieldErrors.order_number}
              />
            </Box>
            <Box>
              <Input
                label="الحالة"
                select
                value={isActive ? 'active' : 'inactive'}
                onChange={(e) => setIsActive((e.target.value as string) === 'active')}
                fullWidth
              >
                <MenuItem value="active">نشط</MenuItem>
                <MenuItem value="inactive">غير نشط</MenuItem>
              </Input>
            </Box>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" spacing={2}>
              <Button variant={mode === 'keep' ? 'contained' : 'outlined'} onClick={() => setMode('keep')}>
                إبقاء المحتوى الحالي
              </Button>
              <Button variant={mode === 'url' ? 'contained' : 'outlined'} onClick={() => setMode('url')}>
                استبدال برابط
              </Button>
              <Button variant={mode === 'file' ? 'contained' : 'outlined'} onClick={() => setMode('file')}>
                استبدال بملف
              </Button>
            </Stack>
            {mode === 'url' ? (
              <Box sx={{ mt: 2 }}>
                <Input
                  label="رابط الفيديو / الملف"
                  placeholder="https://youtube.com/... أو رابط مباشر .mp4/.mov/.avi"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  fullWidth
                  error={!!fieldErrors.url}
                  helperText={fieldErrors.url}
                />
              </Box>
            ) : mode === 'file' ? (
              <Box sx={{ mt: 2 }}>
                <input
                  type="file"
                  accept=".mp4,.avi,.mov,.webm,.mkv,.mpg,.mpeg,.pdf,.ppt,.pptx,.doc,.docx,video/mp4,video/webm,video/x-matroska,video/x-msvideo"
                  onChange={async (e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (!f) {
                      setSelectedFile(null);
                      return;
                    }
                    const isVideo = (f.type || '').startsWith('video');
                    const sizeLimit = isVideo ? 5 * 1024 * 1024 * 1024 : 200 * 1024 * 1024;
                    if (f.size > sizeLimit) {
                      setFieldErrors((prev) => ({ ...prev, file: isVideo ? 'حجم الفيديو يتجاوز 500MB' : 'حجم الملف يتجاوز 50MB' }));
                      setSelectedFile(null);
                      return;
                    }
                    setFieldErrors((prev) => ({ ...prev, file: '' }));
                    setSelectedFile(f);
                  }}
                />
                {fieldErrors.file ? (
                  <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                    {fieldErrors.file}
                  </Typography>
                ) : null}
                {uploading ? (
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress variant="indeterminate" />
                  </Box>
                ) : uploadProgress > 0 ? (
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress variant="determinate" value={uploadProgress} />
                  </Box>
                ) : null}
              </Box>
            ) : null}
          </Box>
          <CardActions sx={{ mt: 2, justifyContent: 'flex-end' }}>
            <Button type="submit" variant="contained" loading={submitting || uploading}>
              حفظ
            </Button>
          </CardActions>
        </Form>
        <Snackbar open={successOpen} autoHideDuration={3000} onClose={() => setSuccessOpen(false)} message="تم تحديث الجلسة بنجاح" />
      </CardContent>
    </Card>
  );
}

function SessionsTable({
  onEdit,
  onDeleted,
}: {
  onEdit: (session: SessionRecord) => void;
  onDeleted: () => void;
}) {
  const [sessions, setSessions] = React.useState<SessionRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [languageFilter, setLanguageFilter] = React.useState<'all' | Lang>('all');
  const [kindFilter, setKindFilter] = React.useState<'all' | Kind>('all');
  const [isActiveFilter, setIsActiveFilter] = React.useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = React.useState<'created_at' | 'title' | 'order_number'>('created_at');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
  const [page, setPage] = React.useState(1);
  const perPage = 10;
  const [total, setTotal] = React.useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<SessionRecord | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q: ListSessionsQuery = {
        language: languageFilter === 'all' ? undefined : languageFilter,
        is_active: isActiveFilter === 'all' ? undefined : isActiveFilter === 'active',
        kind: kindFilter === 'all' ? undefined : kindFilter,
        search: searchQuery ? searchQuery : undefined,
        sort_by: sortBy,
        sort_dir: sortDirection,
        page,
        per_page: perPage,
      };
      const res = await listSessions(q);
      if (!res.ok) {
        setError(res.error);
        setSessions([]);
        setTotal(null);
        return;
      }
      setSessions(res.sessions);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف');
      setSessions([]);
      setTotal(null);
    } finally {
      setLoading(false);
    }
  }, [languageFilter, isActiveFilter, kindFilter, searchQuery, sortBy, sortDirection, page, perPage]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function confirmDelete() {
    if (!toDelete) return;
    const res = await deleteSession(toDelete.id);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDeleteOpen(false);
    setToDelete(null);
    onDeleted();
    load();
  }

  const pages = Math.max(1, Math.ceil((total ?? sessions.length) / perPage));

  return (
    <>
    <Card elevation={1}>
      <CardContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Input
            placeholder="البحث"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{ startAdornment: <Search fontSize="small" /> }}
            size="small"
          />
          <Input
            label="اللغة"
            select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value as 'all' | Lang)}
            size="small"
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="AR">AR</MenuItem>
            <MenuItem value="EN">EN</MenuItem>
          </Input>
          <Input
            label="النوع"
            select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as 'all' | Kind)}
            size="small"
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="video">فيديو</MenuItem>
            <MenuItem value="file">ملف</MenuItem>
          </Input>
          <Input
            label="الحالة"
            select
            value={isActiveFilter}
            onChange={(e) => setIsActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
            size="small"
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="active">نشط</MenuItem>
            <MenuItem value="inactive">غير نشط</MenuItem>
          </Input>
        </Stack>

        <Table
          columns={[
            {
              id: 'actions',
              label: 'الإجراءات',
              render: (row: SessionRecord) => (
                <Stack direction="row" spacing={1}>
                  <IconButton color="primary" onClick={() => onEdit(row)} size="small">
                    <EditOutlined fontSize="small" />
                  </IconButton>
                  <IconButton color="error" onClick={() => { setToDelete(row); setDeleteOpen(true); }} size="small">
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </Stack>
              ),
            },
            {
              id: 'order_number',
              label: 'الترتيب',
              sortable: true,
              render: (row: SessionRecord) => row.order_number ?? '--',
            },
            { id: 'title', label: 'عنوان الفيديو', sortable: true },
            {
              id: 'language',
              label: 'اللغة',
              render: (row: SessionRecord) => <Chip label={String(row.language).toUpperCase()} size="small" />,
            },
            {
              id: 'kind',
              label: 'النوع',
              render: (row: SessionRecord) =>
                /\.(mp4|avi|mov)$/i.test(row.video_url) ? 'فيديو' : /\.(pdf|pptx?|docx?)$/i.test(row.video_url) ? 'ملف' : 'غير معروف',
            },
            {
              id: 'created_at',
              label: 'تاريخ الإضافة',
              render: (row: SessionRecord) => new Date(row.created_at).toLocaleDateString(),
            },
          ]}
          data={sessions}
          loading={loading}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={(col, dir) => {
            if (col === 'title') {
              setSortBy('title');
              setSortDirection(dir);
            } else if (col === 'order_number') {
              setSortBy('order_number');
              setSortDirection(dir);
            }
          }}
          getRowId={(e) => e.id}
        />

        <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
          <Pagination count={pages} page={page} onChange={(_, p) => setPage(p)} />
        </Stack>
      </CardContent>
    </Card>
    <DeleteWarning
      open={deleteOpen}
      entityName={toDelete?.title}
      description="سيتم حذف الجلسة وجميع مراجعها من النظام."
      confirmText="تأكيد الحذف"
      cancelText="إلغاء"
      onConfirm={confirmDelete}
      onCancel={() => { setDeleteOpen(false); setToDelete(null); }}
      impacts={[
        'لن تظهر الجلسة في القوائم بعد الآن',
        'سيتم إزالة الوصول إلى الفيديو/الملف المرتبط'
      ]}
    />
    </>
  );
}

export default function AdminVideoPage() {
  const [addOpen, setAddOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<SessionRecord | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  function openEdit(s: SessionRecord) {
    setSelected(s);
    setEditOpen(true);
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">الفيديوهات / الجلسات</Typography>
        <Button variant="contained" onClick={() => setAddOpen(true)}>
          إضافة فيديو
        </Button>
      </Stack>

      <SessionsTable
        key={reloadKey}
        onEdit={(s) => openEdit(s)}
        onDeleted={() => setReloadKey((k) => k + 1)}
      />

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="إضافة فيديو"
        submitText="حفظ"
        cancelText="إلغاء"
        onSubmit={() => {
          const form = document.getElementById('add-session-form') as HTMLFormElement | null;
          if (form && typeof form.requestSubmit === 'function') {
            form.requestSubmit();
          } else if (form) {
            const evt = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(evt);
          }
        }}
        onCancel={() => setAddOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <AddSessionForm
          formId="add-session-form"
          onCreated={() => {
            setAddOpen(false);
            setReloadKey((k) => k + 1);
          }}
        />
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="تعديل الفيديو"
        submitText="حفظ"
        cancelText="إلغاء"
        onSubmit={() => {
          const form = document.getElementById('edit-session-form') as HTMLFormElement | null;
          if (form && typeof form.requestSubmit === 'function') {
            form.requestSubmit();
          } else if (form) {
            const evt = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(evt);
          }
        }}
        onCancel={() => setEditOpen(false)}
        fullWidth
        maxWidth="md"
      >
        {selected ? (
          <EditSessionForm
            session={selected}
            formId="edit-session-form"
            onUpdated={() => {
              setEditOpen(false);
              setSelected(null);
              setReloadKey((k) => k + 1);
            }}
          />
        ) : (
          <Box sx={{ p: 2 }}>اختر عنصرًا للتعديل</Box>
        )}
      </Modal>
    </Container>
  );
}

