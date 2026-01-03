'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import {
  validateCreateSessionInput,
  validateUpdateSessionInput,
  validateListSessionsQuery,
} from '@/lib/validation/sessions';

export type SessionRecord = {
  id: number;
  title: string;
  video_url: string;
  language: string;
  order_number: number | null;
  is_active: boolean;
  created_at: string;
};

type ContentInput =
  | { url: string }
  | { base64: string; filename: string; contentType: string };

type CreateSessionInput = {
  title: string;
  language: string;
  order_number?: number;
  is_active?: boolean;
  content: ContentInput;
};

type UpdateSessionInput = {
  id: number;
  title?: string;
  language?: string;
  order_number?: number;
  is_active?: boolean;
  content?: ContentInput | null;
};

export type ListSessionsQuery = {
  language?: string;
  is_active?: boolean;
  kind?: 'video' | 'file';
  search?: string;
  sort_by?: 'created_at' | 'title' | 'order_number';
  sort_dir?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
};

function sanitizeFilename(name: string) {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.length > 180 ? base.slice(-180) : base;
}
function isStorageRef(url: string) {
  return String(url ?? '').startsWith('storage://');
}
function parseStorageRef(url: string): { bucket: string; path: string } | null {
  const raw = String(url ?? '');
  if (!raw.startsWith('storage://')) return null;
  const without = raw.slice('storage://'.length);
  const idx = without.indexOf('/');
  if (idx <= 0) return null;
  const bucket = without.slice(0, idx);
  const path = without.slice(idx + 1);
  if (!bucket || !path) return null;
  return { bucket, path };
}
async function ensureAdmin(): Promise<{ ok: true; auth_user_id: string; user_id: number } | { ok: false; error: string; details?: unknown }> {
  try {
    const supabaseServer = await createServerClient();
    const { data: userData, error: userErr } = await supabaseServer.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return { ok: false, error: 'غير مصرح', details: userErr };
    }
    const authId = userData.user.id as string;
    const supabase = createAdminClient();
    const { data: uRow, error: uErr } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authId)
      .maybeSingle();
    if (uErr || !uRow?.id) {
      return { ok: false, error: 'غير مصرح', details: uErr };
    }
    const { data: roleRow, error: roleErr } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'admin')
      .maybeSingle();
    if (roleErr || !roleRow?.id) {
      return { ok: false, error: 'صلاحيات غير متاحة', details: roleErr };
    }
    const { data: relRow, error: relErr } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('user_id', uRow.id as number)
      .eq('role_id', roleRow.id as number)
      .maybeSingle();
    if (relErr || !relRow?.user_id) {
      return { ok: false, error: 'غير مصرح', details: relErr };
    }
    return { ok: true, auth_user_id: authId, user_id: uRow.id as number };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'غير مصرح', details: error };
  }
}
function assertValidStorageRef(url: string): { ok: true; bucket: string; path: string } | { ok: false; error: string } {
  const parsed = parseStorageRef(url);
  if (!parsed) return { ok: false, error: 'مرجع تخزين غير صالح' };
  if (parsed.bucket !== 'session-videos') return { ok: false, error: 'Bucket غير مسموح' };
  if (!parsed.path.startsWith('sessions/')) return { ok: false, error: 'المسار خارج النطاق المسموح' };
  return { ok: true, bucket: parsed.bucket, path: parsed.path };
}
async function persistDirectUploadMetadata(storageRef: string, kind: 'video' | 'file'): Promise<void> {
  try {
    const parsed = parseStorageRef(storageRef);
    if (!parsed) return;
    const supabase = createAdminClient();
    const dir = parsed.path.replace(/[^/]+$/, '').replace(/\/$/, '');
    const name = parsed.path.split('/').pop() as string;
    const { data: list } = await supabase.storage.from(parsed.bucket).list(dir || '', { limit: 1000 });
    let size: number | undefined = undefined;
    if (Array.isArray(list)) {
      for (const item of list as Array<unknown>) {
        const obj = item as { name?: string; size?: number };
        if (obj?.name === name) {
          size = typeof obj.size === 'number' ? obj.size : undefined;
          break;
        }
      }
    }
    const contentType = name.toLowerCase().endsWith('.mp4')
      ? 'video/mp4'
      : name.toLowerCase().endsWith('.webm')
      ? 'video/webm'
      : name.toLowerCase().endsWith('.mkv')
      ? 'video/x-matroska'
      : name.toLowerCase().endsWith('.avi')
      ? 'video/x-msvideo'
      : name.toLowerCase().endsWith('.mov')
      ? 'video/quicktime'
      : name.toLowerCase().endsWith('.mpg') || name.toLowerCase().endsWith('.mpeg')
      ? 'video/mpeg'
      : name.toLowerCase().endsWith('.pdf')
      ? 'application/pdf'
      : name.toLowerCase().endsWith('.doc')
      ? 'application/msword'
      : name.toLowerCase().endsWith('.docx')
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : name.toLowerCase().endsWith('.ppt')
      ? 'application/vnd.ms-powerpoint'
      : name.toLowerCase().endsWith('.pptx')
      ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      : undefined;
    await uploadMetadata(storageRef, {
      source: 'upload',
      filename: name,
      contentType: contentType ?? null,
      sizeBytes: typeof size === 'number' ? size : null,
      durationSeconds: null,
      kind,
      createdAt: new Date().toISOString(),
    });
  } catch {}
}
async function ensureSessionBucket(): Promise<
  | { ok: true; bucket: string }
  | { ok: false; error: string; details?: unknown }
