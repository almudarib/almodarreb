/**
 * Validates and normalizes input for creating and listing students.
 * This module is plain JS to enable Node's built-in test runner.
 */

function isString(v) {
  return typeof v === 'string';
}

function isNonEmptyString(v) {
  return isString(v) && v.trim().length > 0;
}

function isBoolean(v) {
  return typeof v === 'boolean';
}

function isNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function isInteger(v) {
  return Number.isInteger(v);
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

function isUUID(v) {
  if (!isString(v)) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
}

function toISODateTime(v) {
  if (v === null || v === undefined || v === '') return undefined;
  const d = v instanceof Date ? v : new Date(String(v));
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString().replace('Z', '+00:00');
}

function toISODate(v) {
  if (v === null || v === undefined || v === '') return undefined;
  const d = v instanceof Date ? v : new Date(String(v));
  if (isNaN(d.getTime())) return undefined;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function validateEmail(email) {
  if (!isNonEmptyString(email)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validate and normalize payload for adding a student.
 * Supports either providing an existing auth_user_id or creating a new auth user.
 *
 * Input shape:
 * {
 *   name: string,
 *   national_id: string,
 *   language: string,
 *   exam_datetime?: string|Date,
 *   start_date?: string|Date,
 *   registration_date?: string|Date,
 *   last_login_at?: string|Date,
 *   notes?: string,
 *   status?: string,
 *   show_exams?: boolean,
 *   teacher_id: number,
 *   auth?: { auth_user_id: string } | { create_auth: { email: string, password: string } }
 * }
 */
function validateAddStudentInput(input) {
  const errors = {};
  const out = {};

  // name
  if (!isNonEmptyString(input?.name)) {
    errors.name = 'name مطلوب ويجب أن يكون نصًا غير فارغ';
  } else if (String(input.name).trim().length > 255) {
    errors.name = 'name يجب ألا يتجاوز 255 حرفًا';
  } else {
    out.name = String(input.name).trim();
  }

  // national_id
  if (!isNonEmptyString(input?.national_id)) {
    errors.national_id = 'national_id مطلوب ويجب أن يكون نصًا';
  } else {
    const ni = String(input.national_id).trim();
    if (!/^\d{10,20}$/.test(ni)) {
      errors.national_id =
        'national_id يجب أن يكون أرقامًا فقط بطول بين 10 و20';
    } else {
      out.national_id = ni;
    }
  }

  // language لم يعد مطلوبًا في الإدخال

  // teacher_id
  if (!isNumber(input?.teacher_id) || !isInteger(input.teacher_id) || input.teacher_id <= 0) {
    errors.teacher_id = 'teacher_id مطلوب ويجب أن يكون عددًا صحيحًا موجبًا';
  } else {
    out.teacher_id = input.teacher_id;
  }

  // status (optional)
  if (input?.status !== undefined) {
    if (!isNonEmptyString(input.status)) {
      errors.status = 'status يجب أن يكون نصًا غير فارغ عند تحديده';
    } else {
      out.status = String(input.status).trim();
    }
  }

  // show_exams (optional)
  if (input?.show_exams !== undefined) {
    if (!isBoolean(input.show_exams)) {
      errors.show_exams = 'show_exams يجب أن يكون قيمة منطقية';
    } else {
      out.show_exams = !!input.show_exams;
    }
  }

  // notes (optional)
  if (input?.notes !== undefined) {
    if (!isString(input.notes)) {
      errors.notes = 'notes يجب أن يكون نصًا';
    } else {
      const n = String(input.notes);
      out.notes = n.length > 5000 ? n.slice(0, 5000) : n;
    }
  }

  // timestamps/dates
  const examDt = toISODateTime(input?.exam_datetime);
  if (input?.exam_datetime !== undefined && !examDt) {
    errors.exam_datetime = 'exam_datetime يجب أن يكون تاريخًا/وقتًا صالحًا';
  } else if (examDt) {
    out.exam_datetime = examDt;
  }

  const startDate = toISODate(input?.start_date);
  if (input?.start_date !== undefined && !startDate) {
    errors.start_date = 'start_date يجب أن يكون تاريخًا صالحًا';
  } else if (startDate) {
    out.start_date = startDate;
  }

  const regDate = toISODate(input?.registration_date);
  if (input?.registration_date !== undefined && !regDate) {
    errors.registration_date = 'registration_date يجب أن يكون تاريخًا صالحًا';
  } else if (regDate) {
    out.registration_date = regDate;
  }

  const lastLoginAt = toISODateTime(input?.last_login_at);
  if (input?.last_login_at !== undefined && !lastLoginAt) {
    errors.last_login_at = 'last_login_at يجب أن يكون تاريخًا/وقتًا صالحًا';
  } else if (lastLoginAt) {
    out.last_login_at = lastLoginAt;
  }

  const auth = input?.auth;
  if (auth && typeof auth === 'object') {
    if (auth.auth_user_id !== undefined) {
      if (!isUUID(auth.auth_user_id)) {
        errors.auth_user_id = 'auth_user_id يجب أن يكون UUID صالحًا';
      } else {
        out.auth_user_id = String(auth.auth_user_id);
      }
    } else if (auth.create_auth !== undefined) {
      const ca = auth.create_auth;
      if (!validateEmail(ca?.email)) {
        errors.email = 'email غير صالح';
      }
      if (!isNonEmptyString(ca?.password) || String(ca.password).length < 8) {
        errors.password = 'password يجب ألا يقل عن 8 أحرف';
      }
      if (!errors.email && !errors.password) {
        out.create_auth = { email: String(ca.email).trim(), password: String(ca.password) };
      }
    }
  }

  const ok = Object.keys(errors).length === 0;
  return ok ? { ok, value: out } : { ok, errors };
}

/**
 * Validate and normalize list query filters.
 * Input:
 * {
 *   status?: string,
 *   language?: string,
 *   teacher_id?: number,
 *   search?: string, // matches name or national_id
 *   show_exams?: boolean,
 *   registration_date_from?: string|Date,
 *   registration_date_to?: string|Date,
 *   created_at_from?: string|Date,
 *   created_at_to?: string|Date,
 *   sort_by?: 'created_at'|'name'|'exam_datetime'|'registration_date',
 *   sort_dir?: 'asc'|'desc',
 *   page?: number,
 *   per_page?: number
 * }
 */
function validateListStudentsQuery(query) {
  const errors = {};
  const out = {};

  if (query?.status !== undefined) {
    if (!isNonEmptyString(query.status)) {
      errors.status = 'status يجب أن يكون نصًا غير فارغ';
    } else {
      out.status = String(query.status).trim();
    }
  }
  if (query?.teacher_id !== undefined) {
    if (!isInteger(query.teacher_id) || query.teacher_id <= 0) {
      errors.teacher_id = 'teacher_id يجب أن يكون عددًا صحيحًا موجبًا';
    } else {
      out.teacher_id = query.teacher_id;
    }
  }
  if (query?.search !== undefined) {
    if (!isNonEmptyString(query.search)) {
      errors.search = 'search يجب أن يكون نصًا غير فارغ';
    } else {
      out.search = String(query.search).trim();
    }
  }
  if (query?.show_exams !== undefined) {
    if (!isBoolean(query.show_exams)) {
      errors.show_exams = 'show_exams يجب أن يكون قيمة منطقية';
    } else {
      out.show_exams = !!query.show_exams;
    }
  }

  const rdf = toISODate(query?.registration_date_from);
  if (query?.registration_date_from !== undefined && !rdf) {
    errors.registration_date_from = 'registration_date_from يجب أن يكون تاريخًا صالحًا';
  } else if (rdf) {
    out.registration_date_from = rdf;
  }
  const rdt = toISODate(query?.registration_date_to);
  if (query?.registration_date_to !== undefined && !rdt) {
    errors.registration_date_to = 'registration_date_to يجب أن يكون تاريخًا صالحًا';
  } else if (rdt) {
    out.registration_date_to = rdt;
  }

  const caf = toISODateTime(query?.created_at_from);
  if (query?.created_at_from !== undefined && !caf) {
    errors.created_at_from = 'created_at_from يجب أن يكون تاريخًا/وقتًا صالحًا';
  } else if (caf) {
    out.created_at_from = caf;
  }
  const cat = toISODateTime(query?.created_at_to);
  if (query?.created_at_to !== undefined && !cat) {
    errors.created_at_to = 'created_at_to يجب أن يكون تاريخًا/وقتًا صالحًا';
  } else if (cat) {
    out.created_at_to = cat;
  }

  // exam_datetime range (optional)
  const edf = toISODateTime(query?.exam_datetime_from);
  if (query?.exam_datetime_from !== undefined && !edf) {
    errors.exam_datetime_from = 'exam_datetime_from يجب أن يكون تاريخًا/وقتًا صالحًا';
  } else if (edf) {
    out.exam_datetime_from = edf;
  }
  const edt = toISODateTime(query?.exam_datetime_to);
  if (query?.exam_datetime_to !== undefined && !edt) {
    errors.exam_datetime_to = 'exam_datetime_to يجب أن يكون تاريخًا/وقتًا صالحًا';
  } else if (edt) {
    out.exam_datetime_to = edt;
  }

  const allowedSort = ['created_at', 'name', 'exam_datetime', 'registration_date'];
  const sortBy = query?.sort_by && allowedSort.includes(query.sort_by)
    ? query.sort_by
    : 'created_at';
  const sortDir = query?.sort_dir === 'asc' ? 'asc' : 'desc';
  out.sort_by = sortBy;
  out.sort_dir = sortDir;

  const page = isInteger(query?.page) && query.page > 0 ? query.page : 1;
  const perPageRaw = isInteger(query?.per_page) && query.per_page > 0 ? query.per_page : 20;
  const perPage = clamp(perPageRaw, 1, 200);
  out.page = page;
  out.per_page = perPage;

  const ok = Object.keys(errors).length === 0;
  return ok ? { ok, value: out } : { ok, errors };
}

module.exports = {
  validateAddStudentInput,
  validateListStudentsQuery,
  // expose helpers for tests if needed
  _internals: { isUUID, toISODateTime, toISODate, validateEmail },
};
