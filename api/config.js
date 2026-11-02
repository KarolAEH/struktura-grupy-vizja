// Zwraca publiczny adres projektu Supabase i klucz "anon"/"publishable".
// Oba są jawne z założenia (bezpieczeństwo zapewniają reguły RLS w bazie).
// Wartości pochodzą ze zmiennych środowiskowych Vercela (ustawia je integracja Supabase).
module.exports = (req, res) => {
  const env = process.env;
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = 200;
  res.end(JSON.stringify({ url, anonKey }));
};
