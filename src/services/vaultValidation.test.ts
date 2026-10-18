import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateVaultFile,
  buildStoragePath,
  resolveContentType,
  getFileExtension,
  isMissingTableOrBucket,
  extractErrorMessage,
  MISSING_VAULT_SETUP_MESSAGE,
  MAX_FILE_SIZE_BYTES,
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

test('buildStoragePath: creates <user_id>/<random-uuid>.<lowercase extension> without original filename', () => {
  const userId = '35cbb64a-f6c1-4843-b278-2d1a6aa70028';
  const trickyFiles = [
    'My Report [Draft] (final) v1.2.PDF',
    'Assignment 1 [CSE101] - Solved (1).pdf',
    'notes with spaces & symbols.txt',
    'photo [2026.04.12].PNG',
  ];

  for (const orig of trickyFiles) {
    const { filePath, extension } = buildStoragePath(userId, orig);

    // Path must start with <user_id>/
    assert.ok(filePath.startsWith(`${userId}/`), `Path ${filePath} must start with ${userId}/`);

    // Path must NOT contain brackets, spaces, or the original base name
    assert.ok(!filePath.includes('['), `Path ${filePath} must not contain [`);
    assert.ok(!filePath.includes(']'), `Path ${filePath} must not contain ]`);
    assert.ok(!filePath.includes(' '), `Path ${filePath} must not contain spaces`);
    assert.ok(!filePath.includes('Report'), `Path ${filePath} must not contain original name parts`);
    assert.ok(!filePath.includes('Assignment'), `Path ${filePath} must not contain original name parts`);

    // Extension must be lowercase
    const ext = getFileExtension(orig);
    assert.strictEqual(extension, ext.toLowerCase());

    // Format must match: <user_id>/<uuid>.<ext>
    const parts = filePath.split('/');
    assert.strictEqual(parts.length, 2);
    assert.strictEqual(parts[0], userId);
    const filePart = parts[1];
    assert.ok(filePart.endsWith(`.${ext.toLowerCase()}`));
    const uuidPart = filePart.slice(0, -(ext.length + 1));
    assert.match(uuidPart, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  }
});

test('resolveContentType: uses file.type or infers from extension if empty', () => {
  // 1. file.type provided
  assert.strictEqual(resolveContentType({ name: 'file.pdf', type: 'application/pdf' }), 'application/pdf');
  assert.strictEqual(resolveContentType({ name: 'photo.jpg', type: 'image/jpeg' }), 'image/jpeg');

  // 2. file.type empty -> resolved from extension
  assert.strictEqual(resolveContentType({ name: 'doc.pdf', type: '' }), 'application/pdf');
  assert.strictEqual(resolveContentType({ name: 'doc.PDF', type: '' }), 'application/pdf');
  assert.strictEqual(resolveContentType({ name: 'image.PNG', type: '' }), 'image/png');
  assert.strictEqual(resolveContentType({ name: 'pic.jpg', type: '' }), 'image/jpeg');
  assert.strictEqual(resolveContentType({ name: 'notes.txt', type: '' }), 'text/plain');
  assert.strictEqual(resolveContentType({ name: 'README.md', type: '' }), 'text/markdown');
});

test('isMissingTableOrBucket: detects missing table and bucket errors correctly', () => {
  // Missing table errors
  assert.strictEqual(isMissingTableOrBucket(new Error('relation "public.vault_items" does not exist')), true);
  assert.strictEqual(isMissingTableOrBucket(new Error('relation "vault_items" does not exist')), true);
  assert.strictEqual(isMissingTableOrBucket({ message: 'could not find the table vault_items', code: 'PGRST204' }), true);
  assert.strictEqual(isMissingTableOrBucket({ code: '42P01', message: 'undefined table' }), true);

  // Missing bucket errors
  assert.strictEqual(isMissingTableOrBucket(new Error('Bucket not found')), true);
  assert.strictEqual(isMissingTableOrBucket({ statusCode: 404, message: 'Bucket not found', error: 'bucket_not_found' }), true);
  assert.strictEqual(isMissingTableOrBucket({ status: 404, message: 'The resource was not found for bucket vault' }), true);

  // Unrelated errors
  assert.strictEqual(isMissingTableOrBucket(new Error('Payload too large')), false);
  assert.strictEqual(isMissingTableOrBucket(new Error('new row violates row-level security policy')), false);
});

test('extractErrorMessage: returns setup message on missing table/bucket, real error otherwise', () => {
  // Missing table / bucket
  const missingTableErr = new Error('relation "vault_items" does not exist');
  assert.strictEqual(extractErrorMessage(missingTableErr), MISSING_VAULT_SETUP_MESSAGE);

  const missingBucketErr = { statusCode: 404, message: 'Bucket not found' };
  assert.strictEqual(extractErrorMessage(missingBucketErr), MISSING_VAULT_SETUP_MESSAGE);

  // Real errors - never hidden with generic text
  const rlsErr = new Error('new row violates row-level security policy for table "vault_items"');
  assert.strictEqual(extractErrorMessage(rlsErr), 'new row violates row-level security policy for table "vault_items"');

  const objErr = { message: 'JWT expired' };
  assert.strictEqual(extractErrorMessage(objErr), 'JWT expired');
});
