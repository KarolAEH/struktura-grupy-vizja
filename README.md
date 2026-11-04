# Struktura Grupy VIZJA

Narzędzie do wspólnego projektowania struktury funkcjonalnej Grupy VIZJA (UV, UAFM, UZW): obszary L1, funkcje L2, procesy L3 i działania L4, z przypisaniem odpowiedzialności w każdej uczelni, komentarzami i historią zmian.

- **Hosting:** Vercel (statyczna strona + jedna funkcja `api/config.js`)
- **Baza, logowanie, zmiany na żywo:** Supabase
- **Logowanie:** jednorazowy link (administrator generuje go w oknie „Zespół” albo Supabase wysyła go e-mailem); dostęp mają tylko osoby z listy „Zespół”

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

### 5. Pierwsze logowanie

1. Otwórz stronę, wpisz adres e-mail, którym logujesz się do Supabase, i kliknij link z wiadomości (na ten adres Supabase wysyła wiadomości bez dodatkowej konfiguracji).
2. **Pierwsza zalogowana osoba zostaje administratorem.** Zrób to od razu po wdrożeniu.

### 6. Dodawanie zespołu i linki logowania

1. Kliknij **Zespół**, wpisz e-mail, imię i nazwisko, uczelnię i rolę, potem **Dodaj do zespołu**. Role:
   - **Podgląd i komentarze** – przegląda i komentuje,
   - **Edycja** – zmienia strukturę,
   - **Administrator** – dodatkowo zarządza zespołem i listą uczelni.
2. Od razu pojawi się **link logowania** i gotowa wiadomość. Skopiuj ją i wyślij tej osobie sam (e-mail, Teams). Link możesz też wygenerować później przyciskiem **Link logowania** przy danej osobie.
3. Link jest ważny **7 dni**. Prowadzi na stronę narzędzia, a logowanie następuje dopiero po kliknięciu **Zaloguj się**, więc skanery poczty i podglądy linków w Teams go nie zużyją. Kolejny wygenerowany link nie unieważnia poprzedniego. Po użyciu link działa jeszcze 15 minut (na wypadek ponownego kliknięcia), potem wygasa.
4. Po zalogowaniu osoba pozostaje zalogowana w tej przeglądarce. Nowy link jest potrzebny tylko po wylogowaniu albo na innym urządzeniu.

Zaproszenia obsługują funkcje `api/login-link.js` (tworzy zaproszenie, tylko administrator) i `api/redeem.js` (po kliknięciu „Zaloguj się” tworzy jednorazowy kod Supabase i od razu go używa). Korzystają z klucza `SUPABASE_SERVICE_ROLE_KEY` (ustawia go integracja Supabase w Vercelu; klucz nie trafia do przeglądarki). Zaproszenia są w tabeli `invites`, do której przeglądarki nie mają dostępu; w bazie zapisany jest tylko skrót tokenu.

> Baza zainstalowana przed 4.11.2026: uruchom raz w SQL Editor plik [`supabase/2026-11-04-zaproszenia.sql`](supabase/2026-11-04-zaproszenia.sql).

### 7. (Opcjonalnie) Wysyłka linków e-mailem z Supabase

Jeśli zespół ma sam prosić o link na stronie logowania, Supabase potrzebuje własnego serwera poczty, bo domyślnie wysyła wiadomości tylko do członków zespołu projektu Supabase (limit 2 na godzinę). Ustawisz to w **Authentication → Emails → SMTP Settings** (np. Gmail z hasłem do aplikacji, Brevo, Resend albo SMTP uczelni).

## Kolejne zmiany

Każda zmiana w repozytorium (np. wprowadzona z pomocą Claude) wdraża się na Vercelu automatycznie.

## Budowa

| Plik | Rola |
|---|---|
| `index.html` | cała aplikacja (widoki: Struktura, Mapa funkcji, Macierz odpowiedzialności, Do uzgodnienia, Historia zmian) |
| `api/config.js` | przekazuje stronie adres i publiczny klucz Supabase ze zmiennych Vercela |
| `api/login-link.js` | tworzy zaproszenia ważne 7 dni (tylko dla administratora) |
| `api/redeem.js` | realizuje zaproszenie po kliknięciu „Zaloguj się” |
| `api/_lib.js` | wspólne funkcje serwerowe |
| `supabase/setup.sql` | tabele, uprawnienia (RLS), zmiany na żywo, dane startowe |
| `vercel.json` | nagłówki bezpieczeństwa |

Tabele: `nodes` (elementy L1–L4), `comments`, `change_log`, `settings` (lista uczelni), `members` (zespół i role), `invites` (zaproszenia, tylko dla serwera). Klucz „anon” jest publiczny z założenia: dostęp do danych pilnują reguły Row Level Security, które wpuszczają wyłącznie osoby z tabeli `members`.
