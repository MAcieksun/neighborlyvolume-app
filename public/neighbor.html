<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NeighborlyVolume - Kontrola Głośności</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎵</text></svg>">
    <script src="/socket.io/socket.io.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1DB954 0%, #191414 100%);
            min-height: 100vh;
            color: white;
            overflow-x: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            transition: all 0.5s ease;
        }

        body.rainbow-mode {
            background: linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 25%, #45b7d1 50%, #96ceb4 75%, #ffeaa7 100%);
            animation: rainbowShift 3s ease-in-out infinite;
        }

        @keyframes rainbowShift {
            0%, 100% { filter: hue-rotate(0deg); }
            50% { filter: hue-rotate(180deg); }
        }

        .container {
            max-width: 600px;
            width: 100%;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            animation: fadeInDown 1s ease-out;
            position: relative;
        }

        .language-toggle {
            position: absolute;
            top: 0;
            right: 0;
            display: flex;
            gap: 5px;
            z-index: 100;
        }

        .lang-btn {
            background: rgba(255,255,255,0.1);
            border: 2px solid rgba(255,255,255,0.2);
            color: white;
            padding: 6px 10px;
            border-radius: 15px;
            cursor: pointer;
            font-size: 0.75rem;
            transition: all 0.3s ease;
            font-weight: 500;
        }

        .lang-btn.active {
            background: #1DB954;
            border-color: #1DB954;
        }

        .lang-btn:hover {
            background: rgba(255,255,255,0.2);
        }

        .logo {
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 10px;
            background: linear-gradient(45deg, #1DB954, #1ed760, #ffffff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .subtitle {
            opacity: 0.9;
            font-size: 1.1rem;
            margin-bottom: 15px;
        }

        .card {
            background: rgba(255,255,255,0.1);
            border-radius: 20px;
            padding: 30px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.1);
            margin-bottom: 20px;
            animation: fadeInUp 0.6s ease-out;
        }

        /* EASTER EGG NOTIFICATIONS */
        .easter-egg-notification {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1);
            color: white;
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.4);
            z-index: 2000;
            max-width: 90%;
            text-align: center;
            font-size: 1.2rem;
            font-weight: bold;
            animation: easterEggPop 0.8s ease-out;
        }

        @keyframes easterEggPop {
            0% { transform: translate(-50%, -50%) scale(0.3) rotate(-10deg); opacity: 0; }
            50% { transform: translate(-50%, -50%) scale(1.1) rotate(5deg); }
            100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; }
        }

        /* SECRET MODE INDICATORS */
        .mode-indicators {
            position: fixed;
            top: 10px;
            left: 10px;
            display: flex;
            gap: 10px;
            z-index: 1500;
        }

        .mode-badge {
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 0.8rem;
            animation: modeActivated 0.5s ease-out;
        }

        @keyframes modeActivated {
            0% { transform: scale(0); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
        }

        /* Control Indicators */
        .control-indicators {
            margin: 20px 0;
            padding: 15px;
            background: rgba(255,255,255,0.05);
            border-radius: 12px;
            border-left: 4px solid #1DB954;
        }

        .controller-info {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 10px;
            padding: 10px;
            background: rgba(29, 185, 84, 0.2);
            border-radius: 8px;
            animation: slideInLeft 0.5s ease-out;
        }

        .controller-info.inactive {
            background: rgba(255,255,255,0.05);
            opacity: 0.7;
        }

        .pulse-dot {
            display: inline-block;
            width: 10px;
            height: 10px;
            background: #1DB954;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }

        .pulse-dot.inactive {
            background: #666;
            animation: none;
        }

        .pending-change {
            color: #FFC107;
            font-weight: 500;
            margin: 10px 0;
            padding: 10px;
            background: rgba(255, 193, 7, 0.1);
            border-radius: 8px;
            border-left: 3px solid #FFC107;
            animation: slideInRight 0.3s ease-out;
        }

        .conflict-warning {
            color: #FF5722;
            font-weight: 500;
            margin: 10px 0;
            padding: 12px;
            background: rgba(255, 87, 34, 0.15);
            border-radius: 8px;
            border-left: 3px solid #FF5722;
            animation: shake 0.6s ease-in-out;
        }

        .loading-section {
            text-align: center;
            padding: 40px 20px;
        }

        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255,255,255,0.3);
            border-top: 4px solid #1DB954;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }

        .error-section {
            text-align: center;
            padding: 40px 20px;
        }

        .error-icon {
            font-size: 4rem;
            margin-bottom: 20px;
        }

        .current-track {
            text-align: center;
            margin-bottom: 25px;
            padding: 20px;
            background: rgba(255,255,255,0.05);
            border-radius: 12px;
            border-left: 4px solid #1DB954;
        }

        .track-image {
            width: 100px;
            height: 100px;
            border-radius: 8px;
            object-fit: cover;
            margin: 0 auto 15px;
            display: block;
        }

        .track-name {
            font-size: 1.3rem;
            font-weight: bold;
            color: #1DB954;
            margin-bottom: 5px;
        }

        .track-artist {
            opacity: 0.8;
            margin-bottom: 5px;
        }

        .volume-control {
            text-align: center;
            margin: 30px 0;
        }

        .volume-display {
            font-size: 4rem;
            color: #1DB954;
            font-weight: bold;
            margin: 20px 0;
            text-shadow: 0 0 20px rgba(29, 185, 84, 0.5);
            transition: all 0.3s ease;
        }

        .volume-display.pending {
            color: #FFC107;
            animation: glow 1.5s ease-in-out infinite alternate;
        }

        .volume-slider {
            width: 100%;
            height: 15px;
            border-radius: 8px;
            background: rgba(255,255,255,0.2);
            outline: none;
            margin: 25px 0;
            -webkit-appearance: none;
            transition: all 0.3s ease;
        }

        .volume-slider:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .volume-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 35px;
            height: 35px;
            border-radius: 50%;
            background: linear-gradient(45deg, #1DB954, #1ed760);
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(29, 185, 84, 0.4);
            transition: all 0.3s ease;
        }

        .volume-slider::-webkit-slider-thumb:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(29, 185, 84, 0.6);
        }

        .volume-labels {
            display: flex;
            justify-content: space-between;
            margin-top: 15px;
            opacity: 0.6;
            font-size: 0.9rem;
        }

        .quick-actions {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 12px;
            margin: 25px 0;
        }

        .btn {
            background: linear-gradient(45deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
            border: 2px solid rgba(255,255,255,0.2);
            color: white;
            padding: 15px 20px;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 14px;
            font-weight: 500;
            text-align: center;
        }

        .btn:hover:not(:disabled) {
            background: rgba(255,255,255,0.2);
            border-color: #1DB954;
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }

        .btn:active {
            transform: translateY(0);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .btn.primary {
            background: linear-gradient(45deg, #1DB954, #1ed760);
            border-color: #1DB954;
        }

        .btn.primary:hover:not(:disabled) {
            background: linear-gradient(45deg, #1ed760, #22ff64);
        }

        /* CUSTOM MESSAGE SECTION */
        .custom-message-section {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background: rgba(255,255,255,0.05);
            border-radius: 12px;
            border-left: 4px solid #4ecdc4;
        }

        .custom-message-input {
            width: 100%;
            padding: 15px;
            border-radius: 12px;
            border: 2px solid rgba(255,255,255,0.2);
            background: rgba(255,255,255,0.1);
            color: white;
            font-size: 16px;
            margin: 15px 0;
            transition: all 0.3s ease;
        }

        .custom-message-input:focus {
            outline: none;
            border-color: #4ecdc4;
            box-shadow: 0 0 15px rgba(78, 205, 196, 0.3);
        }

        .custom-message-input::placeholder {
            color: rgba(255,255,255,0.6);
        }

        .emoji-section {
            text-align: center;
            margin: 30px 0;
        }

        .emoji-title {
            margin-bottom: 15px;
            font-size: 1.1rem;
        }

        .emoji-subtitle {
            font-size: 0.9rem;
            opacity: 0.7;
            margin-bottom: 20px;
        }

        .emoji-picker {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            max-width: 300px;
            margin: 0 auto;
        }

        .emoji-btn {
            font-size: 2rem;
            background: rgba(255,255,255,0.1);
            border: 2px solid rgba(255,255,255,0.2);
            border-radius: 50%;
            width: 70px;
            height: 70px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }

        .emoji-btn:hover:not(:disabled) {
            border-color: #1DB954;
            transform: scale(1.1) rotate(5deg);
            background: rgba(29, 185, 84, 0.2);
        }

        .emoji-btn:active {
            transform: scale(1.05) rotate(0deg);
        }

        .emoji-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .status-section {
            margin-top: 25px;
            padding: 20px;
            background: rgba(255,255,255,0.05);
            border-radius: 12px;
            text-align: center;
            min-height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .connection-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            background: #1DB954;
            border-radius: 50%;
            margin-right: 10px;
            animation: pulse 2s infinite;
        }

        .notification {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(-100px);
            background: #1DB954;
            color: white;
            padding: 15px 25px;
            border-radius: 25px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            z-index: 1001;
            transition: transform 0.5s ease;
            font-weight: 500;
            max-width: 90%;
        }

        .notification.show {
            transform: translateX(-50%) translateY(0);
        }

        .notification.error {
            background: #e74c3c;
        }

        .notification.success {
            background: #27ae60;
        }

        .notification.warning {
            background: #f39c12;
        }

        .notification.info {
            background: #3498db;
        }

        .notification.easter-egg {
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            font-weight: bold;
            animation: easterEggGlow 2s ease-in-out infinite;
        }

        @keyframes easterEggGlow {
            0%, 100% { box-shadow: 0 8px 25px rgba(0,0,0,0.3); }
            50% { box-shadow: 0 12px 35px rgba(255, 107, 107, 0.6); }
        }

        .hidden {
            display: none !important;
        }

        /* Animacje */
        @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideInLeft {
            from { opacity: 0; transform: translateX(-30px); }
            to { opacity: 1; transform: translateX(0); }
        }

        @keyframes slideInRight {
            from { opacity: 0; transform: translateX(30px); }
            to { opacity: 1; transform: translateX(0); }
        }

        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(29, 185, 84, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(29, 185, 84, 0); }
            100% { box-shadow: 0 0 0 0 rgba(29, 185, 84, 0); }
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }

        @keyframes glow {
            from { text-shadow: 0 0 20px rgba(255, 193, 7, 0.5); }
            to { text-shadow: 0 0 30px rgba(255, 193, 7, 0.8), 0 0 40px rgba(255, 193, 7, 0.3); }
        }

        @media (max-width: 768px) {
            .container {
                padding: 15px;
            }
            
            .logo {
                font-size: 2rem;
            }
            
            .volume-display {
                font-size: 3rem;
            }
            
            .emoji-picker {
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
            }
            
            .emoji-btn {
                width: 60px;
                height: 60px;
                font-size: 1.5rem;
            }
            
            .quick-actions {
                grid-template-columns: 1fr;
            }

            .language-toggle {
                position: relative;
                margin-bottom: 15px;
                justify-content: center;
            }
        }
    </style>
</head>
<body>
    <!-- Mode Indicators -->
    <div class="mode-indicators" id="mode-indicators"></div>

    <div class="notification" id="notification"></div>

    <div class="container">
        <div class="header">
            <div class="language-toggle">
                <button class="lang-btn active" onclick="setLanguage('pl')" id="lang-pl">PL</button>
                <button class="lang-btn" onclick="setLanguage('en')" id="lang-en">EN</button>
            </div>
            <div class="logo">🎵 NeighborlyVolume</div>
            <div class="subtitle" data-i18n="subtitle">Sąsiedzka Kontrola Głośności</div>
        </div>

        <!-- LOADING STATE -->
        <div class="card" id="loading-section">
            <div class="loading-section">
                <div class="spinner"></div>
                <h3 data-i18n="connecting">Łączenie z systemem...</h3>
                <p style="opacity: 0.7; margin-top: 10px;" data-i18n="checking-connection">
                    Sprawdzamy połączenie z muzyką sąsiada
                </p>
            </div>
        </div>

        <!-- ERROR STATE -->
        <div class="card hidden" id="error-section">
            <div class="error-section">
                <div class="error-icon">❌</div>
                <h3 data-i18n="session-not-found">Sesja nie została znaleziona</h3>
                <p style="opacity: 0.7; margin-top: 15px;" data-i18n="invalid-link">
                    Link może być nieprawidłowy lub wygasły.<br>
                    Poproś sąsiada o nowy link.
                </p>
            </div>
        </div>

        <!-- MAIN CONTROL -->
        <div class="card hidden" id="control-section">
            <!-- Control Indicators -->
            <div class="control-indicators">
                <div id="controller-info" class="controller-info inactive">
                    <span class="pulse-dot inactive" id="pulse-indicator"></span>
                    <span id="controller-text" data-i18n="no-controller">Nikt obecnie nie kontroluje głośności</span>
                </div>
                
                <div id="pending-change" class="pending-change hidden">
                    <strong data-i18n="pending-change">⏳ Oczekująca zmiana:</strong>
                    <span id="pending-details">Głośność zostanie zmieniona na 50% za 3 sekundy...</span>
                </div>
                
                <div id="conflict-warning" class="conflict-warning hidden">
                    <strong data-i18n="conflict-detected">⚠️ Wykryto konflikt głośności!</strong>
                    <div class="conflict-details" id="conflict-details" data-i18n="conflict-details">
                        Wiele osób próbuje kontrolować głośność - system uśrednia wartości
                    </div>
                </div>
            </div>

            <div class="current-track">
                <div class="connection-indicator"></div>
                <div style="margin-bottom: 15px;">
                    <strong data-i18n="now-playing">Teraz gra u sąsiada:</strong>
                </div>
                <img id="track-image" class="track-image hidden" src="" alt="Album cover">
                <div class="track-name" id="track-name">Ładowanie...</div>
                <div class="track-artist" id="track-artist"></div>
                <div style="opacity: 0.6; font-size: 0.9rem;" id="track-album"></div>
            </div>

            <div class="volume-control">
                <h3 style="margin-bottom: 20px;" data-i18n="volume-control">🎛️ Kontrola Głośności</h3>
                <div class="volume-display" id="volume-display">50%</div>
                <input type="range" min="0" max="100" value="50" 
                       class="volume-slider" id="volume-slider">
                <div class="volume-labels">
                    <span data-i18n="silent">🔇 Cisza</span>
                    <span data-i18n="loud">🔊 Głośno</span>
                </div>
            </div>

            <div class="quick-actions">
                <button class="btn" onclick="setVolume(0)">
                    <span data-i18n="mute">🤫 Wycisz</span>
                </button>
                <button class="btn" onclick="setVolume(25)">
                    <span data-i18n="quiet">🔉 Cicho</span>
                </button>
                <button class="btn" onclick="setVolume(50)">
                    <span data-i18n="medium">🎵 Średnio</span>
                </button>
                <button class="btn primary" onclick="sendThankYou()">
                    <span data-i18n="thanks">❤️ Dzięki!</span>
                </button>
            </div>

            <!-- CUSTOM MESSAGE SECTION -->
            <div class="custom-message-section">
                <div class="emoji-title" data-i18n="send-custom-message">💬 Wyślij Własną Wiadomość</div>
                <div class="emoji-subtitle" data-i18n="custom-hint">
                    ✨ napisz cokolwiek chcesz - może ukryte komendy? ✨
                </div>
                <input type="text" id="custom-message-input" class="custom-message-input" 
                       data-i18n-placeholder="message-placeholder" placeholder="Napisz swoją wiadomość... 🎵" maxlength="200">
                <button class="btn primary" onclick="sendCustomMessage()">
                    <span data-i18n="send-message">📤 Wyślij Wiadomość</span>
                </button>
                <p style="font-size: 0.8rem; opacity: 0.6; margin-top: 10px;" data-i18n="secret-commands-hint">
                    Wskazówka: spróbuj "meow mode", "poetry mode" lub "rainbow mode" 😉
                </p>
            </div>

            <div class="emoji-section">
                <div class="emoji-title" data-i18n="send-reaction">💬 Wyślij Reakcję</div>
                <div class="emoji-subtitle" data-i18n="poetic-messages">
                    ✨ poetyckie wiadomości dla sąsiada ✨
                </div>
                <div class="emoji-picker">
                    <button class="emoji-btn" onclick="sendEmoji('👍', 'Dzięki!')" data-i18n-title="thanks-emoji" title="Dzięki!">👍</button>
                    <button class="emoji-btn" onclick="sendEmoji('🤫', 'Za głośno')" data-i18n-title="too-loud" title="Za głośno">🤫</button>
                    <button class="emoji-btn" onclick="sendEmoji('❤️', 'Lubię!')" data-i18n-title="love-it" title="Lubię!">❤️</button>
                    <button class="emoji-btn" onclick="sendEmoji('🎵', 'Super!')" data-i18n-title="great-music" title="Super muzyka!">🎵</button>
                    <button class="emoji-btn" onclick="sendEmoji('😴', 'Śpię')" data-i18n-title="sleeping" title="Próbuję spać">😴</button>
                    <button class="emoji-btn" onclick="sendEmoji('🔥', 'Fire!')" data-i18n-title="fire" title="Zajebiste!">🔥</button>
                </div>
            </div>

            <div class="status-section">
                <div id="status-text">
                    <span class="connection-indicator"></span>
                    <span data-i18n="connected-status">Połączono z systemem sąsiada • Wszystko działa prawidłowo</span>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Global state
        let appState = {
            linkId: null,
            currentVolume: 50,
            socket: null,
            neighborId: 'neighbor_' + Math.random().toString(36).substr(2, 9),
            isRateLimited: false,
            pendingVolumeChange: null,
            currentController: null,
            currentLanguage: 'pl',
            globalModes: {
                catMode: false,
                poetryMode: false,
                rainbowMode: false
            }
        };

        // Translations
        const translations = {
            pl: {
                "subtitle": "Sąsiedzka Kontrola Głośności",
                "connecting": "Łączenie z systemem...",
                "checking-connection": "Sprawdzamy połączenie z muzyką sąsiada",
                "session-not-found": "Sesja nie została znaleziona",
                "invalid-link": "Link może być nieprawidłowy lub wygasły.<br>Poproś sąsiada o nowy link.",
                "no-controller": "Nikt obecnie nie kontroluje głośności",
                "pending-change": "⏳ Oczekująca zmiana:",
                "conflict-detected": "⚠️ Wykryto konflikt głośności!",
                "conflict-details": "Wiele osób próbuje kontrolować głośność - system uśrednia wartości",
                "now-playing": "Teraz gra u sąsiada:",
                "volume-control": "🎛️ Kontrola Głośności",
                "silent": "🔇 Cisza",
                "loud": "🔊 Głośno",
                "mute": "🤫 Wycisz",
                "quiet": "🔉 Cicho",
                "medium": "🎵 Średnio",
                "thanks": "❤️ Dzięki!",
                "send-custom-message": "💬 Wyślij Własną Wiadomość",
                "custom-hint": "✨ napisz cokolwiek chcesz - może ukryte komendy? ✨",
                "message-placeholder": "Napisz swoją wiadomość... 🎵",
                "send-message": "📤 Wyślij Wiadomość",
                "secret-commands-hint": "Wskazówka: spróbuj \"meow mode\", \"poetry mode\" lub \"rainbow mode\" 😉",
                "send-reaction": "💬 Wyślij Reakcję",
                "poetic-messages": "✨ poetyckie wiadomości dla sąsiada ✨",
                "thanks-emoji": "Dzięki!",
                "too-loud": "Za głośno",
                "love-it": "Lubię!",
                "great-music": "Super muzyka!",
                "sleeping": "Próbuję spać",
                "fire": "Zajebiste!",
                "connected-status": "Połączono z systemem sąsiada • Wszystko działa prawidłowo",
                "connected-neighbor": "🎵 Połączono z muzyką sąsiada!",
                "volume-applied": "✅ Głośność zmieniona na",
                "volume-scheduled": "🔊 Zmiana na",
                "zostanie-zastosowana": "zostanie zastosowana",
                "message-sent": "📤 Wiadomość wysłana!",
                "secret-activated": "🎭",
                "waiting-for-changes": "⏳ Poczekaj chwilę przed następną zmianą",
                "volume-control-error": "❌ Błąd kontroli głośności",
                "message-empty": "❌ Napisz jakąś wiadomość!",
                "message-too-long": "❌ Wiadomość za długa (max 200 znaków)",
                "message-error": "❌ Błąd wysyłania wiadomości",
                "you-control": "Ty",
                "other-neighbor": "Inny sąsiad",
                "controls-volume": "obecnie kontroluje głośność"
            },
            en: {
                "subtitle": "Neighbor Volume Control",
                "connecting": "Connecting to system...",
                "checking-connection": "Checking connection to neighbor's music",
                "session-not-found": "Session not found",
                "invalid-link": "Link may be invalid or expired.<br>Ask your neighbor for a new link.",
                "no-controller": "No one is currently controlling volume",
                "pending-change": "⏳ Pending change:",
                "conflict-detected": "⚠️ Volume conflict detected!",
                "conflict-details": "Multiple people are trying to control volume - system is averaging values",
                "now-playing": "Now playing at neighbor's:",
                "volume-control": "🎛️ Volume Control",
                "silent": "🔇 Silent",
                "loud": "🔊 Loud",
                "mute": "🤫 Mute",
                "quiet": "🔉 Quiet",
                "medium": "🎵 Medium",
                "thanks": "❤️ Thanks!",
                "send-custom-message": "💬 Send Custom Message",
                "custom-hint": "✨ write anything you want - maybe hidden commands? ✨",
                "message-placeholder": "Write your message... 🎵",
                "send-message": "📤 Send Message",
                "secret-commands-hint": "Hint: try \"meow mode\", \"poetry mode\" or \"rainbow mode\" 😉",
                "send-reaction": "💬 Send Reaction",
                "poetic-messages": "✨ poetic messages for your neighbor ✨",
                "thanks-emoji": "Thanks!",
                "too-loud": "Too loud",
                "love-it": "Love it!",
                "great-music": "Great music!",
                "sleeping": "Trying to sleep",
                "fire": "Awesome!",
                "connected-status": "Connected to neighbor's system • Everything working fine",
                "connected-neighbor": "🎵 Connected to neighbor's music!",
                "volume-applied": "✅ Volume changed to",
                "volume-scheduled": "🔊 Change to",
                "zostanie-zastosowana": "will be applied",
                "message-sent": "📤 Message sent!",
                "secret-activated": "🎭",
                "waiting-for-changes": "⏳ Wait a moment before next change",
                "volume-control-error": "❌ Volume control error",
                "message-empty": "❌ Write some message!",
                "message-too-long": "❌ Message too long (max 200 characters)",
                "message-error": "❌ Message sending error",
                "you-control": "You",
                "other-neighbor": "Other neighbor",
                "controls-volume": "is currently controlling volume"
            }
        };

        // Set language
        function setLanguage(lang) {
            appState.currentLanguage = lang;
            localStorage.setItem('neighborly_neighbor_language', lang);
            
            // Update UI
            document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById(`lang-${lang}`).classList.add('active');
            
            // Update all translatable elements
            document.querySelectorAll('[data-i18n]').forEach(element => {
                const key = element.getAttribute('data-i18n');
                if (translations[lang][key]) {
                    element.innerHTML = translations[lang][key];
                }
            });
            
            // Update placeholders
            document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
                const key = element.getAttribute('data-i18n-placeholder');
                if (translations[lang][key]) {
                    element.placeholder = translations[lang][key];
                }
            });
            
            // Update titles
            document.querySelectorAll('[data-i18n-title]').forEach(element => {
                const key = element.getAttribute('data-i18n-title');
                if (translations[lang][key]) {
                    element.title = translations[lang][key];
                }
            });
            
            const langMessage = lang === 'pl' ? '🇵🇱 Język zmieniony na polski' : '🇺🇸 Language changed to English';
            showNotification(langMessage, 'success');
        }

        // Poetic messages for each emoji (now bilingual)
        const poeticMessages = {
            '👍': {
                pl: [
                    "jak morze spokojne, gdy muzyka cichnie ☕",
                    "słodka cisza w serca rytmie 🌙",
                    "dzięki za ten miły gest, jak ranek łagodny ☀️",
                    "harmonia mieszka między nami 🕊️",
                    "twoja dobroć jak ciepła herbatka 🍃"
                ],
                en: [
                    "like a calm sea when music softens ☕",
                    "sweet silence in heart's rhythm 🌙",
                    "thanks for this kind gesture, like gentle morning ☀️",
                    "harmony lives between us 🕊️",
                    "your kindness like warm tea 🍃"
                ]
            },
            '🤫': {
                pl: [
                    "cisza jest złotem, a ty anioł dobrego sąsiedztwa 👼",
                    "jak szept wiatru przez okno - dziękuję 🌿",
                    "nocny spokój wraca do nas ✨",
                    "w ciszy odnajduję serce 💙",
                    "cichość jak delikatna poezja 📖"
                ],
                en: [
                    "silence is golden, and you're an angel of good neighborliness 👼",
                    "like wind's whisper through window - thank you 🌿",
                    "night's peace returns to us ✨",
                    "in silence I find my heart 💙",
                    "quietness like gentle poetry 📖"
                ]
            },
            '❤️': {
                pl: [
                    "serce tańczy do melodii dobroci 💃",
                    "miłość mieszka w małych gestach ☕",
                    "jak słodka kawka o poranku - ciepło 🌅",
                    "muzyka łączy, a ty łączysz nas jeszcze bardziej 🎵",
                    "love is in the air, and in the volume control 💕"
                ],
                en: [
                    "heart dances to melody of kindness 💃",
                    "love lives in small gestures ☕",
                    "like sweet coffee in the morning - warmth 🌅",
                    "music connects, and you connect us even more 🎵",
                    "love is in the air, and in the volume control 💕"
                ]
            },
            '🎵': {
                pl: [
                    "melodie płyną jak rzeka, ty ich kapitanem 🚢",
                    "muzyka jest językiem duszy, kontrola - poezją 🎭",
                    "w rytmie serca i bitów - dziękuję 💗",
                    "harmonie przeplatają się z harmonią sąsiedzką 🎼",
                    "każda nuta ma teraz swoje miejsce 🌺"
                ],
                en: [
                    "melodies flow like a river, you're their captain 🚢",
                    "music is soul's language, control is poetry 🎭",
                    "in rhythm of heart and beats - thank you 💗",
                    "harmonies interweave with neighborly harmony 🎼",
                    "every note now has its place 🌺"
                ]
            },
            '😴': {
                pl: [
                    "sen przychodzi jak łagodna fala 🌊",
                    "w objęciach ciszy znajdę sny 🌙",
                    "morpheus czeka, a ty mu pomagasz ✨",
                    "noc będzie słodka jak poezja 📜",
                    "spokój nocny wraca do domu 🏠"
                ],
                en: [
                    "sleep comes like gentle wave 🌊",
                    "in silence's embrace I'll find dreams 🌙",
                    "morpheus waits, and you help him ✨",
                    "night will be sweet like poetry 📜",
                    "night's peace returns home 🏠"
                ]
            },
            '🔥': {
                pl: [
                    "ta muzyka jak ogień w sercu, ale teraz w sam raz 🔥",
                    "energia kontrolowana to poezja w ruchu 💫",
                    "fire vibes z mądrością - idealne połączenie ⚡",
                    "płomień artysty, serce sąsiada 🎨",
                    "jak gwiazda - świeci, ale nie oślepia ⭐"
                ],
                en: [
                    "this music like fire in heart, but now just right 🔥",
                    "controlled energy is poetry in motion 💫",
                    "fire vibes with wisdom - perfect combination ⚡",
                    "artist's flame, neighbor's heart 🎨",
                    "like a star - shines but doesn't blind ⭐"
                ]
            }
        };

        // Initialize app
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🎵 NeighborlyVolume Neighbor Control starting...');
            
            // Restore language preference
            const savedLang = localStorage.getItem('neighborly_neighbor_language') || 'pl';
            setLanguage(savedLang);
            
            // Get linkId from URL
            const pathParts = window.location.pathname.split('/');
            appState.linkId = pathParts[pathParts.length - 1];
            
            if (!appState.linkId || appState.linkId === 'neighbor.html') {
                showError();
                return;
            }
            
            initializeControls();
            loadSessionData();
            connectWebSocket();
            
            // Add Enter key support for custom message
            document.getElementById('custom-message-input').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    sendCustomMessage();
                }
            });
        });

        // Initialize volume controls
        function initializeControls() {
            const volumeSlider = document.getElementById('volume-slider');
            
            volumeSlider.addEventListener('input', function() {
                const newVolume = parseInt(this.value);
                updateVolumeDisplay(newVolume);
                
                // Debounced volume control
                clearTimeout(appState.volumeTimeout);
                appState.volumeTimeout = setTimeout(() => {
                    controlVolume(newVolume);
                }, 300);
            });
        }

        // Load session data
        async function loadSessionData() {
            try {
                const response = await fetch(`/api/status/${appState.linkId}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const data = await response.json();
                
                // Update UI with session data
                updateTrackInfo(data.track);
                updateVolumeDisplay(data.volume);
                
                // Update controller info
                if (data.currentController) {
                    updateControllerInfo(data.currentController);
                }
                
                // Update global modes
                if (data.globalModes) {
                    appState.globalModes = data.globalModes;
                    updateModeIndicators();
                    updateBodyClasses();
                }
                
                // Check for Easter Egg on load
                if (data.easterEgg && data.easterEgg.detected) {
                    showEasterEgg(data.easterEgg);
                }
                
                // Show control section
                document.getElementById('loading-section').classList.add('hidden');
                document.getElementById('control-section').classList.remove('hidden');
                
                showNotification(translations[appState.currentLanguage]['connected-neighbor'], 'success');
                
                // Start periodic updates
                startStatusUpdates();
                
            } catch (error) {
                console.error('Load session error:', error);
                showError();
            }
        }

        // Show error state
        function showError() {
            document.getElementById('loading-section').classList.add('hidden');
            document.getElementById('error-section').classList.remove('hidden');
        }

        // Update track info
        function updateTrackInfo(track) {
            if (track) {
                document.getElementById('track-name').textContent = track.name;
                document.getElementById('track-artist').textContent = track.artist;
                document.getElementById('track-album').textContent = track.album || '';
                
                if (track.image) {
                    const img = document.getElementById('track-image');
                    img.src = track.image;
                    img.classList.remove('hidden');
                }
            } else {
                document.getElementById('track-name').textContent = appState.currentLanguage === 'pl' ? 'Brak aktywnej muzyki' : 'No active music';
                document.getElementById('track-artist').textContent = '';
                document.getElementById('track-album').textContent = '';
            }
        }

        // Update volume display
        function updateVolumeDisplay(volume) {
            appState.currentVolume = volume;
            document.getElementById('volume-display').textContent = `${volume}%`;
            document.getElementById('volume-slider').value = volume;
            
            // Color coding based on volume
            const volumeEl = document.getElementById('volume-display');
            if (volume === 0) volumeEl.style.color = '#666';
            else if (volume <= 30) volumeEl.style.color = '#1DB954';
            else if (volume <= 70) volumeEl.style.color = '#FFC107';
            else volumeEl.style.color = '#FF5722';
        }

        // Update controller info
        function updateControllerInfo(controllerId) {
            const controllerInfo = document.getElementById('controller-info');
            const pulseIndicator = document.getElementById('pulse-indicator');
            const controllerText = document.getElementById('controller-text');
            
            if (controllerId) {
                const displayName = controllerId === appState.neighborId ? 
                    translations[appState.currentLanguage]['you-control'] : 
                    (controllerId.startsWith('neighbor_') ? translations[appState.currentLanguage]['other-neighbor'] : controllerId);
                
                controllerInfo.classList.remove('inactive');
                pulseIndicator.classList.remove('inactive');
                controllerText.textContent = `${displayName} ${translations[appState.currentLanguage]['controls-volume']}`;
                
                appState.currentController = controllerId;
                
                // Auto-hide after 5 seconds if not current user
                if (controllerId !== appState.neighborId) {
                    setTimeout(() => {
                        if (appState.currentController === controllerId) {
                            controllerInfo.classList.add('inactive');
                            pulseIndicator.classList.add('inactive');
                            controllerText.textContent = translations[appState.currentLanguage]['no-controller'];
                            appState.currentController = null;
                        }
                    }, 5000);
                }
            } else {
                controllerInfo.classList.add('inactive');
                pulseIndicator.classList.add('inactive');
                controllerText.textContent = translations[appState.currentLanguage]['no-controller'];
                appState.currentController = null;
            }
        }

        // Update mode indicators
        function updateModeIndicators() {
            const container = document.getElementById('mode-indicators');
            container.innerHTML = '';
            
            if (appState.globalModes.catMode) {
                const badge = document.createElement('div');
                badge.className = 'mode-badge';
                badge.textContent = '🐱 Cat Mode';
                container.appendChild(badge);
            }
            
            if (appState.globalModes.poetryMode) {
                const badge = document.createElement('div');
                badge.className = 'mode-badge';
                badge.textContent = '📜 Poetry Mode';
                container.appendChild(badge);
            }
            
            if (appState.globalModes.rainbowMode) {
                const badge = document.createElement('div');
                badge.className = 'mode-badge';
                badge.textContent = '🌈 Rainbow Mode';
                container.appendChild(badge);
            }
        }

        // Update body classes for visual effects
        function updateBodyClasses() {
            document.body.classList.toggle('rainbow-mode', appState.globalModes.rainbowMode);
        }

        // Show Easter Egg notification
        function showEasterEgg(easterEgg) {
            // Create special Easter Egg notification
            const easterEggDiv = document.createElement('div');
            easterEggDiv.className = 'easter-egg-notification';
            easterEggDiv.innerHTML = `
                <div style="font-size: 2rem; margin-bottom: 15px;">🎭✨🎵</div>
                <div style="margin-bottom: 10px;">EASTER EGG DETECTED!</div>
                <div style="font-size: 1rem; opacity: 0.9;">${easterEgg.message}</div>
            `;
            
            document.body.appendChild(easterEggDiv);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                easterEggDiv.remove();
            }, 5000);
            
            // Also show regular notification
            showNotification(`🎭 ${easterEgg.message}`, 'easter-egg');
        }

        // Show pending change
        function showPendingChange(userId, volume, originalVolume, delay, isConflictResolution) {
            const pendingEl = document.getElementById('pending-change');
            const detailsEl = document.getElementById('pending-details');
            const volumeDisplay = document.getElementById('volume-display');
            
            if (isConflictResolution) {
                detailsEl.innerHTML = appState.currentLanguage === 'pl' ? `
                    <strong>Konflikt rozwiązany!</strong><br>
                    Twoja zmiana (${originalVolume}%) została uśredniona do ${volume}%<br>
                    Zmiana nastąpi za <span id="pending-countdown">${Math.ceil(delay/1000)}</span> sekund
                ` : `
                    <strong>Conflict resolved!</strong><br>
                    Your change (${originalVolume}%) was averaged to ${volume}%<br>
                    Change will happen in <span id="pending-countdown">${Math.ceil(delay/1000)}</span> seconds
                `;
            } else {
                const text = appState.currentLanguage === 'pl' ? 
                    `Głośność zostanie zmieniona na ${volume}% za` :
                    `Volume will be changed to ${volume}% in`;
                detailsEl.innerHTML = `
                    ${text} <span id="pending-countdown">${Math.ceil(delay/1000)}</span> ${appState.currentLanguage === 'pl' ? 'sekund' : 'seconds'}
                `;
            }
            
            pendingEl.classList.remove('hidden');
            volumeDisplay.classList.add('pending');
            
            // Countdown timer
            let timeLeft = Math.ceil(delay / 1000);
            const countdownEl = document.getElementById('pending-countdown');
            
            const timer = setInterval(() => {
                timeLeft--;
                if (countdownEl) {
                    countdownEl.textContent = timeLeft;
                }
                
                if (timeLeft <= 0) {
                    clearInterval(timer);
                    hidePendingChange();
                }
            }, 1000);
            
            appState.pendingVolumeChange = { timer, volume };
        }

        // Hide pending change
        function hidePendingChange() {
            document.getElementById('pending-change').classList.add('hidden');
            document.getElementById('volume-display').classList.remove('pending');
            
            if (appState.pendingVolumeChange) {
                clearInterval(appState.pendingVolumeChange.timer);
                appState.pendingVolumeChange = null;
            }
        }

        // Show conflict warning
        function showConflictWarning(conflictingUsers, originalVolume, averagedVolume) {
            const warningEl = document.getElementById('conflict-warning');
            const detailsEl = document.getElementById('conflict-details');
            
            const text = appState.currentLanguage === 'pl' ? 
                `${conflictingUsers.length} osób próbuje kontrolować głośność jednocześnie.<br>Twoja wartość (${originalVolume}%) została uśredniona z innymi do ${averagedVolume}%` :
                `${conflictingUsers.length} people are trying to control volume simultaneously.<br>Your value (${originalVolume}%) was averaged with others to ${averagedVolume}%`;
            
            detailsEl.innerHTML = text;
            
            warningEl.classList.remove('hidden');
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                warningEl.classList.add('hidden');
            }, 5000);
        }

        // Control volume
        async function controlVolume(volume) {
            if (appState.isRateLimited) {
                showNotification(translations[appState.currentLanguage]['waiting-for-changes'], 'warning');
                return;
            }

            try {
                const response = await fetch(`/api/control/${appState.linkId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        volume: volume,
                        neighborId: appState.neighborId,
                        action: 'volume_change'
                    })
                });

                const data = await response.json();
                
                if (response.status === 429) {
                    // Rate limited
                    appState.isRateLimited = true;
                    showNotification(`⏰ ${data.message}`, 'warning');
                    
                    // Re-enable after retry time
                    setTimeout(() => {
                        appState.isRateLimited = false;
                        const reenabledText = appState.currentLanguage === 'pl' ? 
                            '✅ Możesz ponownie kontrolować głośność' :
                            '✅ You can control volume again';
                        showNotification(reenabledText, 'success');
                    }, data.retryAfter * 1000);
                    
                    return;
                }
                
                if (data.success) {
                    const scheduledText = appState.currentLanguage === 'pl' ? 
                        `🔊 Zmiana głośności na ${volume}% zaplanowana` :
                        `🔊 Volume change to ${volume}% scheduled`;
                    updateStatusText(scheduledText);
                    
                    const appliedText = appState.currentLanguage === 'pl' ?
                        `🔊 Zmiana na ${volume}% zostanie zastosowana` :
                        `🔊 Change to ${volume}% will be applied`;
                    showNotification(appliedText, 'info');
                    
                    // Handle Easter Egg
                    if (data.easterEgg && data.easterEgg.detected) {
                        showEasterEgg(data.easterEgg);
                    }
                } else {
                    throw new Error(data.error || 'Failed to control volume');
                }
                
            } catch (error) {
                console.error('Volume control error:', error);
                showNotification(translations[appState.currentLanguage]['volume-control-error'], 'error');
            }
        }

        // Set specific volume
        function setVolume(volume) {
            updateVolumeDisplay(volume);
            controlVolume(volume);
        }

        // Send custom message
        async function sendCustomMessage() {
            const input = document.getElementById('custom-message-input');
            const message = input.value.trim();
            
            if (!message) {
                showNotification(translations[appState.currentLanguage]['message-empty'], 'error');
                return;
            }
            
            if (message.length > 200) {
                showNotification(translations[appState.currentLanguage]['message-too-long'], 'error');
                return;
            }
            
            try {
                const response = await fetch(`/api/control/${appState.linkId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        neighborId: appState.neighborId,
                        action: 'custom_message',
                        customMessage: message
                    })
                });

                const data = await response.json();
                
                if (data.success) {
                    // Check if it was a secret command
                    if (data.secretActivated) {
                        showNotification(`${translations[appState.currentLanguage]['secret-activated']} ${data.message}`, 'success');
                        // Don't clear input for secret commands so user can see what they typed
                    } else {
                        const sentText = appState.currentLanguage === 'pl' ?
                            `📤 Wysłano: "${data.message || message}"` :
                            `📤 Sent: "${data.message || message}"`;
                        updateStatusText(sentText);
                        showNotification(translations[appState.currentLanguage]['message-sent'], 'success');
                        input.value = ''; // Clear input only for regular messages
                    }
                    
                    // Handle Easter Egg
                    if (data.easterEgg && data.easterEgg.detected) {
                        showEasterEgg(data.easterEgg);
                    }
                    
                    // Handle applied modes
                    if (data.appliedModes && data.appliedModes.length > 0) {
                        const modesText = appState.currentLanguage === 'pl' ?
                            `✨ Zastosowano tryby: ${data.appliedModes.join(', ')}` :
                            `✨ Applied modes: ${data.appliedModes.join(', ')}`;
                        showNotification(modesText, 'info');
                    }
                    
                } else {
                    throw new Error(data.error || 'Failed to send message');
                }
                
            } catch (error) {
                console.error('Send custom message error:', error);
                showNotification(translations[appState.currentLanguage]['message-error'], 'error');
            }
        }

        // Send emoji with poetic message
        async function sendEmoji(emoji, fallbackMessage) {
            try {
                // Get random poetic message in current language
                const messages = poeticMessages[emoji] ? poeticMessages[emoji][appState.currentLanguage] : [fallbackMessage];
                const poeticMessage = messages[Math.floor(Math.random() * messages.length)];
                
                const response = await fetch(`/api/control/${appState.linkId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        neighborId: appState.neighborId,
                        action: 'emoji_message',
                        message: poeticMessage
                    })
                });

                const data = await response.json();
                
                if (data.success) {
                    const sentText = appState.currentLanguage === 'pl' ?
                        `${emoji} Wysłano: "${data.message || poeticMessage}"` :
                        `${emoji} Sent: "${data.message || poeticMessage}"`;
                    updateStatusText(sentText);
                    showNotification(`${emoji} ${translations[appState.currentLanguage]['message-sent']}`, 'success');
                    
                    // Animate emoji button
                    animateButton(event.target);
                    
                    // Handle Easter Egg
                    if (data.easterEgg && data.easterEgg.detected) {
                        showEasterEgg(data.easterEgg);
                    }
                } else {
                    throw new Error(data.error || 'Failed to send message');
                }
                
            } catch (error) {
                console.error('Send emoji error:', error);
                showNotification(translations[appState.currentLanguage]['message-error'], 'error');
            }
        }

        // Send thank you message
        async function sendThankYou() {
            const thankYouMessages = {
                pl: [
                    "jak morze uspokaja fale, tak ty moje głośniki 🌊 ☕",
                    "słodka harmonia między nami jak kawka o poranku ☀️",
                    "w rytmie serca i muzyki - dziękuję za cierpliwość 💙",
                    "poezja to ty, melodia to ja, razem tworzymy symfonię 🎵",
                    "miłość sąsiedzka piękniejsza niż każda ballada 💕"
                ],
                en: [
                    "like sea calms waves, so you calm my speakers 🌊 ☕",
                    "sweet harmony between us like morning coffee ☀️",
                    "in rhythm of heart and music - thank you for patience 💙",
                    "poetry is you, melody is me, together we create symphony 🎵",
                    "neighborly love more beautiful than any ballad 💕"
                ]
            };
            
            const messages = thankYouMessages[appState.currentLanguage];
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            
            try {
                const response = await fetch(`/api/control/${appState.linkId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        neighborId: appState.neighborId,
                        action: 'thank_you',
                        message: randomMessage
                    })
                });

                const data = await response.json();
                
                if (data.success) {
                    const sentText = appState.currentLanguage === 'pl' ?
                        `❤️ Podziękowanie: "${data.message || randomMessage}"` :
                        `❤️ Thank you: "${data.message || randomMessage}"`;
                    updateStatusText(sentText);
                    
                    const thanksText = appState.currentLanguage === 'pl' ?
                        '❤️ Poetyckie dzięki wysłane!' :
                        '❤️ Poetic thanks sent!';
                    showNotification(thanksText, 'success');
                    
                    // Animate button
                    animateButton(event.target);
                    
                    // Handle Easter Egg
                    if (data.easterEgg && data.easterEgg.detected) {
                        showEasterEgg(data.easterEgg);
                    }
                } else {
                    throw new Error(data.error || 'Failed to send thank you');
                }
                
            } catch (error) {
                console.error('Send thank you error:', error);
                showNotification(translations[appState.currentLanguage]['message-error'], 'error');
            }
        }

        // Animate button
        function animateButton(button) {
            button.style.transform = 'scale(1.2) rotate(10deg)';
            button.style.borderColor = '#1DB954';
            
            setTimeout(() => {
                button.style.transform = 'scale(1) rotate(0deg)';
                button.style.borderColor = 'rgba(255,255,255,0.2)';
            }, 200);
        }

        // Update status text
        function updateStatusText(message) {
            document.getElementById('status-text').innerHTML = 
                `<span class="connection-indicator"></span>${message}`;
            
            setTimeout(() => {
                const defaultText = translations[appState.currentLanguage]['connected-status'];
                document.getElementById('status-text').innerHTML = 
                    `<span class="connection-indicator"></span>${defaultText}`;
            }, 5000);
        }

        // Start periodic status updates
        function startStatusUpdates() {
            setInterval(async () => {
                try {
                    const response = await fetch(`/api/status/${appState.linkId}`);
                    if (response.ok) {
                        const data = await response.json();
                        updateTrackInfo(data.track);
                        
                        // Update volume if it changed externally
                        if (data.volume !== appState.currentVolume) {
                            updateVolumeDisplay(data.volume);
                        }
                        
                        // Update controller if changed
                        if (data.currentController !== appState.currentController) {
                            updateControllerInfo(data.currentController);
                        }
                        
                        // Update global modes if changed
                        if (data.globalModes && JSON.stringify(data.globalModes) !== JSON.stringify(appState.globalModes)) {
                            appState.globalModes = data.globalModes;
                            updateModeIndicators();
                            updateBodyClasses();
                        }
                        
                        // Check for Easter Egg
                        if (data.easterEgg && data.easterEgg.detected) {
                            // Only show if we haven't shown this one recently
                            if (!appState.lastEasterEgg || appState.lastEasterEgg.message !== data.easterEgg.message) {
                                showEasterEgg(data.easterEgg);
                                appState.lastEasterEgg = data.easterEgg;
                            }
                        }
                    }
                } catch (error) {
                    console.error('Status update error:', error);
                }
            }, 10000); // Update every 10 seconds
        }

        // Connect WebSocket for real-time updates
        function connectWebSocket() {
            appState.socket = io();
            
            appState.socket.on('connect', () => {
                console.log('🔌 WebSocket connected');
                appState.socket.emit('join_session', appState.linkId);
            });
            
            appState.socket.on('disconnect', () => {
                console.log('❌ WebSocket disconnected');
            });
            
            // Listen for session updates
            appState.socket.on(`session_${appState.linkId}`, (data) => {
                console.log('📡 Received:', data.type, data);
                
                switch(data.type) {
                    case 'volume_pending':
                        showPendingChange(
                            data.userId, 
                            data.volume, 
                            data.originalVolume,
                            data.willApplyIn,
                            data.isConflictResolution
                        );
                        break;
                        
                    case 'volume_applied':
                        hidePendingChange();
                        updateVolumeDisplay(data.volume);
                        const appliedText = `${translations[appState.currentLanguage]['volume-applied']} ${data.volume}%`;
                        showNotification(appliedText, 'success');
                        break;
                        
                    case 'conflict_detected':
                        showConflictWarning(
                            data.conflictingUsers,
                            data.originalVolume,
                            data.averagedVolume
                        );
                        showNotification(data.message, 'warning');
                        break;
                        
                    case 'controller_changed':
                        updateControllerInfo(data.currentController);
                        break;
                        
                    case 'volume_error':
                        hidePendingChange();
                        showNotification(`❌ ${data.message}`, 'error');
                        break;
                        
                    case 'neighbor_action':
                        // Handle existing neighbor actions (messages, etc.)
                        if (data.session && data.session.volume !== undefined) {
                            updateVolumeDisplay(data.session.volume);
                        }
                        break;
                        
                    case 'session_joined':
                        // Handle session join response
                        if (data.currentController) {
                            updateControllerInfo(data.currentController);
                        }
                        if (data.globalModes) {
                            appState.globalModes = data.globalModes;
                            updateModeIndicators();
                            updateBodyClasses();
                        }
                        if (data.easterEgg && data.easterEgg.detected) {
                            showEasterEgg(data.easterEgg);
                        }
                        break;
                }
                
                // Handle global updates
                if (data.globalModes && JSON.stringify(data.globalModes) !== JSON.stringify(appState.globalModes)) {
                    appState.globalModes = data.globalModes;
                    updateModeIndicators();
                    updateBodyClasses();
                }
                
                // Handle Easter Eggs from WebSocket
                if (data.easterEgg && data.easterEgg.detected) {
                    showEasterEgg(data.easterEgg);
                }
            });
        }

        // Show notification
        function showNotification(message, type = 'info') {
            const notification = document.getElementById('notification');
            notification.textContent = message;
            notification.className = `notification ${type}`;
            notification.classList.add('show');
            
            setTimeout(() => {
                notification.classList.remove('show');
            }, type === 'easter-egg' ? 5000 : 3000);
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (appState.isRateLimited) return; // Ignore if rate limited
            
            // Don't trigger shortcuts when typing in input
            if (e.target.tagName === 'INPUT') return;
            
            switch(e.key) {
                case 'm':
                case 'M':
                    setVolume(0);
                    break;
                case 'r':
                case 'R':
                    setVolume(50);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    const newVolumeUp = Math.min(100, appState.currentVolume + 5);
                    setVolume(newVolumeUp);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    const newVolumeDown = Math.max(0, appState.currentVolume - 5);
                    setVolume(newVolumeDown);
                    break;
                case 'Enter':
                    // Focus on custom message input if not already focused
                    if (e.target.id !== 'custom-message-input') {
                        document.getElementById('custom-message-input').focus();
                    }
                    break;
            }
        });
    </script>
</body>
</html>
