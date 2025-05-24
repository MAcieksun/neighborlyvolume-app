# neighborlyvolume-app

# 🎵 NeighborlyVolume

**Real Spotify control for your neighbors - Neighborly harmony in the digital age!**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-neighborlyvolume--app.onrender.com-1DB954?style=for-the-badge&logo=spotify)](https://neighborlyvolume-app.onrender.com)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18.2-000000?style=for-the-badge&logo=express)](https://expressjs.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.7.4-010101?style=for-the-badge&logo=socket.io)](https://socket.io/)

## ✨ Features

### 🎛️ **Core Features**
- 🔗 **Spotify Integration** - Secure OAuth authentication
- 📱 **Link Sharing** - Generate unique links for neighbors
- 🔊 **Volume Control** - Real-time volume adjustment by neighbors
- 💬 **Poetic Messages** - Beautiful, automatic messages for every reaction
- 📊 **Live Statistics** - Number of neighbors, volume changes, session time
- 🌐 **Bilingual** - Polish and English support
- 💾 **Session Restore** - Automatic session recovery after page refresh

### 🎭 **Easter Eggs for Favorite Artists**

When your favorite artists are playing, the app shows special messages:

#### 🌙 **Nightwish**
- *"Wishmaster! This track is real symphonic metal magic! ✨"*
- *"Finnish metal magic in the air - absolute perfection! 🇫🇮"*

#### 🏰 **Within Temptation** 
- *"Sharon Den Adel - voice of angels and power of orchestras! 👑"*
- *"Gothic metal in its purest form - hard not to cry! 💜"*

#### 🎭 **Epica**
- *"Simone Simons and her operatic voice is the definition of perfection! 👸"*
- *"Symphonic metal by masters - philosophy in sounds! 🛡️"*

#### 🇵🇱 **Closterkeller**
- *"Anja Orthodox - icon of Polish gothic! Impossible not to love! 🖤"*

#### 🌋 **Björk**
- *"Icelandic goddess of experimental music! 🇮🇸"*
- *"Every album is a new universe of sounds! 🪐"*

#### 🎹 **Tori Amos**
- *"Piano goddess! Her fingers dance on keys like poetry! 📝"*

### 🐱 **Secret Modes**

Neighbors can activate hidden modes through custom messages:

#### 🐱 **Cat Mode** 
**Command:** `"meow mode"` or `"kot mode"`
- Transforms words: "music" → "mewzic", "thanks" → "thanks *purr*"
- Adds 🐱 at the end of every message

#### 📜 **Poetry Mode**
**Command:** `"poetry mode"` or `"tryb poetycki"`
- Adds poetic endings: *"... like a poem written with notes 📜"*

#### 🌈 **Rainbow Mode**
**Command:** `"rainbow mode"` or `"tęcza mode"`
- Activates animated rainbow background
- Adds emojis: 🌈✨🎨🦄💫

#### ✨ **MAGIC MODE** (Ultimate Secret!)
**Secret command:** `"secret admin"` or `"magic sparkles"`
- 🦄 **Activates ALL modes at once**
- Special visual effects
- Hidden message: *"✨🦄 MAGIC MODE ACTIVATED! 🦄✨ You're a true technology wizard!"*

#### 🔍 **Status Check**
**Command:** `"status"` or `"easter egg"`
- Shows active modes: `🎭 Secret Status: Cat 🐱 | Poetry 📜 | Rainbow 🌈 | Magic ✨`

### 💬 **Custom Messages**
- Text field for sending any messages
- Automatic application of active modes
- Hints about secret commands
- Enter key support for quick sending

### ⌨️ **Keyboard Shortcuts**
- **M** - Mute (0%)
- **R** - Reset (50%)
- **↑/↓** - +/-5% volume
- **Enter** - Focus on message field

### 🛡️ **Security Systems**
- **Rate Limiting:** 5 volume changes per minute per user
- **Conflict Resolution:** 300ms debounce for volume changes
- **Session Management:** Automatic cleanup of old sessions
- **Error Handling:** Graceful Spotify API error handling

## 🚀 Deployment on Render

### 1. **Repository Setup**

```bash
# Clone or create repository
git clone https://github.com/your-username/neighborlyvolume-app.git
cd neighborlyvolume-app

# Replace files with new versions:
# - app.js
# - package.json  
# - public/index.html
# - public/neighbor.html
# - .env (as .env.example)
```

### 2. **Spotify API Configuration**

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new application
3. Save **Client ID** and **Client Secret**
4. In **Settings** add Redirect URI:
   ```
   https://your-app-name.onrender.com/auth/callback
   ```

### 3. **Deploy on Render**

1. **Connect repository:**
   - Go to [render.com](https://render.com)
   - Click "New" → "Web Service"
   - Connect to GitHub repo

2. **Configuration:**
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

## 🎵 How to Use

### For Music Owner:

1. **Open the app** and click "Connect with Spotify"
2. **Log in** to Spotify
3. **Generate link** for neighbors
4. **Share link** via WhatsApp, copy, QR code
5. **Monitor activity** in real-time

### For Neighbors:

1. **Open link** received from neighbor
2. **Control volume** with slider or buttons
3. **Send reactions** with emoji or custom messages
4. **Discover secret commands** in message field
5. **Enjoy harmony!** 🎵

## 🔧 Local Development

```bash
# Clone
git clone https://github.com/your-username/neighborlyvolume-app.git
cd neighborlyvolume-app

# Install
npm install

# Configuration
cp .env.example .env
# Edit .env and add your Spotify keys

# Run
npm run dev
```

## 📁 Project Structure

```
neighborlyvolume-app/
├── app.js                 # 🚀 Main Express + Socket.io server
├── package.json           # 📦 Node.js configuration
├── .env.example          # ⚙️ Configuration template
├── public/
│   ├── index.html        # 🏠 Main page (owner)
│   └── neighbor.html     # 📱 Control page (neighbors)
└── README.md             # 📚 This documentation
```

## 🎭 Easter Eggs - Implementation Details

### Artist Detection
```javascript
const FAVORITE_ARTISTS = [
    'nightwish', 'within temptation', 'epica', 
    'closterkeller', 'bjork', 'tori amos'
];

function detectEasterEgg(trackName, artistName) {
    const searchText = `${trackName} ${artistName}`.toLowerCase();
    // Checks if current track contains favorite artist
}
```

### Secret Commands
```javascript
// In neighbors' custom message input:
"meow mode"        → 🐱 Cat Mode
"poetry mode"      → 📜 Poetry Mode  
"rainbow mode"     → 🌈 Rainbow Mode
"secret admin"     → ✨ ULTIMATE MAGIC MODE
```

### Global Modes System
```javascript
let globalModes = {
    catMode: false,      // 🐱 Cat versions of words
    poetryMode: false,   // 📜 Poetic endings
    rainbowMode: false,  // 🌈 Animated background
    magicMode: false     // ✨ All modes + special effects
};
```

## 🔍 API Endpoints

### Public
- `GET /` - Main page
- `GET /control/:linkId` - Neighbor control page
- `GET /health` - Health check

### Spotify Auth
- `GET /auth/login` - OAuth initiation
- `GET /auth/callback` - OAuth callback

### Session Management
- `POST /api/create-link` - Create sharing link
- `GET /api/status/:linkId` - Session status
- `PUT /api/control/:linkId` - Volume/message control

### Debug & Monitoring
- `GET /api/debug` - Debug information
- `GET /api/session/check/:sessionId` - Session validation
- `POST /api/user/check` - User validation

## 🎯 Possible Extensions

### 🔮 Future Features
- [ ] **QR Code Generator** - Real QR codes for links
- [ ] **Session History** - Save previous sessions
- [ ] **Neighbor Groups** - Manage permanent groups
- [ ] **Scheduled Silence** - Automatic muting at specific times
- [ ] **Themes** - Different visual styles
- [ ] **Mobile App** - Native mobile application
- [ ] **Discord Integration** - Bot for Discord servers
- [ ] **Smart Home** - Integration with Google Home/Alexa

### 🎪 More Easter Eggs
- [ ] **Seasonal Modes** - Special modes for holidays
- [ ] **Weather Integration** - Weather-based modes
- [ ] **Zodiac Modes** - Astrological modes
- [ ] **Gaming Modes** - Special modes for gamers
- [ ] **Movie Quotes** - Movie quotes as reactions

## 🌐 Language Support

### **Bilingual Interface**
- **Polish (PL)** - Primary language
- **English (EN)** - Full translation
- Language switcher on both pages
- Persistent language preferences
- Localized notifications and messages

### **Poetic Messages in Both Languages**
Every emoji reaction has beautiful messages in both languages:

```javascript
'👍': {
    pl: ["jak morze spokojne, gdy muzyka cichnie ☕", ...],
    en: ["like a calm sea when music softens ☕", ...]
}
```

## 🤝 Contributing

1. **Fork** the repository
2. **Create branch** (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add some amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open Pull Request**

## 📜 License

MIT License - you can use, modify and distribute the code.

## 🎵 Credits

- **Spotify Web API** - For enabling music control
- **Socket.io** - For real-time communication
- **Nightwish, Within Temptation, Epica, Closterkeller, Björk, Tori Amos** - For musical inspiration
- **Render** - For free hosting
- **All neighbors** - For patience and testing! 😊

## 🚀 Technical Features

### **Advanced Volume Control**
- **Debounced Changes** - 300ms delay prevents spam
- **Conflict Resolution** - Smart averaging when multiple users control
- **Rate Limiting** - 5 changes per minute per user
- **Real-time Updates** - WebSocket for instant feedback

### **Smart Session Management**
- **Automatic Restoration** - Resume sessions after page refresh
- **Persistent Storage** - LocalStorage for user preferences
- **Cleanup Tasks** - Automatic removal of old sessions
- **Error Recovery** - Graceful handling of API failures

### **Security & Performance**
- **OAuth 2.0** - Secure Spotify authentication
- **CORS Protection** - Proper cross-origin handling
- **Memory Efficiency** - Smart cleanup of unused data
- **Error Logging** - Comprehensive error tracking

---

**Made with ❤️ and 🎵 for neighborly harmony**

*"Music connects people, NeighborlyVolume connects neighbors!"*

## 🌟 Live Demo

Try the app: **[neighborlyvolume-app.onrender.com](https://neighborlyvolume-app.onrender.com)**

### Quick Start:
1. Connect your Spotify account
2. Generate a link for your neighbors
3. Share it via WhatsApp or copy-paste
4. Let neighbors control your volume
5. Enjoy peaceful coexistence! 🏠🎵

### Secret Easter Egg Hunt:
- Play Nightwish, Within Temptation, or Epica for special messages
- Try typing "meow mode" in the custom message field
- Discover the ultimate secret with "magic sparkles"
- See how many hidden features you can find! 🎭✨

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
