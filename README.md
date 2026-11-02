# Struktura Grupy VIZJA

Narzędzie do wspólnego projektowania struktury funkcjonalnej Grupy VIZJA (UV, UAFM, UZW): obszary L1, funkcje L2, procesy L3 i działania L4, z przypisaniem odpowiedzialności w każdej uczelni, komentarzami i historią zmian.

- **Hosting:** Vercel (statyczna strona + jedna funkcja `api/config.js`)
- **Baza, logowanie, zmiany na żywo:** Supabase
- **Logowanie:** link wysyłany na e-mail; dostęp mają tylko osoby z listy „Zespół”

## Wdrożenie krok po kroku

Całość zajmuje ok. 20–30 minut. Nie trzeba niczego instalować na komputerze.

### 1. Vercel: zaimportuj repozytorium

1. Wejdź na [vercel.com/new](https://vercel.com/new) i zaloguj się kontem GitHub.
2. Przy repozytorium **struktura-grupy-vizja** kliknij **Import**.
3. Framework Preset: **Other**. Pozostałe ustawienia zostaw bez zmian i kliknij **Deploy**.
4. Zapisz adres strony, np. `https://struktura-grupy-vizja.vercel.app`. Strona pokaże na razie „Brak konfiguracji bazy” – to normalne.

### 2. Supabase: utwórz bazę i połącz ją z Vercelem

1. W projekcie na Vercelu otwórz zakładkę **Storage** → **Create Database** → **Supabase** (lub Marketplace → Supabase).
2. Wybierz region **Frankfurt (eu-central-1)**, nadaj nazwę i potwierdź. Vercel sam ustawi zmienne `SUPABASE_URL` i `SUPABASE_ANON_KEY`.
3. W Vercelu: **Deployments** → przy ostatnim wdrożeniu **⋯** → **Redeploy**, żeby strona zobaczyła nowe zmienne.

> Masz już projekt Supabase? Zamiast kroków 1–2 dodaj ręcznie w Vercelu (Settings → Environment Variables) zmienne `SUPABASE_URL` i `SUPABASE_ANON_KEY` (Supabase: Project Settings → API) i zrób Redeploy.

### 3. Supabase: utwórz tabele i wgraj strukturę IT

1. Otwórz panel Supabase (z Vercela: Storage → Twoja baza → **Open in Supabase**).
2. **SQL Editor** → **New query** → wklej całą zawartość pliku [`supabase/setup.sql`](supabase/setup.sql) → **Run**.
3. Powinien pojawić się komunikat „Success”. Plik tworzy tabele, uprawnienia i wgrywa Obszar IT (6 funkcji, 37 procesów, 111 działań). Można go uruchomić ponownie bez utraty danych.

### 4. Supabase: adres strony dla linków logowania

**Authentication** → **URL Configuration**:

- **Site URL:** adres z kroku 1, np. `https://struktura-grupy-vizja.vercel.app`
- **Redirect URLs:** dodaj ten sam adres.

### 5. Supabase: skrzynka do wysyłki linków (ważne)

Bez własnego serwera poczty Supabase wysyła linki **tylko do członków zespołu projektu Supabase** i najwyżej 2 wiadomości na godzinę. Żeby osoby z trzech uczelni mogły się logować:

1. Załóż darmowe konto w usłudze wysyłki, np. [Brevo](https://www.brevo.com) lub [Resend](https://resend.com), albo poproś dział IT o dane SMTP uczelni.
2. W Supabase: **Authentication** → **Emails** → **SMTP Settings** → **Enable custom SMTP** i wpisz dane (host, port, użytkownik, hasło, adres nadawcy, np. `struktura@vizja.pl`).
3. Opcjonalnie: **Authentication** → **Emails** → **Templates** → „Magic Link” – zmień treść wiadomości na polską.

Do czasu konfiguracji SMTP możesz się logować adresem, którym zakładałeś konto Supabase.

### 6. Pierwsze logowanie i zespół

1. Otwórz stronę, wpisz swój e-mail i kliknij link z wiadomości.
2. **Pierwsza zalogowana osoba zostaje administratorem.** Zrób to od razu po wdrożeniu.
3. Kliknij **Zespół** i dodaj osoby z UV, UAFM i UZW. Role:
   - **Podgląd i komentarze** – przegląda i komentuje,
   - **Edycja** – zmienia strukturę,
   - **Administrator** – dodatkowo zarządza zespołem i listą uczelni.
4. Dodane osoby logują się same, wpisując swój adres na stronie.

## Kolejne zmiany

Każda zmiana w repozytorium (np. wprowadzona z pomocą Claude) wdraża się na Vercelu automatycznie.

## Budowa

| Plik | Rola |
|---|---|
| `index.html` | cała aplikacja (widoki: Struktura, Mapa funkcji, Macierz odpowiedzialności, Do uzgodnienia, Historia zmian) |
| `api/config.js` | przekazuje stronie adres i publiczny klucz Supabase ze zmiennych Vercela |
| `supabase/setup.sql` | tabele, uprawnienia (RLS), zmiany na żywo, dane startowe |
| `vercel.json` | nagłówki bezpieczeństwa |

Tabele: `nodes` (elementy L1–L4), `comments`, `change_log`, `settings` (lista uczelni), `members` (zespół i role). Klucz „anon” jest publiczny z założenia: dostęp do danych pilnują reguły Row Level Security, które wpuszczają wyłącznie osoby z tabeli `members`.
