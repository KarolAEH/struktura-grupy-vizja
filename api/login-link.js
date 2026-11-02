// Generuje jednorazowy link logowania dla osoby z zespołu.
// Może go wywołać tylko zalogowany administrator narzędzia; link przekazuje on dalej sam
// (e-mail, Teams), więc nie jest potrzebna konfiguracja SMTP w Supabase.
// Wymaga zmiennych Vercela: SUPABASE_URL, SUPABASE_ANON_KEY i SUPABASE_SERVICE_ROLE_KEY
// (ustawia je integracja Supabase). Klucz serwisowy nigdy nie trafia do przeglądarki.

const env = process.env;
const URL_ = (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const ANON = env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  env.SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || '';

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

// nagłówki dla zapytań z uprawnieniami zalogowanej osoby (podlegają RLS)
const asUser = (token) => ({ apikey: ANON, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' });
// nagłówki administracyjne (klucz serwisowy)
const asService = () => {
  const h = { apikey: SERVICE, 'Content-Type': 'application/json' };
  if (SERVICE.startsWith('eyJ')) h.Authorization = 'Bearer ' + SERVICE; // klucz w starym formacie JWT
  return h;
};

async function generate(type, email, redirectTo) {
  const r = await fetch(URL_ + '/auth/v1/admin/generate_link', {
    method: 'POST', headers: asService(),
    body: JSON.stringify({ type, email, redirect_to: redirectTo }),
  });
  const j = await r.json().catch(() => ({}));
  const p = j.properties || {};
  const link = j.action_link || p.action_link;
  const hashed = j.hashed_token || p.hashed_token;
  const vtype = j.verification_type || p.verification_type || type;
  return { ok: r.ok && !!(hashed || link), link, hashed, vtype, status: r.status, msg: j.msg || j.message || j.error_description || j.error || '' };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Użyj metody POST.' });
  if (!URL_ || !ANON) return send(res, 500, { error: 'Brak SUPABASE_URL lub SUPABASE_ANON_KEY w zmiennych Vercela.' });
  if (!SERVICE) return send(res, 500, { error: 'Brak klucza SUPABASE_SERVICE_ROLE_KEY w zmiennych Vercela. Dodaj go (Supabase: Project Settings → API) i zrób Redeploy.' });

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return send(res, 401, { error: 'Zaloguj się ponownie.' });

  const body = await readBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return send(res, 400, { error: 'Nieprawidłowy adres e-mail.' });

  try {
    // 1. Czy wywołujący jest administratorem narzędzia?
    const roleR = await fetch(URL_ + '/rest/v1/rpc/my_role', { method: 'POST', headers: asUser(token), body: '{}' });
    const role = roleR.ok ? await roleR.json() : null;
    if (role !== 'admin') return send(res, 403, { error: 'Linki logowania może tworzyć tylko administrator.' });

    // 2. Czy adres jest na liście zespołu?
    const memR = await fetch(URL_ + '/rest/v1/members?select=email&email=eq.' + encodeURIComponent(email), { headers: asUser(token) });
    const mem = memR.ok ? await memR.json() : [];
    if (!Array.isArray(mem) || !mem.length) return send(res, 404, { error: 'Najpierw dodaj tę osobę do zespołu.' });

    // 3. Link: dla istniejącego konta „magiclink”, dla nowej osoby „invite” (tworzy konto)
    const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const origin = proto + '://' + host;
    const redirectTo = origin + '/';
    let g = await generate('magiclink', email, redirectTo);
    if (!g.ok) {
      const inv = await generate('invite', email, redirectTo);
      if (inv.ok) g = inv;
    }
    if (!g.ok) return send(res, 502, { error: 'Supabase nie wygenerował linku' + (g.msg ? ': ' + g.msg : '') + '.' });
    // Link prowadzi na stronę narzędzia, a nie bezpośrednio do Supabase: logowanie następuje
    // dopiero po kliknięciu przycisku. Dzięki temu skanery poczty (np. Defender Safe Links)
    // i podglądy linków w Teams nie zużyją jednorazowego linku.
    const link = g.hashed
      ? origin + '/?logowanie=' + encodeURIComponent(g.hashed) + '&typ=' + encodeURIComponent(g.vtype)
      : g.link;
    return send(res, 200, { link, email });
  } catch (e) {
    return send(res, 500, { error: 'Błąd serwera: ' + (e && e.message ? e.message : 'nieznany') });
  }
};
