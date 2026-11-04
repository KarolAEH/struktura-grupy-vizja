// Tworzy zaproszenie (link logowania) dla osoby z zespołu. Wywołuje je tylko administrator.
// Link jest ważny 7 dni i prowadzi na stronę narzędzia. Właściwy jednorazowy kod Supabase
// powstaje dopiero po kliknięciu „Zaloguj się” (api/redeem.js), więc link nie wygasa po godzinie,
// nie unieważnia go kolejny wygenerowany link i nie zużyje go skaner poczty ani podgląd w Teams.
const L = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return L.send(res, 405, { error: 'Użyj metody POST.' });
  const ce = L.configError(); if (ce) return L.send(res, 500, { error: ce });

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return L.send(res, 401, { error: 'Zaloguj się ponownie.' });
  const body = await L.readBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return L.send(res, 400, { error: 'Nieprawidłowy adres e-mail.' });

  try {
    // 1. Czy wywołujący jest administratorem? (sprawdzane uprawnieniami tej osoby)
    const roleR = await fetch(L.URL_ + '/rest/v1/rpc/my_role', { method: 'POST', headers: L.asUser(token), body: '{}' });
    const role = roleR.ok ? await roleR.json() : null;
    if (role !== 'admin') return L.send(res, 403, { error: 'Linki logowania może tworzyć tylko administrator.' });

    // 2. Czy adres jest na liście zespołu?
    const mem = await L.rest('members?select=email&email=eq.' + encodeURIComponent(email));
    if (!mem.ok || !Array.isArray(mem.data) || !mem.data.length) return L.send(res, 404, { error: 'Najpierw dodaj tę osobę do zespołu.' });

    // 3. Kto tworzy zaproszenie (do zapisu)
    const uR = await fetch(L.URL_ + '/auth/v1/user', { headers: L.asUser(token) });
    const u = uR.ok ? await uR.json() : {};

    // 4. Zapisz zaproszenie (w bazie tylko skrót tokenu)
    const invite = L.newToken();
    const expires = new Date(Date.now() + L.INVITE_DAYS * 864e5).toISOString();
    const ins = await L.rest('invites', { method: 'POST', prefer: 'return=minimal',
      body: { token_hash: L.sha256(invite), email, created_by: String(u.email || '').toLowerCase(), expires_at: expires } });
    if (!ins.ok) {
      const missing = ins.status === 404 || /invites/.test(JSON.stringify(ins.data || ''));
      return L.send(res, 500, { error: missing
        ? 'W bazie brakuje tabeli zaproszeń. Uruchom w Supabase (SQL Editor) plik supabase/2026-11-04-zaproszenia.sql.'
        : 'Nie udało się zapisać zaproszenia (' + ins.status + ').' });
    }
    return L.send(res, 200, { link: L.origin(req) + '/?zaproszenie=' + invite, email, expires_at: expires, days: L.INVITE_DAYS });
  } catch (e) {
    return L.send(res, 500, { error: 'Błąd serwera: ' + (e && e.message ? e.message : 'nieznany') });
  }
};