> {
  try {
    const supabase = createAdminClient();
    const bucket = 'session-videos';
    const { data: exists } = await supabase.storage.getBucket(bucket);
    if (!exists) {
      const { error: createErr } = await supabase.storage.createBucket(bucket, {
        public: false,
        fileSizeLimit: 1024 * 1024 * 1024,
      });
      if (createErr) {
        return { ok: false, error: createErr.message, details: createErr };
      }
    }
    return { ok: true, bucket };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error,
    };
  }
}
async function uploadContent(
  content: { base64: string; filename: string; contentType: string },
): Promise<{ ok: true; ref: string } | { ok: false; error: string; details?: unknown }> {
  try {
    const supabase = createAdminClient();
    const ensured = await ensureSessionBucket();
    if (!ensured.ok) return ensured;
    const bucket = ensured.bucket;
    const stamp = Date.now();
    const rand = Math.random().toString(36).slice(2);
    const clean = sanitizeFilename(content.filename);
    const path = `sessions/${new Date().getUTCFullYear()}/${String(
      new Date().getUTCMonth() + 1,
    ).padStart(2, '0')}/${String(new Date().getUTCDate()).padStart(2, '0')}/${stamp}_${rand}_${clean}`;
    const payload = content.base64.includes('base64,')
      ? content.base64.split('base64,').pop() as string
      : content.base64;
    const buf = Buffer.from(payload, 'base64');
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, buf, {
      contentType: content.contentType,
      upsert: false,
    });
    if (upErr) {
      return { ok: false, error: upErr.message, details: upErr };
    }
    return { ok: true, ref: `storage://${bucket}/${path}` };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error,
    };
  }
}
async function uploadMetadata(pathRef: string, metadata: Record<string, unknown>): Promise<void> {
  try {
    const parsed = parseStorageRef(pathRef);
    if (!parsed) return;
    const supabase = createAdminClient();
    const metaPath = parsed.path.toLowerCase().endsWith('.json')
      ? parsed.path
      : parsed.path.replace(/[^/]+$/, (m) => m.replace(/\.[^.]+$/, '') + '.json');
    const body = Buffer.from(JSON.stringify(metadata, null, 2), 'utf-8');
    await supabase.storage.from(parsed.bucket).upload(metaPath, body, {
      contentType: 'application/json',
      upsert: false,
    });
  } catch {
    // ignore metadata upload failures
  }
}
function isYouTubeUrl(u: string): boolean {
  const s = String(u ?? '').toLowerCase();
  return s.startsWith('http://') || s.startsWith('https://')
    ? s.includes('youtube.com/') || s.includes('youtu.be/')
    : false;
}
function parseYouTubeId(u: string): string | null {
  try {
    if (!isYouTubeUrl(u)) return null;
    const url = new URL(u);
    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id && id.length >= 6 ? id : null;
    }
    if (url.hostname.includes('youtube.com')) {
      if (url.pathname.startsWith('/watch')) {
        const id = url.searchParams.get('v');
        return id && id.length >= 6 ? id : null;
      }
      if (url.pathname.startsWith('/embed/')) {
        const id = url.pathname.split('/').filter(Boolean)[1];
        return id && id.length >= 6 ? id : null;
      }
      if (url.pathname.startsWith('/shorts/')) {
        const id = url.pathname.split('/').filter(Boolean)[1];
        return id && id.length >= 6 ? id : null;
      }
    }
    return null;
  } catch {
    return null;
  }
}
async function getSignedUrlIfStorage(url: string): Promise<string> {
  try {
    const parsed = parseStorageRef(url);
    if (!parsed) return url;
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from(parsed.bucket)
      .createSignedUrl(parsed.path, 3600);
    if (error) return url;
    return data?.signedUrl ?? url;
  } catch {
    return url;
  }
}

