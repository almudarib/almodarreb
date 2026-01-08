 'use client';
 
 import * as React from 'react';
 import { Container, Stack, Typography, Card, CardContent, Box } from '@mui/material';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { createClient as createSupabaseClient } from '@/lib/supabase/client';
 
 type StoredFile = { name: string; created_at?: string; id?: string };
 
 function buildCdnUrl(name: string) {
   const base = String(process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/[\/\s]+$/, '');
   return `${base}/storage/v1/object/public/videos/${name}`;
 }
 
 export default function VideoFeedPage() {
   const supabase = React.useMemo(() => createSupabaseClient(), []);
   const [files, setFiles] = React.useState<StoredFile[]>([]);
   const [uploading, setUploading] = React.useState(false);
   const [error, setError] = React.useState<string | null>(null);
 
   const load = React.useCallback(async () => {
     setError(null);
     const { data, error } = await supabase.storage.from('videos').list('', { limit: 200 });
     if (error) {
       setError(error.message);
       setFiles([]);
       return;
     }
     const list = (data ?? []).filter((f) => f.name !== '.emptyFolderPlaceholder') as StoredFile[];
     setFiles(list);
   }, [supabase]);
 
   React.useEffect(() => {
     load();
   }, [load]);
 
   async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
     const file = e.target.files?.[0] ?? null;
     if (!file) return;
     setError(null);
     setUploading(true);
     try {
       const ext = file.name.toLowerCase().includes('.') ? file.name.toLowerCase().split('.').pop() : 'mp4';
       const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
       const name = `${id}.${ext}`;
       const { error } = await supabase.storage.from('videos').upload(name, file, {
         contentType: file.type || 'video/mp4',
         upsert: false,
       });
       if (error) {
         setError(error.message);
       } else {
         await load();
       }
     } catch (err) {
       setError(err instanceof Error ? err.message : 'فشل رفع الفيديو');
     } finally {
       setUploading(false);
       e.target.value = '';
     }
   }
 
   return (
     <Container maxWidth="md" sx={{ py: 4 }}>
       <Stack spacing={3}>
         <Typography variant="h5">رفع الفيديو وعرضه</Typography>
         <Card>
           <CardContent>
             <Stack direction="row" spacing={2} alignItems="center">
               <Input type="file" inputProps={{ accept: 'video/*' }} onChange={handleUpload} />
               <Button variant="contained" disabled>
                 {uploading ? 'جاري الرفع...' : 'اختر ملف'}
               </Button>
             </Stack>
             {error ? (
               <Box sx={{ mt: 2, color: 'error.main' }}>{error}</Box>
             ) : null}
           </CardContent>
         </Card>
         <Stack spacing={2}>
           {files.map((f) => (
             <Card key={f.name}>
               <CardContent>
                 <video controls style={{ width: '100%' }}>
                   <source src={buildCdnUrl(f.name)} type="video/mp4" />
                 </video>
               </CardContent>
             </Card>
           ))}
         </Stack>
       </Stack>
     </Container>
   );
 }
