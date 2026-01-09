import assert from 'node:assert';
import test from 'node:test';
import pkg from '../lib/validation/students.js';
const { validateAddStudentInput, validateListStudentsQuery, _internals } = pkg;

test('validateAddStudentInput: valid with existing auth_user_id', () => {
  const input = {
    name: 'Student One',
    national_id: '1234567890',
    language: 'ar',
    teacher_id: 1,
    status: 'active',
    show_exams: true,
    exam_datetime: new Date(),
    start_date: '2025-01-01',
    registration_date: '2025-01-02',
    last_login_at: new Date(),
    notes: 'note',
    auth: { auth_user_id: '8d3f4b2a-5c66-4a4d-9a2a-8f0b2cbceaaa' },
  };
  const r = validateAddStudentInput(input);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.value.name, 'Student One');
  assert.strictEqual(r.value.national_id, '1234567890');
  assert.strictEqual(_internals.isUUID(r.value.auth_user_id), true);
});

test('validateAddStudentInput: invalid national_id', () => {
  const input = {
    name: 'x',
    national_id: 'ABC123',
    language: 'ar',
    teacher_id: 1,
    auth: { auth_user_id: '8d3f4b2a-5c66-4a4d-9a2a-8f0b2cbceaaa' },
  };
  const r = validateAddStudentInput(input);
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.national_id);
});

test('validateAddStudentInput: create_auth path', () => {
  const input = {
    name: 'Student Two',
    national_id: '123456789012',
    language: 'en',
    teacher_id: 2,
    auth: { create_auth: { email: 's2@example.com', password: 'longpass123' } },
  };
  const r = validateAddStudentInput(input);
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(r.value.create_auth, {
    email: 's2@example.com',
    password: 'longpass123',
  });
});

test('validateAddStudentInput: supports turkish language', () => {
  const input = {
    name: 'Student Three',
    national_id: '123456789012',
    language: 'tr',
    teacher_id: 3,
    auth: { auth_user_id: '8d3f4b2a-5c66-4a4d-9a2a-8f0b2cbceaaa' },
  };
  const r = validateAddStudentInput(input);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.value.language, 'tr');
});

test('validateListStudentsQuery: defaults and normalization', () => {
  const q = validateListStudentsQuery({});
  assert.strictEqual(q.ok, true);
  assert.strictEqual(q.value.page, 1);
  assert.strictEqual(q.value.per_page, 20);
  assert.strictEqual(q.value.sort_by, 'created_at');
  assert.strictEqual(q.value.sort_dir, 'desc');
});

test('validateListStudentsQuery: filters and pagination', () => {
  const q = validateListStudentsQuery({
    status: 'active',
    teacher_id: 5,
    search: 'ali',
    show_exams: false,
    registration_date_from: '2025-01-01',
    registration_date_to: '2025-02-01',
    created_at_from: new Date('2025-01-01T00:00:00Z'),
    created_at_to: new Date('2025-01-31T23:59:59Z'),
    sort_by: 'name',
    sort_dir: 'asc',
    page: 2,
    per_page: 50,
  });
  assert.strictEqual(q.ok, true);
  assert.strictEqual(q.value.status, 'active');
  assert.strictEqual(q.value.teacher_id, 5);
  assert.strictEqual(q.value.sort_by, 'name');
  assert.strictEqual(q.value.sort_dir, 'asc');
  assert.strictEqual(q.value.page, 2);
  assert.strictEqual(q.value.per_page, 50);
});
