'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export type ExamRecord = {
  id: number;
  group_id: number;
  title: string;
  language: string;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
};

export type QuestionRecord = {
  id: number;
  exam_id: number;
  question: string;
  image_url: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
};

type CreateExamInput = {
  group_id: number;
  title: string;
  language: string;
  duration_minutes: number;
  is_active?: boolean;
};

export async function createExam(
  input: CreateExamInput,
): Promise<{ ok: true; exam: ExamRecord } | { ok: false; error: string; details?: unknown }> {
  try {
    if (!Number.isInteger(input?.group_id) || (input?.group_id as number) <= 0) {
      return { ok: false, error: 'group_id غير صالح' };
    }
    const title = String(input?.title ?? '').trim();
    const langRaw = String(input?.language ?? '').trim().toLowerCase();
    const allowed = ['ar', 'en', 'tr'] as const;
    const language = allowed.includes(langRaw as (typeof allowed)[number]) ? langRaw : '';
    const duration = Number(input?.duration_minutes ?? 0);
    const isActive = input?.is_active ?? true;
    if (!title) return { ok: false, error: 'العنوان مطلوب' };
    if (!language) return { ok: false, error: 'اللغة غير مدعومة' };
    if (!Number.isInteger(duration) || duration <= 0)
      return { ok: false, error: 'المدة يجب أن تكون عددًا صحيحًا موجبًا' };

    const supabase = createAdminClient();
    const { data: groupRow, error: groupErr } = await supabase
      .from('exam_groups')
      .select('id,language,is_active')
      .eq('id', input.group_id)
      .maybeSingle();
    if (groupErr) {
      return { ok: false, error: groupErr.message, details: groupErr };
    }
    if (!groupRow) {
      return { ok: false, error: 'المجموعة غير موجودة' };
    }
    const groupLang = (groupRow as { language: string }).language;
    if (groupLang !== language) {
      return { ok: false, error: 'لغة الامتحان يجب أن تطابق لغة المجموعة' };
    }
    const { data, error } = await supabase
      .from('exams')
      .insert({
        group_id: input.group_id,
        title,
        language,
        duration_minutes: duration,
        is_active: isActive,
      })
      .select('id,group_id,title,language,duration_minutes,is_active,created_at')
      .single();
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    const r = data as unknown as Record<string, unknown>;
    const exam: ExamRecord = {
      id: r.id as number,
      group_id: r.group_id as number,
      title: r.title as string,
      language: r.language as string,
      duration_minutes: r.duration_minutes as number,
      is_active: (r.is_active as boolean | undefined) ?? true,
      created_at: r.created_at as string,
    };
    return { ok: true, exam };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

type UpdateExamInput = {
  id: number;
  title?: string;
  language?: string;
  duration_minutes?: number;
  is_active?: boolean;
};

export async function updateExam(
  input: UpdateExamInput,
): Promise<{ ok: true } | { ok: false; error: string; details?: unknown }> {
  try {
    const supabase = createAdminClient();
    const payload: Record<string, unknown> = {};
    if (input.title !== undefined) payload.title = String(input.title).trim();
    if (input.language !== undefined) {
      const langRaw = String(input.language).trim().toLowerCase();
      const allowed = ['ar', 'en', 'tr'] as const;
      if (!allowed.includes(langRaw as (typeof allowed)[number])) {
        return { ok: false, error: 'اللغة غير مدعومة', details: { language: input.language } };
      }
      payload.language = langRaw;
    }
    if (input.duration_minutes !== undefined) payload.duration_minutes = Number(input.duration_minutes);
    if (input.is_active !== undefined) payload.is_active = !!input.is_active;
    if (Object.keys(payload).length === 0) return { ok: true };
    const { error } = await supabase.from('exams').update(payload).eq('id', input.id);
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

export async function deleteExam(
  id: number,
): Promise<{ ok: true } | { ok: false; error: string; details?: unknown }> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('exams').delete().eq('id', id);
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

export type ListExamsQuery = {
  language?: string;
  is_active?: boolean;
  search?: string;
  sort_by?: 'created_at' | 'title';
  sort_dir?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
};

export async function listExams(
  query: ListExamsQuery,
): Promise<
  | { ok: true; exams: ExamRecord[]; page: number; perPage: number; total: number | null }
  | { ok: false; error: string; details?: unknown }
> {
  try {
    const sortBy = (query?.sort_by ?? 'created_at') as 'created_at' | 'title';
    const sortDir = (query?.sort_dir ?? 'desc') === 'asc' ? 'asc' : 'desc';
    const page = Number.isInteger(query?.page) && (query?.page as number) > 0 ? (query?.page as number) : 1;
    const perPageRaw =
      Number.isInteger(query?.per_page) && (query?.per_page as number) > 0 ? (query?.per_page as number) : 20;
    const perPage = Math.min(Math.max(perPageRaw, 1), 200);

    const supabase = createAdminClient();
    let builder = supabase
      .from('exams')
      .select('id,group_id,title,language,duration_minutes,is_active,created_at', { count: 'exact' });
    if (query.language) {
      const lang = String(query.language).trim().toLowerCase();
      const allowed = ['ar', 'en', 'tr'];
      if (allowed.includes(lang)) {
        builder = builder.eq('language', lang);
      }
    }
    if (query.is_active !== undefined) builder = builder.eq('is_active', !!query.is_active);
    if (query.search) {
      const term = String(query.search).trim().replace(/%/g, '\\%').replace(/_/g, '\\_');
      builder = builder.ilike('title', `%${term}%`);
    }
    builder = builder.order(sortBy, { ascending: sortDir === 'asc', nullsFirst: false });
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    builder = builder.range(from, to);
    const { data, error, count } = await builder;
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    const exams: ExamRecord[] = (data ?? []).map((row) => {
      const r = row as unknown as Record<string, unknown>;
      return {
        id: r.id as number,
        group_id: r.group_id as number,
        title: r.title as string,
        language: r.language as string,
        duration_minutes: r.duration_minutes as number,
        is_active: (r.is_active as boolean | undefined) ?? true,
        created_at: r.created_at as string,
      };
    });
    return { ok: true, exams, page, perPage, total: count ?? null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

async function ensureExamImagesBucket(): Promise<
  | { ok: true; bucket: string }
  | { ok: false; error: string; details?: unknown }
> {
  try {
    const supabase = createAdminClient();
    const bucket = 'exam-images';
    const { data: exists } = await supabase.storage.getBucket(bucket);
    if (!exists) {
      const { error: createErr } = await supabase.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: 1024 * 1024 * 10,
      });
      if (createErr) {
        return { ok: false, error: createErr.message, details: createErr };
      }
    }
    return { ok: true, bucket };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

type ImageInput =
  | { url: string }
  | { base64: string; filename: string; contentType: string };

async function uploadImage(
  input: ImageInput,
  opts?: { questionId?: number },
): Promise<
  | { ok: true; url: string }
  | { ok: false; error: string; details?: unknown }
> {
  try {
    if ('url' in input) {
      const u = String(input.url).trim();
      if (!u) return { ok: false, error: 'رابط الصورة غير صالح' };
      return { ok: true, url: u };
    }
    const supabase = createAdminClient();
    const ensured = await ensureExamImagesBucket();
    if (!ensured.ok) return ensured;
    const bucket = ensured.bucket;
    const stamp = Date.now();
    const rand = Math.random().toString(36).slice(2);
    const cleanName = input.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `exam-images/${new Date().getUTCFullYear()}/${String(
      new Date().getUTCMonth() + 1,
    ).padStart(2, '0')}/${
      opts?.questionId ? `${String(opts.questionId)}_` : ''
    }${stamp}_${rand}_${cleanName}`;
    const buf = Buffer.from(
      input.base64.includes('base64,')
        ? input.base64.split('base64,').pop() as string
        : input.base64,
      'base64',
    );
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, buf, {
      contentType: input.contentType,
      upsert: false,
    });
    if (upErr) {
      return { ok: false, error: upErr.message, details: upErr };
    }
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    const url = pub?.publicUrl ?? '';
    if (!url) return { ok: false, error: 'تعذر الحصول على رابط الصورة' };
    return { ok: true, url };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

type AddExamQuestionInput = {
  exam_id: number;
  question: string;
  image?: ImageInput;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
};

export async function addExamQuestion(
  input: AddExamQuestionInput,
): Promise<{ ok: true; question: QuestionRecord } | { ok: false; error: string; details?: unknown }> {
  try {
    const q = String(input?.question ?? '').trim();
    const oa = String(input?.option_a ?? '').trim();
    const ob = String(input?.option_b ?? '').trim();
    const oc = String(input?.option_c ?? '').trim();
    const od = String(input?.option_d ?? '').trim();
    const co = String(input?.correct_option ?? '').toUpperCase();
    if (!Number.isInteger(input?.exam_id) || (input?.exam_id as number) <= 0)
      return { ok: false, error: 'exam_id غير صالح' };
    if (!q) return { ok: false, error: 'نص السؤال مطلوب' };
    if (!oa || !ob || !oc || !od) return { ok: false, error: 'الخيارات مطلوبة' };
    if (!['A', 'B', 'C', 'D'].includes(co)) return { ok: false, error: 'الخيار الصحيح غير صالح' };

    const supabase = createAdminClient();
    const { data: inserted, error: insertErr } = await supabase
      .from('exam_questions')
      .insert({
        exam_id: input.exam_id,
        question: q,
        image_url: null,
        option_a: oa,
        option_b: ob,
        option_c: oc,
        option_d: od,
        correct_option: co,
      })
      .select(
        'id,exam_id,question,image_url,option_a,option_b,option_c,option_d,correct_option',
      )
      .single();
    if (insertErr) {
      return { ok: false, error: insertErr.message, details: insertErr };
    }
    const r = inserted as unknown as Record<string, unknown>;
    let finalImageUrl: string | null = null;
    if (input.image) {
      if ('url' in input.image) {
        const candidate = String(input.image.url).trim();
        if (!candidate) {
          return { ok: false, error: 'رابط الصورة غير صالح' };
        }
        const { data: dupe } = await supabase
          .from('exam_questions')
          .select('id')
          .eq('image_url', candidate)
          .limit(1);
        const exists = (dupe ?? []).find((row) => (row as unknown as { id: number }).id !== (r.id as number));
        if (exists) {
          return { ok: false, error: 'هذه الصورة مستخدمة لسؤال آخر' };
        }
        finalImageUrl = candidate;
      } else {
        const uploaded = await uploadImage(input.image, { questionId: r.id as number });
        if (!uploaded.ok) return uploaded;
        finalImageUrl = uploaded.url;
      }
      if (finalImageUrl) {
        const { error: updErr } = await supabase
          .from('exam_questions')
          .update({ image_url: finalImageUrl })
          .eq('id', r.id as number);
        if (updErr) {
          return { ok: false, error: updErr.message, details: updErr };
        }
      }
    }
    const rec: QuestionRecord = {
      id: r.id as number,
      exam_id: r.exam_id as number,
      question: r.question as string,
      image_url: finalImageUrl ?? ((r.image_url as string | null) ?? null),
      option_a: r.option_a as string,
      option_b: r.option_b as string,
      option_c: r.option_c as string,
      option_d: r.option_d as string,
      correct_option: r.correct_option as 'A' | 'B' | 'C' | 'D',
    };
    return { ok: true, question: rec };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

type UpdateExamQuestionInput = {
  id: number;
  question?: string;
  image?: ImageInput | { remove: true } | null;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_option?: 'A' | 'B' | 'C' | 'D';
};

export async function updateExamQuestion(
  input: UpdateExamQuestionInput,
): Promise<{ ok: true } | { ok: false; error: string; details?: unknown }> {
  try {
    const supabase = createAdminClient();
    const { data: currentRow, error: fetchErr } = await supabase
      .from('exam_questions')
      .select('id,image_url')
      .eq('id', input.id)
      .maybeSingle();
    if (fetchErr) {
      return { ok: false, error: fetchErr.message, details: fetchErr };
    }
    if (!currentRow) {
      return { ok: false, error: 'السؤال غير موجود' };
    }
    const payload: Record<string, unknown> = {};
    if (input.question !== undefined) payload.question = String(input.question).trim();
    if (input.option_a !== undefined) payload.option_a = String(input.option_a).trim();
    if (input.option_b !== undefined) payload.option_b = String(input.option_b).trim();
    if (input.option_c !== undefined) payload.option_c = String(input.option_c).trim();
    if (input.option_d !== undefined) payload.option_d = String(input.option_d).trim();
    if (input.correct_option !== undefined) payload.correct_option = input.correct_option;
    if (input.image !== undefined) {
      if (input.image === null) {
        payload.image_url = null;
      } else if ((input.image as { remove?: boolean })?.remove) {
        payload.image_url = null;
      } else {
        if ('url' in (input.image as ImageInput)) {
          const candidate = String((input.image as { url: string }).url).trim();
          if (!candidate) return { ok: false, error: 'رابط الصورة غير صالح' };
          const { data: dupe } = await supabase
            .from('exam_questions')
            .select('id')
            .eq('image_url', candidate)
            .limit(1);
          const exists = (dupe ?? []).find((row) => (row as unknown as { id: number }).id !== (input.id as number));
          if (exists) return { ok: false, error: 'هذه الصورة مستخدمة لسؤال آخر' };
          payload.image_url = candidate;
        } else {
          const uploaded = await uploadImage(input.image as ImageInput, { questionId: input.id });
          if (!uploaded.ok) return uploaded;
          payload.image_url = uploaded.url;
        }
      }
    }
    const { error } = await supabase.from('exam_questions').update(payload).eq('id', input.id);
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

export async function deleteExamQuestion(
  id: number,
): Promise<{ ok: true } | { ok: false; error: string; details?: unknown }> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('exam_questions').delete().eq('id', id);
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

export async function countExams(input?: {
  created_from?: string;
  created_to?: string;
}): Promise<{ ok: true; total: number } | { ok: false; error: string; details?: unknown }> {
  try {
    const supabase = createAdminClient();
    let builder = supabase.from('exams').select('id', { count: 'exact' });
    if (input?.created_from) builder = builder.gte('created_at', input.created_from);
    if (input?.created_to) {
      const d = new Date(String(input.created_to).replace('+00:00', 'Z'));
      d.setUTCHours(23, 59, 59, 999);
      const toIso = d.toISOString().replace('Z', '+00:00');
      builder = builder.lte('created_at', toIso);
    }
    const { error, count } = await builder;
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    return { ok: true, total: count ?? 0 };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export async function countQuestions(): Promise<
  { ok: true; total: number } | { ok: false; error: string; details?: unknown }
> {
  try {
    const supabase = createAdminClient();
    const { error, count } = await supabase.from('exam_questions').select('id', { count: 'exact' });
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    return { ok: true, total: count ?? 0 };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export async function listExamQuestions(
  examId: number,
): Promise<{ ok: true; questions: QuestionRecord[] } | { ok: false; error: string; details?: unknown }> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('exam_questions')
      .select(
        'id,exam_id,question,image_url,option_a,option_b,option_c,option_d,correct_option',
      )
      .eq('exam_id', examId)
      .order('id', { ascending: true });
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    const questions: QuestionRecord[] = (data ?? []).map((row) => {
      const r = row as unknown as Record<string, unknown>;
      return {
        id: r.id as number,
        exam_id: r.exam_id as number,
        question: r.question as string,
        image_url: (r.image_url as string | null) ?? null,
        option_a: r.option_a as string,
        option_b: r.option_b as string,
        option_c: r.option_c as string,
        option_d: r.option_d as string,
        correct_option: r.correct_option as 'A' | 'B' | 'C' | 'D',
      };
    });
    return { ok: true, questions };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export async function getExamWithQuestions(
  examId: number,
): Promise<
  | { ok: true; exam: ExamRecord; questions: QuestionRecord[] }
  | { ok: false; error: string; details?: unknown }
> {
  try {
    const supabase = createAdminClient();
    const { data: examRow, error: examErr } = await supabase
      .from('exams')
      .select('id,group_id,title,language,duration_minutes,is_active,created_at')
      .eq('id', examId)
      .maybeSingle();
    if (examErr) {
      return { ok: false, error: examErr.message, details: examErr };
    }
    if (!examRow) {
      return { ok: false, error: 'الامتحان غير موجود' };
    }
    const e = examRow as unknown as Record<string, unknown>;
    const exam: ExamRecord = {
      id: e.id as number,
      group_id: e.group_id as number,
      title: e.title as string,
      language: e.language as string,
      duration_minutes: e.duration_minutes as number,
      is_active: (e.is_active as boolean | undefined) ?? true,
      created_at: e.created_at as string,
    };
    const qRes = await listExamQuestions(examId);
    if (!qRes.ok) return qRes;
    return { ok: true, exam, questions: qRes.questions };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

type AutoCreateExamInput = {
  group_id: number;
  title: string;
  language: string;
  duration_minutes: number;
  is_active?: boolean;
  questions: Array<{
    question: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: 'A' | 'B' | 'C' | 'D';
    image?: ImageInput;
  }>;
  pick?: number;
};

export async function autoCreateExam(
  input: AutoCreateExamInput,
): Promise<
  | { ok: true; exam: ExamRecord; createdQuestions: number }
  | { ok: false; error: string; details?: unknown }
> {
  try {
    const created = await createExam({
      group_id: input.group_id,
      title: input.title,
      language: input.language,
      duration_minutes: input.duration_minutes,
      is_active: input.is_active ?? true,
    });
    if (!created.ok) return created;
    const examId = created.exam.id;
    const src = input.questions ?? [];
    const pick =
      Number.isInteger(input.pick) && (input.pick as number) > 0
        ? Math.min(src.length, input.pick as number)
        : src.length;
    const selected: typeof src = [];
    const indices = Array.from({ length: src.length }, (_, i) => i);
    for (let i = 0; i < pick && indices.length > 0; i++) {
      const idx = Math.floor(Math.random() * indices.length);
      const chosen = indices.splice(idx, 1)[0]!;
      selected.push(src[chosen]!);
    }
    let count = 0;
    for (const q of selected) {
      const res = await addExamQuestion({
        exam_id: examId,
        question: q.question,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_option: q.correct_option,
        image: q.image,
      });
      if (res.ok) count += 1;
    }
    return { ok: true, exam: created.exam, createdQuestions: count };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export type ExamGroupRecord = {
  id: number;
  title: string;
  language: string;
  is_active: boolean;
  created_at: string;
};

type CreateExamGroupInput = {
  title: string;
  language: string;
  is_active?: boolean;
};

export async function createExamGroup(
  input: CreateExamGroupInput,
): Promise<{ ok: true; group: ExamGroupRecord } | { ok: false; error: string; details?: unknown }> {
  try {
    const title = String(input?.title ?? '').trim();
    const langRaw = String(input?.language ?? '').trim().toLowerCase();
    const allowed = ['ar', 'en', 'tr'] as const;
    const language = allowed.includes(langRaw as (typeof allowed)[number]) ? langRaw : '';
    const isActive = input?.is_active ?? true;
    if (!title) return { ok: false, error: 'العنوان مطلوب' };
    if (!language) return { ok: false, error: 'اللغة غير مدعومة' };
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('exam_groups')
      .insert({ title, language, is_active: isActive })
      .select('id,title,language,is_active,created_at')
      .single();
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    const r = data as unknown as Record<string, unknown>;
    const group: ExamGroupRecord = {
      id: r.id as number,
      title: r.title as string,
      language: r.language as string,
      is_active: (r.is_active as boolean | undefined) ?? true,
      created_at: r.created_at as string,
    };
    return { ok: true, group };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export async function listExamGroups(): Promise<
  { ok: true; groups: ExamGroupRecord[] } | { ok: false; error: string; details?: unknown }
> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('exam_groups')
      .select('id,title,language,is_active,created_at')
      .order('created_at', { ascending: false });
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    const groups: ExamGroupRecord[] = (data ?? []).map((row) => {
      const r = row as unknown as Record<string, unknown>;
      return {
        id: r.id as number,
        title: r.title as string,
        language: r.language as string,
        is_active: (r.is_active as boolean | undefined) ?? true,
        created_at: r.created_at as string,
      };
    });
    return { ok: true, groups };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}
