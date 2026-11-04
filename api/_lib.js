// Wspólne funkcje dla api/login-link.js i api/redeem.js (plik z „_” na początku nie jest publicznym adresem).
const crypto = require('crypto');

const env = process.env;
const URL_ = (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const ANON = env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  env.SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || '';

const INVITE_DAYS = 7;            // ważność zaproszenia
const REUSE_MINUTES = 15;         // po pierwszym użyciu link działa jeszcze chwilę (np. ponowne kliknięcie)

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  return new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => { d += c; if (d.length > 1e5) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch (e) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

const asUser = (token) => ({ apikey: ANON, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' });
const asService = (extra) => {
  const h = Object.assign({ apikey: SERVICE, 'Content-Type': 'application/json' }, extra || {});
  if (SERVICE.startsWith('eyJ')) h.Authorization = 'Bearer ' + SERVICE; // klucz w starym formacie JWT
  return h;
};

const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const newToken = () => crypto.randomBytes(24).toString('base64url');

function origin(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return proto + '://' + host;
}

function configError() {
  if (!URL_ || !ANON) return 'Brak SUPABASE_URL lub SUPABASE_ANON_KEY w zmiennych Vercela.';
  if (!SERVICE) return 'Brak klucza SUPABASE_SERVICE_ROLE_KEY w zmiennych Vercela. Dodaj go (Supabase: Project Settings → API) i zrób Redeploy.';
  return '';
}

// zapytanie do bazy z kluczem serwisowym (omija RLS – tylko po stronie serwera)
async function rest(path, opt) {
  const o = opt || {};
  const r = await fetch(URL_ + '/rest/v1/' + path, {
    method: o.method || 'GET',
    headers: asService(o.prefer ? { Prefer: o.prefer } : null),
    body: o.body ? JSON.stringify(o.body) : undefined,
  });
  const text = await r.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  return { ok: r.ok, status: r.status, data };
}

async function generateLink(type, email, redirectTo) {
  const r = await fetch(URL_ + '/auth/v1/admin/generate_link', {
    method: 'POST', headers: asService(),
    body: JSON.stringify({ type, email, redirect_to: redirectTo }),
  });
  const j = await r.json().catch(() => ({}));
  const p = j.properties || {};
  const hashed = j.hashed_token || p.hashed_token;
  const vtype = j.verification_type || p.verification_type || type;
  return { ok: r.ok && !!hashed, hashed, vtype, status: r.status, msg: j.msg || j.message || j.error_description || j.error || '' };
}

module.exports = { URL_, ANON, SERVICE, INVITE_DAYS, REUSE_MINUTES, send, readBody, asUser, asService, sha256, newToken, origin, configError, rest, generateLink };
