# neighborlyvolume-app
# 🎵 NeighborlyVolume

**Prawdziwa kontrola Spotify dla Twoich sąsiadów - Sąsiedzka harmonia w cyfrowym wieku!**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-neighborlyvolume--app.onrender.com-1DB954?style=for-the-badge&logo=spotify)](https://neighborlyvolume-app.onrender.com)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18.2-000000?style=for-the-badge&logo=express)](https://expressjs.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.7.4-010101?style=for-the-badge&logo=socket.io)](https://socket.io/)

## ✨ Funkcje

### 🎛️ **Podstawowe Funkcje**
- 🔗 **Łączenie ze Spotify** - Bezpieczna autoryzacja OAuth
- 📱 **Udostępnianie linków** - Generowanie unikalnych linków dla sąsiadów
- 🔊 **Kontrola głośności** - Real-time zmiana głośności przez sąsiadów
- 💬 **Poetyckie wiadomości** - Piękne, automatyczne wiadomości dla każdej reakcji
- 📊 **Statystyki na żywo** - Liczba sąsiadów, zmian głośności, czas sesji
- 🌐 **Dwujęzyczna** - Polski i angielski
- 💾 **Przywracanie sesji** - Automatyczne przywracanie po odświeżeniu strony

### 🎭 **Easter Eggi dla Ulubionych Artystów**

Gdy grają Twoi ulubieni artyści, aplikacja pokazuje specjalne wiadomości:

#### 🌙 **Nightwish**
- *"Wishmaster! Ten utwór to prawdziwa magia symfonii metalowej! ✨"*
- *"Finnish metal magic w powietrzu - absolutna perfekcja! 🇫🇮"*

#### 🏰 **Within Temptation** 
- *"Sharon Den Adel - głos aniołów i potęga orkiestr! 👑"*
- *"Gothic metal w najczystszej postaci - ciężko nie łkać! 💜"*

#### 🎭 **Epica**
- *"Simone Simons i jej operowy głos to definicja perfekcji! 👸"*
- *"Symphonic metal w wykonaniu mistrzów - filozofia w dźwiękach! 🛡️"*

#### 🇵🇱 **Closterkeller**
- *"Anja Orthodox - ikona polskiego gothicu! Niemożliwe nie pokochać! 🖤"*

#### 🌋 **Björk**
- *"Icelandic goddess of experimental music! 🇮🇸"*
- *"Każdy album to nowy wszechświat dźwięków! 🪐"*

#### 🎹 **Tori Amos**
- *"Piano goddess! Jej palce tańczą po klawiszach jak poezja! 📝"*

### 🐱 **Sekretne Tryby**

Sąsiedzi mogą aktywować ukryte tryby przez własne wiadomości:

#### 🐱 **Cat Mode** 
**Komenda:** `"meow mode"` lub `"kot mode"`
- Zamienia słowa: "music" → "mewzic", "thanks" → "thanks *purr*"
- Dodaje 🐱 na końcu każdej wiadomości

#### 📜 **Poetry Mode**
**Komenda:** `"poetry mode"` lub `"tryb poetycki"`
- Dodaje poetyckie zakończenia: *"... jak wiersz napisany nutami 📜"*

#### 🌈 **Rainbow Mode**
**Komenda:** `"rainbow mode"` lub `"tęcza mode"`
- Aktywuje kolorowe animowane tło tęczy
- Dodaje emoji: 🌈✨🎨🦄💫

#### ✨ **MAGIC MODE** (Niespodzianka!)
**Sekretna komenda:** `"secret admin"` lub `"magic sparkles"`
- 🦄 **Aktywuje WSZYSTKIE tryby naraz**
- Specjalne efekty wizualne
- Ukryta wiadomość: *"✨🦄 MAGIC MODE ACTIVATED! 🦄✨ Jesteś prawdziwą czarodziejką technologii!"*

#### 🔍 **Status Check**
**Komenda:** `"status"` lub `"easter egg"`
- Pokazuje aktywne tryby: `🎭 Secret Status: Cat 🐱 | Poetry 📜 | Rainbow 🌈 | Magic ✨`

### 💬 **Własne Wiadomości**
- Pole tekstowe do wysyłania dowolnych wiadomości
- Automatyczne stosowanie aktywnych trybów
- Wskazówki o sekretnych komendach
- Support dla Enter = wyślij

### ⌨️ **Skróty Klawiszowe**
- **M** - Wycisz (0%)
- **R** - Reset (50%)
- **↑/↓** - +/-5% głośności
- **Enter** - Focus na pole wiadomości

### 🛡️ **Systemy Bezpieczeństwa**
- **Rate Limiting:** 5 zmian głośności na minutę na użytkownika
- **Conflict Resolution:** 300ms debounce dla zmian głośności
- **Session Management:** Automatyczne czyszczenie starych sesji
- **Error Handling:** Graceful handling błędów Spotify API

## 🚀 Deployment na Render

### 1. **Przygotowanie Repozytorium**

```bash
# Sklonuj lub utwórz repozytorium
git clone https://github.com/your-username/neighborlyvolume-app.git
cd neighborlyvolume-app

# Zastąp pliki nowymi wersjami:
# - app.js
# - package.json  
# - public/index.html
# - public/neighbor.html
# - .env (jako .env.example)
```

### 2. **Konfiguracja Spotify API**

1. Idź na [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Utwórz nową aplikację
3. Zapisz **Client ID** i **Client Secret**
4. W **Settings** dodaj Redirect URI:
   ```
   https://your-app-name.onrender.com/auth/callback
   ```

### 3. **Deploy na Render**

1. **Połącz repozytorium:**
   - Idź na [render.com](https://render.com)
   - Kliknij "New" → "Web Service"
   - Połącz z GitHub repo

2. **Konfiguracja:**
   - **Name:** `neighborlyvolume-app`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

3. **Environment Variables:**
   ```env
   SPOTIFY_CLIENT_ID=your_client_id_here
   SPOTIFY_CLIENT_SECRET=your_client_secret_here
   BASE_URL=https://neighborlyvolume-app.onrender.com
   NODE_ENV=production
   PORT=10000
   ```

4. **Deploy!** 🚀

## 🎵 Jak Używać

### Dla Właściciela Muzyki:

1. **Otwórz aplikację** i kliknij "Połącz ze Spotify"
2. **Zaloguj się** do Spotify
3. **Wygeneruj link** dla sąsiadów
4. **Udostępnij link** przez WhatsApp, kopiuj, QR kod
5. **Obserwuj aktywność** w czasie rzeczywistym

### Dla Sąsiadów:

1. **Otwórz link** otrzymany od sąsiada
2. **Kontroluj głośność** suwakiem lub przyciskami
3. **Wyślij reakcję** emoji lub własną wiadomość
4. **Odkryj sekretne komendy** w polu wiadomości
5. **Ciesz się harmonią!** 🎵

## 🔧 Rozwój Lokalny

```bash
# Klonowanie
git clone https://github.com/your-username/neighborlyvolume-app.git
cd neighborlyvolume-app

# Instalacja
npm install

# Konfiguracja
cp .env.example .env
# Edytuj .env i dodaj swoje klucze Spotify

# Uruchomienie
npm run dev
```

## 📁 Struktura Projektu

```
neighborlyvolume-app/
├── app.js                 # 🚀 Główny serwer Express + Socket.io
├── package.json           # 📦 Konfiguracja Node.js
├── .env.example          # ⚙️ Szablon konfiguracji
├── public/
│   ├── index.html        # 🏠 Strona główna (właściciel)
│   └── neighbor.html     # 📱 Strona kontroli (sąsiedzi)
└── README.md             # 📚 Ta dokumentacja
```

## 🎭 Easter Eggi - Szczegóły Implementacji

### Wykrywanie Artystów
```javascript
const FAVORITE_ARTISTS = [
    'nightwish', 'within temptation', 'epica', 
    'closterkeller', 'bjork', 'tori amos'
];

function detectEasterEgg(trackName, artistName) {
    const searchText = `${trackName} ${artistName}`.toLowerCase();
    // Sprawdza czy current track zawiera ulubionego artystę
}
```

### Sekretne Komendy
```javascript
// W custom message input sąsiadów:
"meow mode"        → 🐱 Cat Mode
"poetry mode"      → 📜 Poetry Mode  
"rainbow mode"     → 🌈 Rainbow Mode
"secret admin"     → ✨ ULTIMATE MAGIC MODE
```

### Global Modes System
```javascript
let globalModes = {
    catMode: false,      // 🐱 Kocie wersje słów
    poetryMode: false,   // 📜 Poetyckie zakończenia
    rainbowMode: false,  // 🌈 Animowane tło
    magicMode: false     // ✨ Wszystkie tryby + specjalne efekty
};
```

## 🔍 API Endpoints

### Publiczne
- `GET /` - Strona główna
- `GET /control/:linkId` - Strona kontroli sąsiadów
- `GET /health` - Health check

### Spotify Auth
- `GET /auth/login` - Inicjacja OAuth
- `GET /auth/callback` - Callback OAuth

### Session Management
- `POST /api/create-link` - Tworzenie linku udostępniania
- `GET /api/status/:linkId` - Status sesji
- `PUT /api/control/:linkId` - Kontrola głośności/wiadomości

### Debug & Monitoring
- `GET /api/debug` - Informacje debugowe
- `GET /api/session/check/:sessionId` - Walidacja sesji
- `POST /api/user/check` - Walidacja użytkownika

## 🎯 Możliwe Rozszerzenia

### 🔮 Przyszłe Funkcje
- [ ] **QR Code Generator** - Prawdziwe kody QR dla linków
- [ ] **Historię Sesji** - Zapis poprzednich sesji
- [ ] **Grupy Sąsiadów** - Zarządzanie stałymi grupami
- [ ] **Zaplanowane Ciszę** - Automatyczne wyciszenie o określonych godzinach
- [ ] **Themes** - Różne style wizualne
- [ ] **Mobile App** - Natywna aplikacja mobilna
- [ ] **Discord Integration** - Bot dla serwerów Discord
- [ ] **Smart Home** - Integracja z Google Home/Alexa

### 🎪 Więcej Easter Eggów
- [ ] **Seasonal Modes** - Specjalne tryby na święta
- [ ] **Weather Integration** - Tryby pogodowe
- [ ] **Zodiac Modes** - Tryby astrologiczne
- [ ] **Gaming Modes** - Specjalne tryby dla graczy
- [ ] **Movie Quotes** - Cytaty z filmów jako reakcje

## 🤝 Contributing

1. **Fork** repozytorium
2. **Utwórz branch** (`git checkout -b feature/amazing-feature`)
3. **Commit** zmiany (`git commit -m 'Add some amazing feature'`)
4. **Push** do brancha (`git push origin feature/amazing-feature`)
5. **Otwórz Pull Request**

## 📜 Licencja

MIT License - możesz używać, modyfikować i dystrybuować kod.

## 🎵 Podziękowania

- **Spotify Web API** - Za umożliwienie kontroli muzyki
- **Socket.io** - Za real-time komunikację
- **Nightwish, Within Temptation, Epica, Closterkeller, Björk, Tori Amos** - Za inspirację muzyczną
- **Render** - Za darmowy hosting
- **Wszystkim sąsiadom** - Za cierpliwość i testowanie! 😊

---

**Made with ❤️ and 🎵 for neighborly harmony**

*"Muzyka łączy ludzi, NeighborlyVolume łączy sąsiadów!"*
