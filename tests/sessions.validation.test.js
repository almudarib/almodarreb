import assert from 'node:assert';
import test from 'node:test';
import pkg from '../lib/validation/sessions.js';
const {
  validateCreateSessionInput,
  validateUpdateSessionInput,
  validateListSessionsQuery,
  _internals,
} = pkg;

test('validateCreateSessionInput: valid URL video', () => {
  const input = {
    title: 'درس 1',
    language: 'AR',
    is_active: true,
    content: { url: 'https://cdn.example.com/intro.mp4' },
  };
  const r = validateCreateSessionInput(input);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.value.title, 'درس 1');
  assert.strictEqual(r.value.language, 'AR');
  assert.strictEqual(r.value.is_active, true);
  assert.strictEqual(r.value.content.kind, 'video');
});

test('validateCreateSessionInput: valid base64 pdf', () => {
  const payload = Buffer.from('hello').toString('base64');
  const input = {
    title: 'ملف',
    language: 'AR',
    content: {
      base64: payload,
      filename: 'slides.pdf',
      contentType: 'application/pdf',
    },
  };
  const r = validateCreateSessionInput(input);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.value.content.kind, 'file');
  assert.ok(r.value.content.sizeBytes > 0);
});

test('validateCreateSessionInput: reject unknown mime', () => {
  const payload = Buffer.from('hello').toString('base64');
  const input = {
    title: 'x',
    language: 'AR',
    content: {
      base64: payload,
      filename: 'x.xyz',
      contentType: 'application/octet-stream',
    },
  };
  const r = validateCreateSessionInput(input);
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.content);
});

test('validateUpdateSessionInput: accepts optional fields', () => {
  const payload = Buffer.from('hello').toString('base64');
  const r = validateUpdateSessionInput({
    id: 1,
    title: 'عنوان',
    content: { base64: payload, filename: 'doc.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.value.id, 1);
  assert.strictEqual(r.value.title, 'عنوان');
});

test('validateListSessionsQuery: defaults', () => {
  const q = validateListSessionsQuery({});
  assert.strictEqual(q.ok, true);
  assert.strictEqual(q.value.page, 1);
  assert.strictEqual(q.value.per_page, 20);
  assert.strictEqual(q.value.sort_by, 'created_at');
  assert.strictEqual(q.value.sort_dir, 'desc');
});

test('internals: kind detection and url checks', () => {
  assert.strictEqual(_internals.inferKind('video/mp4', 'x.mp4'), 'video');
  assert.strictEqual(_internals.inferKind('application/pdf', 'x.pdf'), 'file');
  assert.strictEqual(_internals.isAllowedUrl('https://x/y.mov'), true);
  assert.strictEqual(_internals.isAllowedUrl('ftp://x/y.mov'), false);
});
