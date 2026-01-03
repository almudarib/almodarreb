function isString(v) {
  return typeof v === 'string';
}
function isNonEmptyString(v) {
  return isString(v) && v.trim().length > 0;
}
function isBoolean(v) {
  return typeof v === 'boolean';
}
function isInteger(v) {
  return Number.isInteger(v);
}
const allowedVideoMimes = [
  'video/mp4',
  'video/x-msvideo', // avi
  'video/avi',
  'video/quicktime', // mov
  'video/webm',
  'video/x-matroska', // mkv
];
const allowedFileMimes = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const videoExts = ['.mp4', '.avi', '.mov', '.webm', '.mkv', '.mpg', '.mpeg'];
const fileExts = ['.pdf', '.ppt', '.pptx', '.doc', '.docx'];
const MAX_VIDEO_BYTES = 1024 * 1024 * 500;
const MAX_FILE_BYTES = 1024 * 1024 * 50;
function normalizeExt(name) {
  const n = String(name ?? '').toLowerCase();
  const idx = n.lastIndexOf('.');
  return idx >= 0 ? n.slice(idx) : '';
}
function isAllowedMime(ct) {
  const t = String(ct ?? '').toLowerCase();
  return allowedVideoMimes.includes(t) || allowedFileMimes.includes(t);
}
function isHttpUrl(u) {
  const s = String(u ?? '').trim().toLowerCase();
  return s.startsWith('http://') || s.startsWith('https://');
}
function isStorageRef(u) {
  const s = String(u ?? '').trim();
  if (!s.startsWith('storage://')) return false;
  const without = s.slice('storage://'.length);
  const idx = without.indexOf('/');
  if (idx <= 0) return false;
  const bucket = without.slice(0, idx);
  const path = without.slice(idx + 1);
  if (!bucket || !path) return false;
  if (bucket !== 'session-videos') return false;
  if (!path.startsWith('sessions/')) return false;
  return true;
}
function isYouTubeUrl(u) {
  if (!isHttpUrl(u)) return false;
  const s = String(u ?? '').trim().toLowerCase();
  return s.includes('youtube.com/') || s.includes('youtu.be/');
}
function parseYouTubeId(u) {
  try {
    const raw = String(u ?? '').trim();
    if (!isYouTubeUrl(raw)) return null;
    const url = new URL(raw);
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
function isAllowedUrl(u) {
  if (isStorageRef(u)) return true;
  if (!isHttpUrl(u)) return false;
  const e = normalizeExt(u);
  return isYouTubeUrl(u) || videoExts.includes(e) || fileExts.includes(e);
}
function inferKind(ct, filename, url) {
  const e = normalizeExt(filename ?? url ?? '');
  const t = String(ct ?? '').toLowerCase();
  if (allowedVideoMimes.includes(t) || videoExts.includes(e)) return 'video';
  if (allowedFileMimes.includes(t) || fileExts.includes(e)) return 'file';
  return 'unknown';
}
function estimateBase64SizeBytes(b64) {
  const raw = String(b64 ?? '');
  const payload = raw.includes('base64,') ? raw.split('base64,').pop() : raw;
  try {
    return Buffer.from(payload, 'base64').length;
  } catch {
    return 0;
  }
}
function validateCreateSessionInput(input) {
  const errors = {};
  const out = {};
  if (!isNonEmptyString(input?.title)) {
    errors.title = 'title مطلوب';
  } else if (String(input.title).trim().length > 255) {
    errors.title = 'title طويل جدًا';
  } else {
    out.title = String(input.title).trim();
  }
  if (!isNonEmptyString(input?.language)) {
    errors.language = 'language مطلوب';
  } else {
    out.language = String(input.language).trim();
  }
  if (input?.order_number !== undefined) {
    if (!isInteger(input.order_number) || input.order_number <= 0) {
      errors.order_number = 'order_number يجب أن يكون عددًا موجبًا';
    } else {
      out.order_number = input.order_number;
    }
  }
  if (input?.is_active !== undefined) {
    if (!isBoolean(input.is_active)) {
      errors.is_active = 'is_active يجب أن يكون قيمة منطقية';
    } else {
      out.is_active = !!input.is_active;
    }
  } else {
    out.is_active = true;
  }
  const c = input?.content;
  if (!c) {
    errors.content = 'content مطلوب';
  } else if (isNonEmptyString(c.url)) {
    const u = String(c.url).trim();
    if (!isAllowedUrl(u)) {
      errors.content = 'رابط غير مدعوم';
    } else {
      const kind = inferKind(undefined, undefined, u);
      const ytId = parseYouTubeId(u);
      out.content = ytId ? { kind, url: u, youtubeId: ytId } : { kind, url: u };
    }
  } else if (isNonEmptyString(c.base64) && isNonEmptyString(c.filename) && isNonEmptyString(c.contentType)) {
    const ct = String(c.contentType).trim().toLowerCase();
    const fn = String(c.filename).trim();
    if (!isAllowedMime(ct)) {
      errors.content = 'نوع الملف غير مدعوم';
    } else {
      const sizeBytes = estimateBase64SizeBytes(c.base64);
      const kind = inferKind(ct, fn);
      const limit = kind === 'video' ? MAX_VIDEO_BYTES : MAX_FILE_BYTES;
      if (sizeBytes <= 0) {
        errors.content = 'بيانات الملف غير صالحة';
      } else if (sizeBytes > limit) {
        errors.content = 'الحجم يتجاوز الحد المسموح';
      } else {
        out.content = { kind, base64: c.base64, filename: fn, contentType: ct, sizeBytes };
      }
    }
  } else {
    errors.content = 'بنية content غير صحيحة';
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: out };
}
function validateUpdateSessionInput(input) {
  const errors = {};
  const out = { id: input?.id };
  if (!isInteger(out.id) || out.id <= 0) {
    errors.id = 'id غير صالح';
  }
  if (input?.title !== undefined) {
    if (!isNonEmptyString(input.title)) errors.title = 'title مطلوب';
    else if (String(input.title).trim().length > 255) errors.title = 'title طويل جدًا';
    else out.title = String(input.title).trim();
  }
  if (input?.language !== undefined) {
    if (!isNonEmptyString(input.language)) errors.language = 'language مطلوب';
    else out.language = String(input.language).trim();
  }
  if (input?.order_number !== undefined) {
    if (!isInteger(input.order_number) || input.order_number <= 0) {
      errors.order_number = 'order_number يجب أن يكون عددًا موجبًا';
    } else {
      out.order_number = input.order_number;
    }
  }
  if (input?.is_active !== undefined) {
    if (!isBoolean(input.is_active)) {
      errors.is_active = 'is_active يجب أن يكون قيمة منطقية';
    } else {
      out.is_active = !!input.is_active;
    }
  }
  if (input?.content !== undefined && input.content !== null) {
    const c = input.content;
    if (isNonEmptyString(c.url)) {
      const u = String(c.url).trim();
      if (!isAllowedUrl(u)) {
        errors.content = 'رابط غير مدعوم';
      } else {
        const kind = inferKind(undefined, undefined, u);
        const ytId = parseYouTubeId(u);
        out.content = ytId ? { kind, url: u, youtubeId: ytId } : { kind, url: u };
      }
    } else if (isNonEmptyString(c.base64) && isNonEmptyString(c.filename) && isNonEmptyString(c.contentType)) {
      const ct = String(c.contentType).trim().toLowerCase();
      const fn = String(c.filename).trim();
      if (!isAllowedMime(ct)) {
        errors.content = 'نوع الملف غير مدعوم';
      } else {
        const sizeBytes = estimateBase64SizeBytes(c.base64);
        const kind = inferKind(ct, fn);
        const limit = kind === 'video' ? MAX_VIDEO_BYTES : MAX_FILE_BYTES;
        if (sizeBytes <= 0) {
          errors.content = 'بيانات الملف غير صالحة';
        } else if (sizeBytes > limit) {
          errors.content = 'الحجم يتجاوز الحد المسموح';
        } else {
          out.content = { kind, base64: c.base64, filename: fn, contentType: ct, sizeBytes };
        }
      }
    } else {
      errors.content = 'بنية content غير صحيحة';
    }
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: out };
}
function validateListSessionsQuery(query) {
  const errors = {};
  const out = {};
  if (query?.language !== undefined) {
    if (!isNonEmptyString(query.language)) errors.language = 'language غير صالح';
    else out.language = String(query.language).trim();
  }
  if (query?.is_active !== undefined) {
    if (!isBoolean(query.is_active)) errors.is_active = 'is_active غير صالح';
    else out.is_active = !!query.is_active;
  }
  if (query?.kind !== undefined) {
    const k = String(query.kind).trim().toLowerCase();
    if (k !== 'video' && k !== 'file') errors.kind = 'kind غير صالح';
    else out.kind = k;
  }
  if (query?.search !== undefined) {
    if (!isNonEmptyString(query.search)) errors.search = 'search غير صالح';
    else out.search = String(query.search).trim();
  }
  if (query?.sort_by !== undefined) {
    const s = String(query.sort_by).trim();
    if (!['created_at', 'title', 'order_number'].includes(s)) errors.sort_by = 'sort_by غير صالح';
    else out.sort_by = s;
  } else {
    out.sort_by = 'created_at';
  }
  if (query?.sort_dir !== undefined) {
    const d = String(query.sort_dir).trim().toLowerCase();
    out.sort_dir = d === 'asc' ? 'asc' : 'desc';
  } else {
    out.sort_dir = 'desc';
  }
  const page = Number.isInteger(query?.page) && query.page > 0 ? query.page : 1;
  const perRaw = Number.isInteger(query?.per_page) && query.per_page > 0 ? query.per_page : 20;
  const perPage = Math.min(Math.max(perRaw, 1), 200);
  out.page = page;
  out.per_page = perPage;
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: out };
}
module.exports = {
  validateCreateSessionInput,
  validateUpdateSessionInput,
  validateListSessionsQuery,
  _internals: {
    isAllowedMime,
    isAllowedUrl,
    inferKind,
    estimateBase64SizeBytes,
    MAX_VIDEO_BYTES,
    MAX_FILE_BYTES,
    videoExts,
    fileExts,
    isYouTubeUrl,
    parseYouTubeId,
  },
};
