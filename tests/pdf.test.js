import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCharacterPdf } from './fixtures/character-pdf.js';
import { normalizePdfFields, fieldsFromLabeledText } from '../src/import/pdf-fields.js';
import { MAX_PDF_BYTES, parseCharacterPdf } from '../src/import/pdf.js';
test('PDF parser rejects file limits and cancellation before loading the worker', async () => {
  await assert.rejects(parseCharacterPdf(new ArrayBuffer(MAX_PDF_BYTES + 1)), /10 MB/);
  await assert.rejects(parseCharacterPdf(new ArrayBuffer(0)), /10 MB/);
  await assert.rejects(parseCharacterPdf(new ArrayBuffer(1), { signal: AbortSignal.abort() }), /cancelled/);
});
test('standard AcroForm fixture passes actual PDF.js extraction and draft validation', async () => {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: new Uint8Array(createCharacterPdf()), isEvalSupported: false });
  try {
    const doc = await task.promise, page = await doc.getPage(1);
    const fields = Object.fromEntries((await page.getAnnotations()).map(annotation => [annotation.fieldName, annotation.fieldValue]));
    const draft = normalizePdfFields(fields);
    assert.equal(draft.profile.name, 'Acceptance Hero');
    assert.equal(draft.profile.abilities.str, 10);
    assert.equal(draft.equipment.length, 2);
  } finally { await task.destroy(); }
});
test('labeled text fallback only interprets supported explicit labels', () => {
  const fields = fieldsFromLabeledText('Character Name: Aria\nSTR: 10\nAC: 15\nA paragraph about damage 99');
  assert.equal(normalizePdfFields(fields).profile.name, 'Aria');
  assert.equal(Object.keys(fields).length, 3);
});
