// Realizuje zaproszenie: sprawdza je i dopiero teraz tworzy jednorazowy kod logowania Supabase,
// który przeglądarka natychmiast wykorzystuje (sb.auth.verifyOtp). Wywoływane po kliknięciu „Zaloguj się”.
const L = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return L.send(res, 405, { error: 'Użyj metody POST.' });
  const ce = L.configError(); if (ce) return L.send(res, 500, { error: ce });

  const body = await L.readBody(req);
  const invite = String(body.token || '');
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(invite)) return L.send(res, 400, { error: 'Nieprawidłowy link.', code: 'invalid' });

  try {
    const q = await L.rest('invites?select=*&token_hash=eq.' + L.sha256(invite));
    const inv = q.ok && Array.isArray(q.data) ? q.data[0] : null;
    if (!inv) return L.send(res, 404, { error: 'Ten link jest nieprawidłowy. Poproś administratora o nowy.', code: 'invalid' });
    const now = Date.now();
    if (Date.parse(inv.expires_at) < now) return L.send(res, 410, { error: 'Ten link wygasł (był ważny ' + L.INVITE_DAYS + ' dni). Poproś administratora o nowy.', code: 'expired' });
    if (inv.used_at && Date.parse(inv.used_at) < now - L.REUSE_MINUTES * 6e4)
      return L.send(res, 410, { error: 'Ten link został już użyty. Jeśli to nie Ty, poproś administratora o nowy.', code: 'used' });

    const mem = await L.rest('members?select=email&email=eq.' + encodeURIComponent(inv.email));
    if (!mem.ok || !Array.isArray(mem.data) || !mem.data.length) return L.send(res, 403, { error: 'Ta osoba nie jest już w zespole.', code: 'removed' });

    const redirectTo = L.origin(req) + '/';
    let g = await L.generateLink('magiclink', inv.email, redirectTo);
    if (!g.ok) { const i2 = await L.generateLink('invite', inv.email, redirectTo); if (i2.ok) g = i2; }
    if (!g.ok) return L.send(res, 502, { error: 'Supabase nie utworzył kodu logowania' + (g.msg ? ': ' + g.msg : '') + '.', code: 'supabase' });

    if (!inv.used_at) await L.rest('invites?token_hash=eq.' + inv.token_hash, { method: 'PATCH', prefer: 'return=minimal', body: { used_at: new Date(now).toISOString() } });
    return L.send(res, 200, { token_hash: g.hashed, type: g.vtype, email: inv.email });
  } catch (e) {
    return L.send(res, 500, { error: 'Błąd serwera: ' + (e && e.message ? e.message : 'nieznany'), code: 'server' });
  }
};
