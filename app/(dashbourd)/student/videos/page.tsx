 'use client';
 
 import * as React from 'react';
 import { useSearchParams } from 'next/navigation';
 import { Container, Stack, Typography, Alert, Box, Chip, LinearProgress } from '@mui/material';
 import { Card, CardHeader, CardContent, CardActions, Button, Modal } from '@/components/ui';
 import { getStudentProfile, type StudentProfile } from '@/app/actions/students';
 import { listSessions, type ListSessionsQuery, type SessionRecord } from '@/app/actions/video';
 import { logStudentSession } from '@/app/actions/stu-activity';
 
 function isYouTubeUrl(u: string): boolean {
   const s = String(u ?? '').trim().toLowerCase();
   return s.startsWith('http://') || s.startsWith('https://')
     ? s.includes('youtube.com/') || s.includes('youtu.be/')
     : false;
 }
 function toYouTubeEmbed(u: string): string {
   try {
     const url = new URL(u);
     if (url.hostname.includes('youtu.be')) {
       const id = url.pathname.split('/').filter(Boolean)[0];
       return `https://www.youtube.com/embed/${id}`;
     }
     if (url.hostname.includes('youtube.com')) {
       if (url.pathname.startsWith('/watch')) {
         const id = url.searchParams.get('v');
         return `https://www.youtube.com/embed/${id}`;
       }
       if (url.pathname.startsWith('/embed/')) {
         return u;
       }
       if (url.pathname.startsWith('/shorts/')) {
         const id = url.pathname.split('/').filter(Boolean)[1];
         return `https://www.youtube.com/embed/${id}`;
       }
     }
     return u;
   } catch {
     return u;
   }
 }
 
 function VideosContent() {
   const searchParams = useSearchParams();
   const sidRaw = searchParams.get('student_id') ?? undefined;
   const studentId = sidRaw ? Number(sidRaw) : NaN;
 
   const [loading, setLoading] = React.useState(false);
   const [error, setError] = React.useState<string | null>(null);
   const [profile, setProfile] = React.useState<StudentProfile | null>(null);
   const [sessions, setSessions] = React.useState<SessionRecord[]>([]);
 
   const [playerOpen, setPlayerOpen] = React.useState(false);
   const [current, setCurrent] = React.useState<SessionRecord | null>(null);
   const [startedAt, setStartedAt] = React.useState<number | null>(null);
   const [loggingError, setLoggingError] = React.useState<string | null>(null);
 
   const load = React.useCallback(async () => {
     if (!Number.isFinite(studentId) || studentId <= 0) {
       setError('يجب تمرير رقم الطالب عبر معامل student_id');
       setProfile(null);
       setSessions([]);
       return;
     }
     setLoading(true);
     setError(null);
     try {
       const [pRes, sRes] = await Promise.all([
         getStudentProfile(studentId),
         listSessions({
           is_active: true,
           kind: 'video',
           sort_by: 'order_number',
           sort_dir: 'asc',
           page: 1,
           per_page: 100,
         } as ListSessionsQuery),
       ]);
       if (!pRes.ok) {
         setError(pRes.error);
         setProfile(null);
         setSessions([]);
         return;
       }
       setProfile(pRes.profile);
       if (pRes.profile.status !== 'active') {
         setError('حساب الطالب غير نشط');
         setSessions([]);
         return;
       }
       if (!sRes.ok) {
         setError(sRes.error);
         setSessions([]);
         return;
       }
       const ordered = [...sRes.sessions].sort((a, b) => {
         const ao = a.order_number ?? 0;
         const bo = b.order_number ?? 0;
         if (ao !== bo) return ao - bo;
         return (a.created_at || '').localeCompare(b.created_at || '');
       });
       setSessions(ordered);
     } catch (e) {
       setError(e instanceof Error ? e.message : 'حدث خطأ غير معروف');
       setProfile(null);
       setSessions([]);
     } finally {
       setLoading(false);
     }
   }, [studentId]);
 
   React.useEffect(() => {
     load();
   }, [load]);
 
   function handleOpenPlayer(s: SessionRecord) {
     setCurrent(s);
     setPlayerOpen(true);
     setStartedAt(Date.now());
     setLoggingError(null);
   }
   async function handleClosePlayer() {
     setPlayerOpen(false);
     const s = current;
     const started = startedAt;
     setCurrent(null);
     setStartedAt(null);
     if (!s || !Number.isFinite(studentId) || studentId <= 0) return;
     try {
       const durMs = started ? Date.now() - started : 0;
       const durMin = Math.max(0, Math.round(durMs / 60000));
       const res = await logStudentSession({
         student_id: studentId,
         session_id: s.id,
         opened_at: started ? new Date(started) : new Date(),
         duration_minutes: durMin > 0 ? durMin : undefined,
       });
       if (!res.ok) {
         setLoggingError(res.error);
       }
     } catch (e) {
       setLoggingError(e instanceof Error ? e.message : 'فشل تسجيل الجلسة');
     }
   }
 
   if (!Number.isFinite(studentId) || studentId <= 0) {
     return (
       <Container maxWidth="lg" sx={{ py: 4 }} dir="rtl">
         <Alert severity="error" sx={{ borderRadius: '12px' }}>
           يجب تمرير رقم الطالب عبر معامل student_id
         </Alert>
       </Container>
     );
   }
 
   return (
     <Container maxWidth="lg" sx={{ py: 4 }} dir="rtl">
       <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
         <Box>
           <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--brand-dark)' }}>
             الجلسات التعليمية
           </Typography>
           <Typography variant="body2" sx={{ color: 'var(--neutral-700)', mt: 0.5 }}>
             {profile ? `الطالب: ${profile.name}` : 'جارٍ التحميل...'}
           </Typography>
         </Box>
       </Stack>
 
       {error ? (
         <Alert severity="error" sx={{ borderRadius: '12px', mb: 2 }}>
           {error}
         </Alert>
       ) : null}
 
       {loading ? (
         <Card>
           <CardContent>
             <LinearProgress />
           </CardContent>
         </Card>
       ) : sessions.length === 0 ? (
         <Card>
           <CardContent>
             <Typography sx={{ color: 'var(--neutral-700)' }}>
               لا توجد جلسات متاحة الآن
             </Typography>
           </CardContent>
         </Card>
       ) : (
         <Box
           sx={{
             display: 'grid',
             gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
             gap: 2,
           }}
         >
           {sessions.map((ses) => (
             <Card key={ses.id}>
               <CardHeader
                 title={
                   <Stack direction="row" alignItems="center" spacing={1}>
                     <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--brand-dark)' }}>
                       {ses.title}
                     </Typography>
                     <Chip label={String(ses.language).toUpperCase()} size="small" />
                   </Stack>
                 }
               />
               <CardContent>
                 <Stack spacing={1.5}>
                   <Typography variant="body2" sx={{ color: 'var(--neutral-700)' }}>
                     {ses.order_number ? `ترتيب: ${ses.order_number}` : 'جلسة بدون ترتيب'}
                   </Typography>
                 </Stack>
               </CardContent>
               <CardActions sx={{ justifyContent: 'flex-end' }}>
                 <Button variant="contained" onClick={() => handleOpenPlayer(ses)}>
                   مشاهدة
                 </Button>
               </CardActions>
             </Card>
           ))}
         </Box>
       )}
 
       <Modal open={playerOpen} onClose={handleClosePlayer} maxWidth="md">
         <Card>
           <CardHeader title={current?.title ?? 'مشاهدة الجلسة'} />
           <CardContent>
             {current ? (
               isYouTubeUrl(current.video_url) ? (
                 <Box sx={{ position: 'relative', pb: '56.25%', height: 0 }}>
                   <iframe
                     src={toYouTubeEmbed(current.video_url)}
                     style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                     allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                     allowFullScreen
                   />
                 </Box>
               ) : (
                 <Box sx={{ width: '100%' }}>
                   <video
                     src={current.video_url}
                     controls
                     style={{ width: '100%', borderRadius: 8, backgroundColor: '#000' }}
                     preload="metadata"
                   />
                 </Box>
               )
             ) : null}
             {loggingError ? (
               <Alert severity="warning" sx={{ mt: 2 }}>
                 {loggingError}
               </Alert>
             ) : null}
           </CardContent>
           <CardActions sx={{ justifyContent: 'flex-end' }}>
             <Button variant="outlined" onClick={handleClosePlayer}>
               إغلاق
             </Button>
           </CardActions>
         </Card>
       </Modal>
     </Container>
   );
 }
 
 export default function Page() {
   return (
     <React.Suspense
       fallback={
         <Container maxWidth="lg" sx={{ py: 4 }} dir="rtl">
           <Card>
             <CardContent>
               <Typography>جارٍ التحميل...</Typography>
             </CardContent>
           </Card>
         </Container>
       }
     >
       <VideosContent />
     </React.Suspense>
   );
 }