export async function createSession(
  input: CreateSessionInput,
): Promise<{ ok: true; session: SessionRecord } | { ok: false; error: string; details?: unknown; fieldErrors?: Record<string, string> }> {
  try {
    const auth = await ensureAdmin();
    if (!auth.ok) {
      return { ok: false, error: auth.error, details: auth.details };
    }
    const v = validateCreateSessionInput(input);
    if (!v.ok) {
      return {
        ok: false,
        error: 'فشل التحقق من صحة البيانات',
        fieldErrors: (v.errors as unknown) as Record<string, string>,
      };
    }
    const payload = v.value as {
      title: string;
      language: string;
      order_number?: number;
      is_active: boolean;
      content: { kind: 'video' | 'file'; url?: string; base64?: string; filename?: string; contentType?: string; sizeBytes?: number; youtubeId?: string };
    };
    let video_url = '';
    if (payload.content.url) {
      if (isYouTubeUrl(payload.content.url)) {
        const ytId = payload.content.youtubeId ?? parseYouTubeId(payload.content.url);
        const ensured = await ensureSessionBucket();
        if (!ensured.ok) return ensured;
        const bucket = ensured.bucket;
        const stamp = Date.now();
        const rand = Math.random().toString(36).slice(2);
        const folder = `sessions/${new Date().getUTCFullYear()}/${String(
          new Date().getUTCMonth() + 1,
        ).padStart(2, '0')}/${String(new Date().getUTCDate()).padStart(2, '0')}`;
        const metaRef = `storage://${bucket}/${folder}/${stamp}_${rand}_youtube_${ytId ?? 'unknown'}.json`;
        await uploadMetadata(metaRef, {
          source: 'youtube',
          youtubeId: ytId ?? null,
          originalUrl: payload.content.url,
          kind: 'video',
          sizeBytes: null,
          durationSeconds: null,
          createdAt: new Date().toISOString(),
        });
        video_url = payload.content.url;
      } else {
        if (isStorageRef(payload.content.url)) {
          const valid = assertValidStorageRef(payload.content.url);
          if (!('ok' in valid) || valid.ok !== true) {
            return { ok: false, error: 'مرجع تخزين غير مسموح' };
          }
          await persistDirectUploadMetadata(payload.content.url, payload.content.kind);
          video_url = payload.content.url;
        } else {
          video_url = payload.content.url;
        }
      }
    } else {
      const uploaded = await uploadContent({
        base64: payload.content.base64 as string,
        filename: payload.content.filename as string,
        contentType: payload.content.contentType as string,
      });
      if (!uploaded.ok) return uploaded;
      await uploadMetadata(uploaded.ref, {
        source: 'upload',
        filename: payload.content.filename ?? null,
        contentType: payload.content.contentType ?? null,
        sizeBytes: payload.content.sizeBytes ?? null,
        durationSeconds: null,
        kind: payload.content.kind,
        createdAt: new Date().toISOString(),
      });
      video_url = uploaded.ref;
    }
    const supabase = createAdminClient();
    const toInsert: Record<string, unknown> = {
      title: payload.title,
      video_url,
      language: payload.language,
      is_active: payload.is_active,
    };
    if (payload.order_number !== undefined) toInsert.order_number = payload.order_number;
    const { data, error } = await supabase
      .from('sessions')
      .insert(toInsert)
      .select('id,title,video_url,language,order_number,is_active,created_at')
      .maybeSingle();
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    const row = data as unknown as Record<string, unknown>;
    const session: SessionRecord = {
      id: row.id as number,
      title: row.title as string,
      video_url: row.video_url as string,
      language: row.language as string,
      order_number: (row.order_number as number | null) ?? null,
      is_active: (row.is_active as boolean | undefined) ?? true,
      created_at: row.created_at as string,
    };
    return { ok: true, session };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export async function updateSession(
  input: UpdateSessionInput,
): Promise<{ ok: true } | { ok: false; error: string; details?: unknown; fieldErrors?: Record<string, string> }> {
  try {
    const auth = await ensureAdmin();
    if (!auth.ok) {
      return { ok: false, error: auth.error, details: auth.details };
    }
  const v = validateUpdateSessionInput(input);
    if (!v.ok) {
      return {
        ok: false,
        error: 'فشل التحقق من صحة البيانات',
        fieldErrors: (v.errors as unknown) as Record<string, string>,
      };
    }
    const payload = v.value as {
      id: number;
      title?: string;
      language?: string;
      order_number?: number;
      is_active?: boolean;
      content?: { url?: string; base64?: string; filename?: string; contentType?: string; sizeBytes?: number; youtubeId?: string; kind?: 'video' | 'file' };
    };
    const supabase = createAdminClient();
    const update: Record<string, unknown> = {};
    if (payload.title !== undefined) update.title = payload.title;
    if (payload.language !== undefined) update.language = payload.language;
    if (payload.order_number !== undefined) update.order_number = payload.order_number;
    if (payload.is_active !== undefined) update.is_active = payload.is_active;
    if (payload.content !== undefined && payload.content !== null) {
      let nextUrl = '';
      if (payload.content.url) {
        if (isYouTubeUrl(payload.content.url)) {
          const ytId = payload.content.youtubeId ?? parseYouTubeId(payload.content.url);
          const ensured = await ensureSessionBucket();
          if (!ensured.ok) return ensured;
          const bucket = ensured.bucket;
          const stamp = Date.now();
          const rand = Math.random().toString(36).slice(2);
          const folder = `sessions/${new Date().getUTCFullYear()}/${String(
            new Date().getUTCMonth() + 1,
          ).padStart(2, '0')}/${String(new Date().getUTCDate()).padStart(2, '0')}`;
          const metaRef = `storage://${bucket}/${folder}/${stamp}_${rand}_youtube_${ytId ?? 'unknown'}.json`;
          await uploadMetadata(metaRef, {
            source: 'youtube',
            youtubeId: ytId ?? null,
            originalUrl: payload.content.url,
            kind: 'video',
            sizeBytes: null,
            durationSeconds: null,
            createdAt: new Date().toISOString(),
          });
          nextUrl = payload.content.url;
        } else {
          if (isStorageRef(payload.content.url)) {
            const valid = assertValidStorageRef(payload.content.url);
            if (!('ok' in valid) || valid.ok !== true) {
              return { ok: false, error: 'مرجع تخزين غير مسموح' };
            }
            await persistDirectUploadMetadata(payload.content.url, (payload.content.kind ?? 'video') as 'video' | 'file');
            nextUrl = payload.content.url;
          } else {
            nextUrl = payload.content.url;
          }
        }
      } else {
        const uploaded = await uploadContent({
          base64: payload.content.base64 as string,
          filename: payload.content.filename as string,
          contentType: payload.content.contentType as string,
        });
        if (!uploaded.ok) return uploaded;
        await uploadMetadata(uploaded.ref, {
          source: 'upload',
          filename: payload.content.filename ?? null,
          contentType: payload.content.contentType ?? null,
          sizeBytes: payload.content.sizeBytes ?? null,
          durationSeconds: null,
          kind: payload.content.kind,
          createdAt: new Date().toISOString(),
        });
        nextUrl = uploaded.ref;
      }
      update.video_url = nextUrl;
    }
    const { error } = await supabase.from('sessions').update(update).eq('id', payload.id);
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export async function deleteSession(id: number): Promise<{ ok: true } | { ok: false; error: string; details?: unknown }> {
  try {
    const auth = await ensureAdmin();
    if (!auth.ok) {
      return { ok: false, error: auth.error, details: auth.details };
    }
    const supabase = createAdminClient();
    const { data: row, error: getErr } = await supabase
      .from('sessions')
      .select('id,video_url')
      .eq('id', id)
      .maybeSingle();
    if (getErr) {
      return { ok: false, error: getErr.message, details: getErr };
    }
    const url = (row as Record<string, unknown> | null)?.video_url as string | undefined;
    const { error } = await supabase.from('sessions').delete().eq('id', id);
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    if (url && isStorageRef(url)) {
      const parsed = parseStorageRef(url);
      if (parsed) {
        await supabase.storage.from(parsed.bucket).remove([parsed.path]);
      }
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export async function listSessions(
  query: ListSessionsQuery,
): Promise<
  | { ok: true; sessions: SessionRecord[]; page: number; perPage: number; total: number | null }
  | { ok: false; error: string; details?: unknown; fieldErrors?: Record<string, string> }
> {
  try {
    const v = validateListSessionsQuery(query);
    if (!v.ok) {
      return {
        ok: false,
        error: 'فشل التحقق من معايير الاستعلام',
        fieldErrors: (v.errors as unknown) as Record<string, string>,
      };
    }
    const q = v.value as {
      language?: string;
      is_active?: boolean;
      kind?: 'video' | 'file';
      search?: string;
      sort_by: 'created_at' | 'title' | 'order_number';
      sort_dir: 'asc' | 'desc';
      page: number;
      per_page: number;
    };
    const supabase = createAdminClient();
    let builder = supabase
      .from('sessions')
      .select('id,title,video_url,language,order_number,is_active,created_at', { count: 'exact' });
    if (q.language) builder = builder.eq('language', q.language);
    if (q.is_active !== undefined) builder = builder.eq('is_active', !!q.is_active);
    if (q.search) {
      const term = String(q.search).trim().replace(/%/g, '\\%').replace(/_/g, '\\_');
      builder = builder.ilike('title', `%${term}%`);
    }
  if (q.kind) {
      const vids = ['%.mp4', '%.avi', '%.mov', '%.webm', '%.mkv', '%.mpg', '%.mpeg', '%youtube.com%', '%youtu.be%', 'youtube://%'];
      const docs = ['%.pdf', '%.ppt', '%.pptx', '%.doc', '%.docx'];
      const patterns = q.kind === 'video' ? vids : docs;
      const ors = patterns.map((p) => `video_url.ilike.${p}`).join(',');
      builder = builder.or(ors);
  }
    builder = builder.order(q.sort_by, { ascending: q.sort_dir === 'asc', nullsFirst: false });
    const from = (q.page - 1) * q.per_page;
    const to = from + q.per_page - 1;
    builder = builder.range(from, to);
    const { data, error, count } = await builder;
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    const sessionsRaw: SessionRecord[] = (data ?? []).map((row) => {
      const r = row as unknown as Record<string, unknown>;
      return {
        id: r.id as number,
        title: r.title as string,
        video_url: r.video_url as string,
        language: r.language as string,
        order_number: (r.order_number as number | null) ?? null,
        is_active: (r.is_active as boolean | undefined) ?? true,
        created_at: r.created_at as string,
      };
    });
    const sessions: SessionRecord[] = [];
    for (const s of sessionsRaw) {
      const signed = isStorageRef(s.video_url) ? await getSignedUrlIfStorage(s.video_url) : s.video_url;
      sessions.push({ ...s, video_url: signed });
    }
    return { ok: true, sessions, page: q.page, perPage: q.per_page, total: count ?? null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export async function reorderSessions(
  ordering: Array<{ id: number; order_number: number }>,
): Promise<{ ok: true } | { ok: false; error: string; details?: unknown }> {
  try {
    const auth = await ensureAdmin();
    if (!auth.ok) {
      return { ok: false, error: auth.error, details: auth.details };
    }
    if (!Array.isArray(ordering) || ordering.length === 0) return { ok: true };
    const supabase = createAdminClient();
    for (const item of ordering) {
      if (!Number.isInteger(item.id) || item.id <= 0) continue;
      if (!Number.isInteger(item.order_number) || item.order_number <= 0) continue;
      await supabase.from('sessions').update({ order_number: item.order_number }).eq('id', item.id);
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

