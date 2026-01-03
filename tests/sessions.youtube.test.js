import assert from 'node:assert';
import test from 'node:test';
import pkg from '../lib/validation/sessions.js';
const {
  validateCreateSessionInput,
  validateUpdateSessionInput,
  _internals,
} = pkg;

test('accept YouTube watch URL', () => {
  const input = {
    title: 'يوتيوب 1',
    language: 'AR',
    content: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  };
  const r = validateCreateSessionInput(input);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.value.content.kind, 'video');
  assert.strictEqual(_internals.isYouTubeUrl(input.content.url), true);
  assert.strictEqual(_internals.parseYouTubeId(input.content.url), 'dQw4w9WgXcQ');
});

test('accept YouTube short URL', () => {
  const url = 'https://youtu.be/dQw4w9WgXcQ?t=42';
  assert.strictEqual(_internals.isYouTubeUrl(url), true);
  assert.strictEqual(_internals.parseYouTubeId(url), 'dQw4w9WgXcQ');
  const r = validateUpdateSessionInput({ id: 1, content: { url } });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.value.content.kind, 'video');
});

test('video ext: webm and mkv accepted', () => {
  const r1 = validateCreateSessionInput({
    title: 'webm',
    language: 'AR',
    content: { url: 'https://cdn.example.com/video.webm' },
  });
  assert.strictEqual(r1.ok, true);
  const r2 = validateCreateSessionInput({
    title: 'mkv',
    language: 'AR',
    content: { url: 'https://cdn.example.com/video.mkv' },
  });
  assert.strictEqual(r2.ok, true);
});
