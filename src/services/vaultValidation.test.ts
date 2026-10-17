import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateVaultFile,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
} from './supabase.ts';

test('validateVaultFile: accepts valid PDF, PNG, JPG, TXT, and MD files under 10 MB', () => {
  const validFiles = [
    { name: 'document.pdf', size: 1024 * 500, type: 'application/pdf' },
    { name: 'screenshot.png', size: 1024 * 1024, type: 'image/png' },
    { name: 'photo.jpg', size: 1024 * 200, type: 'image/jpeg' },
    { name: 'photo2.jpeg', size: 1024 * 300, type: 'image/jpeg' },
    { name: 'notes.txt', size: 1024, type: 'text/plain' },
    { name: 'readme.md', size: 2048, type: 'text/markdown' },
    { name: 'guide.md', size: 2048, type: 'text/x-markdown' },
    { name: 'notes_empty_mime.md', size: 1024, type: '' },
  ];

  for (const f of validFiles) {
    const res = validateVaultFile(f);
    assert.strictEqual(res.valid, true, `Expected ${f.name} to be valid, got error: ${res.error}`);
  }
});

test('validateVaultFile: rejects files exceeding 10 MB', () => {
  const oversizeFile = {
    name: 'giant.pdf',
    size: MAX_FILE_SIZE_BYTES + 1,
    type: 'application/pdf',
  };
  const res = validateVaultFile(oversizeFile);
  assert.strictEqual(res.valid, false);
  assert.match(res.error || '', /File is too large/);
});

test('validateVaultFile: strictly rejects HTML files by extension and MIME', () => {
  const htmlFiles = [
    { name: 'index.html', size: 1024, type: 'text/html' },
    { name: 'page.htm', size: 1024, type: 'text/html' },
    { name: 'disguised.pdf', size: 1024, type: 'text/html' },
  ];

  for (const f of htmlFiles) {
    const res = validateVaultFile(f);
    assert.strictEqual(res.valid, false);
    assert.match(res.error || '', /HTML and SVG/i);
  }
});

test('validateVaultFile: strictly rejects SVG files by extension and MIME', () => {
  const svgFiles = [
    { name: 'vector.svg', size: 1024, type: 'image/svg+xml' },
    { name: 'image.png', size: 1024, type: 'image/svg+xml' },
  ];

  for (const f of svgFiles) {
    const res = validateVaultFile(f);
    assert.strictEqual(res.valid, false);
    assert.match(res.error || '', /HTML and SVG/i);
  }
});

test('validateVaultFile: rejects unsupported extensions', () => {
  const badExtensions = [
    { name: 'script.js', size: 1024, type: 'text/javascript' },
    { name: 'binary.exe', size: 1024, type: 'application/octet-stream' },
    { name: 'archive.zip', size: 1024, type: 'application/zip' },
    { name: 'doc.docx', size: 1024, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    { name: 'malicious.sh', size: 1024, type: 'application/x-sh' },
  ];

  for (const f of badExtensions) {
    const res = validateVaultFile(f);
    assert.strictEqual(res.valid, false);
    assert.match(res.error || '', /Unsupported file type/);
  }
});

test('validateVaultFile: rejects mismatched or malicious MIME types with allowed extensions', () => {
  const spoofedFiles = [
    { name: 'fake.txt', size: 1024, type: 'application/x-msdownload' },
    { name: 'fake.pdf', size: 1024, type: 'application/zip' },
    { name: 'fake.png', size: 1024, type: 'application/json' },
  ];

  for (const f of spoofedFiles) {
    const res = validateVaultFile(f);
    assert.strictEqual(res.valid, false);
    assert.match(res.error || '', /Unsupported file type/);
  }
});
