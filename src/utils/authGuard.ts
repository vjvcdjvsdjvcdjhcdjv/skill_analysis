// UX backoff only. Real abuse protection MUST be enforced by Supabase Auth.
const KEY = 'skillpath_auth_backoff_v1';
const WINDOW_MS = 60_000;
const LIMIT = 5;
let memory: number[] = [];
export function consumeAuthAttempt(now = Date.now()): void {
  try { const raw = JSON.parse(sessionStorage.getItem(KEY) || '[]'); if (Array.isArray(raw)) memory = raw.filter(Number.isFinite); } catch { /* unavailable storage */ }
  memory = memory.filter(t => t > now - WINDOW_MS && t <= now);
  if (memory.length >= LIMIT) throw new Error(`Too many attempts. Please wait ${Math.ceil((memory[0] + WINDOW_MS - now) / 1000)} seconds before trying again.`);
  memory.push(now);
  try { sessionStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* in-memory guard remains */ }
}
export function resetAuthAttempts(): void { memory = []; try { sessionStorage.removeItem(KEY); } catch {} }
