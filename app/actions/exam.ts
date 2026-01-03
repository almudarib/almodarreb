'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export type ExamRecord = {
  id: number;
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
  title: string;
  language: string;
  duration_minutes: number;
  is_active?: boolean;
};

export async function createExam(
  input: CreateExamInput,
): Promise<{ ok: true; exam: ExamRecord } | { ok: false; error: string; details?: unknown }> {
  try {
    const title = String(input?.title ?? '').trim();
    const language = String(input?.language ?? '').trim();
    const duration = Number(input?.duration_minutes ?? 0);
    const isActive = input?.is_active ?? true;
    if (!title) return { ok: false, error: 'العنوان مطلوب' };
    if (!language) return { ok: false, error: 'اللغة مطلوبة' };
    if (!Number.isInteger(duration) || duration <= 0)
      return { ok: false, error: 'المدة يجب أن تكون عددًا صحيحًا موجبًا' };

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('exams')
      .insert({
        title,
        language,
        duration_minutes: duration,
        is_active: isActive,
      })
      .select('id,title,language,duration_minutes,is_active,created_at')
      .single();
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    const r = data as unknown as Record<string, unknown>;
    const exam: ExamRecord = {
      id: r.id as number,
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
    if (input.language !== undefined) payload.language = String(input.language).trim();
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
      .select('id,title,language,duration_minutes,is_active,created_at', { count: 'exact' });
    if (query.language) builder = builder.eq('language', String(query.language).trim());
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

async function uploadImage(input: ImageInput): Promise<
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
    const path = `exams/${new Date().getUTCFullYear()}/${String(
      new Date().getUTCMonth() + 1,
    ).padStart(2, '0')}/${stamp}_${rand}_${cleanName}`;
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

    let imageUrl: string | null = null;
    if (input.image) {
      const uploaded = await uploadImage(input.image);
      if (!uploaded.ok) return uploaded;
      imageUrl = uploaded.url;
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('exam_questions')
      .insert({
        exam_id: input.exam_id,
        question: q,
        image_url: imageUrl,
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
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    const r = data as unknown as Record<string, unknown>;
    const rec: QuestionRecord = {
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
        const uploaded = await uploadImage(input.image as ImageInput);
        if (!uploaded.ok) return uploaded;
        payload.image_url = uploaded.url;
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
      .select('id,title,language,duration_minutes,is_active,created_at')
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
