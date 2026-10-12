import { normalizePdfFields, fieldsFromLabeledText } from './pdf-fields.js';
import { extractPortraitCandidates } from './portraits.js';
export const MAX_PDF_BYTES = 10 * 1024 * 1024;
export async function parseCharacterPdf(arrayBuffer, { signal } = {}) {
  if (!arrayBuffer.byteLength || arrayBuffer.byteLength > MAX_PDF_BYTES) throw new Error('Choose a PDF smaller than 10 MB.');
  if (signal?.aborted) throw new Error('Import cancelled.');
  const pdfjs = await import('pdfjs-dist');
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const task = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer), isEvalSupported: false });
  const abort = () => { void task.destroy(); };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    const document = await task.promise;
    if (document.numPages > 30) throw new Error('Choose a character sheet with 30 pages or fewer.');
    const fields = {}, lines = [], portraits = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      if (signal?.aborted) throw new Error('Import cancelled.');
      const page = await document.getPage(pageNumber);
      for (const annotation of await page.getAnnotations()) if (annotation.fieldName && annotation.fieldValue != null) fields[annotation.fieldName] = annotation.fieldValue;
      const content = await page.getTextContent();
      const rows = new Map();
      for (const item of content.items) if ('str' in item) {
        const y = Math.round(item.transform[5]);
        if (!rows.has(y)) rows.set(y, []);
        rows.get(y).push(item);
      }
      for (const [, items] of [...rows].sort(([a], [b]) => b - a)) lines.push(items.sort((a, b) => a.transform[4] - b.transform[4]).map(item => item.str).join(' '));
      {
        try { portraits.push(...(await extractPortraitCandidates(page, pdfjs)).filter(candidate => !portraits.some(entry=>entry.url===candidate.url))); portraits.sort((a,b)=>b.area-a.area); portraits.splice(16); }
        catch { /* A missing image must not prevent text import. */ }
      }
      page.cleanup();
    }
    const text = lines.join('\n');
    const labeled = fieldsFromLabeledText(text);
    if (!Object.keys(fields).length && !Object.keys(labeled).length) throw new Error('This PDF is scanned or uses an unsupported layout. Use a text-based D&D Beyond export or enter the character manually.');
    const draft = normalizePdfFields({ ...labeled, ...fields }, { fingerprint: document.fingerprints[0], text });
    draft.portraitCandidates = portraits.map(entry=>entry.url);
    draft.warnings.push(portraits.length ? 'Select the character portrait from the extracted images; logos may also appear.' : 'No supported embedded portrait was found. You can upload a portrait separately.');
    if (!Object.keys(fields).length) draft.warnings.push('This is a labeled-text import. Form-field exports give more reliable results.');
    return draft;
  } finally { signal?.removeEventListener('abort', abort); await task.destroy(); }
}
