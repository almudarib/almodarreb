import assert from 'node:assert';
import test from 'node:test';
import pkg from '../lib/validation/sessions.js';
const { validateCreateSessionInput, _internals } = pkg;

test('large upload size rejected for documents', () => {
  const size = _internals.MAX_FILE_BYTES + 1024 * 1024;
  const buf = Buffer.alloc(size, 1);
  const b64 = buf.toString('base64');
  const input = {
    title: 'كبير',
    language: 'AR',
    content: {
      base64: b64,
      filename: 'big.pdf',
      contentType: 'application/pdf',
    },
  };
  const r = validateCreateSessionInput(input);
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.content);
});
