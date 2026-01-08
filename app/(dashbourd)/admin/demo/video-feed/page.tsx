'use client';

import * as React from 'react';
import { Container, Stack, Typography, Card, CardContent, Box } from '@mui/material';
import { listSessions, type ListSessionsQuery, type SessionRecord } from '@/app/actions/video';

export default function VideoFeedPage() {
  const [videos, setVideos] = React.useState<SessionRecord[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    const q: ListSessionsQuery = {
      is_active: true,
      kind: 'video',
      sort_by: 'created_at',
      sort_dir: 'desc',
      page: 1,
      per_page: 200,
    };
    const res = await listSessions(q);
    if (!res.ok) {
      setError(res.error);
      setVideos([]);
      return;
    }
    setVideos(res.sessions.filter((s: SessionRecord) => !!s.video_url));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Typography variant="h5">عرض فيديوهات الجلسات</Typography>
        {error ? <Box sx={{ color: 'error.main' }}>{error}</Box> : null}
        <Stack spacing={2}>
          {videos.map((v) => (
            <Card key={v.id}>
              <CardContent>
                <video controls style={{ width: '100%' }} src={v.video_url} />
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}
