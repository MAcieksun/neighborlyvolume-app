const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "OPTIONS"]
    }
});

const PORT = process.env.PORT || 10000;

// ===== KONFIGURACJA Z DEBUGOWANIEM =====
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const BASE_URL = process.env.BASE_URL || 'https://neighborlyvolume-app.onrender.com';

console.log('🔧 CONFIG CHECK:');
console.log('CLIENT_ID:', SPOTIFY_CLIENT_ID ? 'SET ✅' : 'MISSING ❌');
console.log('CLIENT_SECRET:', SPOTIFY_CLIENT_SECRET ? 'SET ✅' : 'MISSING ❌');
console.log('BASE_URL:', BASE_URL);
console.log('PORT:', PORT);

// Middleware
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== PRZECHOWYWANIE SESJI =====
const activeSessions = new Map();
const userTokens = new Map();

// ===== EASTER EGGS =====
const FAVORITE_ARTISTS = [
    'nightwish', 'within temptation', 'epica', 'closterkeller', 
    'bjork', 'björk', 'tori amos'
];

const EASTER_EGG_MESSAGES = {
    'nightwish': [
        "🌙 Wishmaster! Ten utwór to prawdziwa magia symfonii metalowej! ✨",
        "🎭 Tarja lub Floor - obojętnie kto śpiewa, to zawsze jest epickie! 🎵",
        "❄️ Finnish metal magic w powietrzu - absolutna perfekcja! 🇫🇮",
        "🌟 Ghost Love Score gra? Nie można tego słuchać cicho! 💫"
    ],
    'within temptation': [
        "🏰 Sharon Den Adel - głos aniołów i potęga orkiestr! 👑",
        "🖤 Gothic metal w najczystszej postaci - ciężko nie łkać! 💜",
        "⚡ Ice Queen czy Angels? Każdy utwór to emocjonalna podróż! 🎪",
        "🎻 Orkiestrowe brzmienia + metal = receptura na szczęście! 🎼"
    ],
    'epica': [
        "🎭 Simone Simons i jej operowy głos to definicja perfekcji! 👸",
        "⚔️ Symphonic metal w wykonaniu mistrzów - filozofia w dźwiękach! 🛡️",
        "🌊 Design Your Universe to ocean emocji i mądrości! 🌌",
        "🎪 Mark Jansen wie jak tworzyć muzyczne eposy! 📚"
    ],
    'closterkeller': [
        "🇵🇱 Anja Orthodox - ikona polskiego gothicu! Niemożliwe nie pokochać! 🖤",
        "🌹 Gothic rock made in Poland - unikatowe brzmienie! 🥀",
        "💀 Mroczne, piękne i absolutnie hipnotyzujące! 🕯️",
        "🎭 Polski underground w najlepszym wydaniu! 🎨"
    ],
    'bjork': [
        "🌋 Icelandic goddess of experimental music! 🇮🇸",
        "🦢 Jej głos to połączenie natury i technologii - pure art! 🎨",
        "💎 Każdy album to nowy wszechświat dźwięków! 🪐",
        "🧚‍♀️ Björk to nie muzyka, to doświadczenie transcendentne! ✨"
    ],
    'tori amos': [
        "🎹 Piano goddess! Jej palce tańczą po klawiszach jak poezja! 📝",
        "🌸 Little Earthquakes to trzęsienie ziemi emocji! 💐",
        "🔥 Cornflake Girl - ekscentryczna, genialna, niepowtarzalna! 🌾",
        "💫 Tori to połączenie klasyki, rocka i czystej magii! 🎪"
    ]
};

// Hidden modes
let globalModes = {
    catMode: false,
    poetryMode: false,
    rainbowMode: false,
    magicMode: false
};

// ===== RATE LIMITING =====
class VolumeRateLimiter {
    constructor() {
        this.maxTokens = 5;
        this.refillRate = 60000;
        this.users = new Map();
        console.log('🛡️ Rate Limiter initialized: 5 changes per minute');
    }
    
    canAdjustVolume(userId) {
        const now = Date.now();
        let userLimit = this.users.get(userId) || {
            tokens: this.maxTokens,
            lastRefill: now
        };
        
        const timePassed = now - userLimit.lastRefill;
        const tokensToAdd = Math.floor(timePassed / (this.refillRate / this.maxTokens));
        
        if (tokensToAdd > 0) {
            userLimit.tokens = Math.min(this.maxTokens, userLimit.tokens + tokensToAdd);
            userLimit.lastRefill = now;
        }
        
        if (userLimit.tokens > 0) {
            userLimit.tokens--;
            this.users.set(userId, userLimit);
            console.log(`✅ User ${userId} used token, ${userLimit.tokens} remaining`);
            return true;
        }
        
        this.users.set(userId, userLimit);
        console.log(`❌ User ${userId} rate limited`);
        return false;
    }
    
    getTimeUntilRefill(userId) {
        const userLimit = this.users.get(userId);
        if (!userLimit) return 0;
        
        const timeSinceLastRefill = Date.now() - userLimit.lastRefill;
        const timeUntilNextToken = (this.refillRate / this.maxTokens) - (timeSinceLastRefill % (this.refillRate / this.maxTokens));
        
        return Math.ceil(timeUntilNextToken / 1000);
    }
    
    getRemainingTokens(userId) {
        const userLimit = this.users.get(userId);
        return userLimit ? userLimit.tokens : this.maxTokens;
    }
}

// ===== CONFLICT RESOLVER =====
class ConflictResolver {
    constructor() {
        this.pendingChanges = new Map();
        this.debounceTime = 300;
        this.recentChanges = new Map();
        this.conflictWindow = 5000;
        console.log('⚠️ Conflict Resolver initialized: 300ms debounce');
    }
    
    handleVolumeChange(linkId, userId, volume) {
        console.log(`🎚️ Volume change request: ${userId} → ${volume}% in session ${linkId}`);
        
        // Cancel previous pending changes
        if (this.pendingChanges.has(linkId)) {
            clearTimeout(this.pendingChanges.get(linkId).timeout);
            console.log(`🔄 Cancelled previous pending change for session ${linkId}`);
        }
        
        // Schedule debounced change
        const changeData = {
            userId,
            volume: volume,
            timestamp: Date.now(),
            timeout: setTimeout(() => {
                this.applyVolumeChange(linkId, userId, volume);
                this.pendingChanges.delete(linkId);
            }, this.debounceTime)
        };
        
        this.pendingChanges.set(linkId, changeData);
        console.log(`⏳ Scheduled volume change to ${volume}% in ${this.debounceTime}ms`);
        
        return true;
    }
    
    async applyVolumeChange(linkId, userId, volume) {
        const session = activeSessions.get(linkId);
        if (!session) {
            console.log(`❌ Cannot apply volume change: session ${linkId} not found`);
            return;
        }
        
        try {
            console.log(`🎵 Applying volume change: ${volume}% to Spotify`);
            
            await axios.put(
                `https://api.spotify.com/v1/me/player/volume?volume_percent=${volume}`,
                {},
                { 
                    headers: { 'Authorization': `Bearer ${session.accessToken}` },
                    timeout: 10000
                }
            );
            
            session.volume = volume;
            session.lastController = userId;
            session.lastVolumeChange = Date.now();
            
            console.log(`✅ Volume successfully changed to ${volume}% by ${userId}`);
            
            // Notify via WebSocket
            io.emit(`session_${linkId}`, {
                type: 'volume_applied',
                userId: userId,
                volume: volume,
                appliedAt: Date.now()
            });
            
        } catch (error) {
            console.error(`❌ Spotify API error:`, error.response?.status, error.response?.data?.error?.message || error.message);
            
            // Still update session volume for consistency
            session.volume = volume;
            session.lastController = userId;
            session.lastVolumeChange = Date.now();
            
            // Notify of error but continue
            io.emit(`session_${linkId}`, {
                type: 'volume_error',
                userId: userId,
                volume: volume,
                error: 'Spotify API error',
                message: 'Głośność ustawiona lokalnie, ale mogą być problemy z Spotify',
                appliedAt: Date.now()
            });
        }
    }
    
    getCurrentController(linkId) {
        const pending = this.pendingChanges.get(linkId);
        if (pending) {
            return pending.userId;
        }
        
        const session = activeSessions.get(linkId);
        return session ? session.lastController : null;
    }
    
    getConflictStats(linkId) {
        return {
            hasConflict: this.pendingChanges.has(linkId),
            pendingChanges: this.pendingChanges.size
        };
    }
}

// ===== EASTER EGG DETECTOR =====
function detectEasterEgg(trackName, artistName) {
    const searchText = `${trackName} ${artistName}`.toLowerCase();
    
    for (const artist of FAVORITE_ARTISTS) {
        if (searchText.includes(artist)) {
            const messages = EASTER_EGG_MESSAGES[artist] || EASTER_EGG_MESSAGES[artist.replace('ö', 'o')];
            if (messages) {
                return {
                    detected: true,
                    artist: artist,
                    message: messages[Math.floor(Math.random() * messages.length)]
                };
            }
        }
    }
    
    return { detected: false };
}

// ===== INICJALIZACJA SYSTEMÓW =====
const rateLimiter = new VolumeRateLimiter();
const conflictResolver = new ConflictResolver();

// ===== SESSION MANAGEMENT ENDPOINTS =====
app.get('/api/session/check/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const session = activeSessions.get(sessionId);
    
    if (session) {
        // Check if user tokens are still valid
        try {
            const response = await axios.get('https://api.spotify.com/v1/me', {
                headers: { 'Authorization': `Bearer ${session.accessToken}` },
                timeout: 5000
            });
            
            res.json({ 
                valid: true, 
                userId: session.userId,
                sessionId: sessionId,
                user: response.data
            });
        } catch (error) {
            res.status(401).json({ valid: false, reason: 'Token expired' });
        }
    } else {
        res.status(404).json({ valid: false, reason: 'Session not found' });
    }
});

app.post('/api/user/check', async (req, res) => {
    const { userId } = req.body;
    const userToken = userTokens.get(userId);
    
    if (userToken) {
        try {
            const response = await axios.get('https://api.spotify.com/v1/me', {
                headers: { 'Authorization': `Bearer ${userToken.access_token}` },
                timeout: 5000
            });
            
            res.json({ 
                valid: true, 
                userId: userId,
                user: response.data
            });
        } catch (error) {
            res.status(401).json({ valid: false, reason: 'Token expired' });
        }
    } else {
        res.status(404).json({ valid: false, reason: 'User not found' });
    }
});

// ===== DEBUG ENDPOINT =====
app.get('/api/debug', (req, res) => {
    res.json({
        config: {
            hasClientId: !!SPOTIFY_CLIENT_ID,
            hasClientSecret: !!SPOTIFY_CLIENT_SECRET,
            baseUrl: BASE_URL,
            port: PORT
        },
        sessions: {
            active: activeSessions.size,
            users: userTokens.size
        },
        globalModes: globalModes,
        timestamp: new Date().toISOString()
    });
});

// ===== SPOTIFY AUTH =====
app.get('/auth/login', (req, res) => {
    console.log('🎵 Auth login request');
    
    if (!SPOTIFY_CLIENT_ID) {
        console.error('❌ Missing SPOTIFY_CLIENT_ID');
        return res.redirect('/?error=missing_config');
    }
    
    const scopes = [
        'user-modify-playback-state',
        'user-read-playback-state',
        'user-read-currently-playing',
        'user-read-playback-position'
    ];
    
    const authURL = 'https://accounts.spotify.com/authorize?' +
        `client_id=${SPOTIFY_CLIENT_ID}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(BASE_URL + '/auth/callback')}&` +
        `scope=${encodeURIComponent(scopes.join(' '))}&` +
        `show_dialog=true`;
    
    console.log('🔗 Redirecting to:', authURL);
    res.redirect(authURL);
});

app.get('/auth/callback', async (req, res) => {
    const { code, error } = req.query;
    console.log('🔄 Auth callback - Code:', !!code, 'Error:', error);
    
    if (error) {
        console.error('❌ Auth error:', error);
        return res.redirect('/?error=access_denied');
    }
    
    try {
        console.log('🔑 Exchanging code for token...');
        const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', 
            new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: BASE_URL + '/auth/callback',
                client_id: SPOTIFY_CLIENT_ID,
                client_secret: SPOTIFY_CLIENT_SECRET
            }),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
        );
        
        const { access_token, refresh_token } = tokenResponse.data;
        console.log('✅ Token received');
        
        const userResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${access_token}` }
        });
        
        const userId = userResponse.data.id;
        userTokens.set(userId, { access_token, refresh_token });
        
        console.log('👤 User logged in:', userResponse.data.display_name);
        
        res.redirect(`/?connected=true&user=${encodeURIComponent(userResponse.data.display_name)}&userId=${userId}`);
        
    } catch (error) {
        console.error('💥 Auth callback error:', error.response?.data || error.message);
        res.redirect('/?error=auth_failed');
    }
});

// ===== TWORZENIE LINKU =====
app.post('/api/create-link', async (req, res) => {
    const { userId } = req.body;
    console.log(`🔗 Creating link for user: ${userId}`);
    
    const userToken = userTokens.get(userId);
    if (!userToken) {
        console.error('❌ User not authenticated:', userId);
        return res.status(401).json({ error: 'User not authenticated' });
    }
    
    try {
        let playerData = null;
        try {
            const playerResponse = await axios.get('https://api.spotify.com/v1/me/player', {
                headers: { 'Authorization': `Bearer ${userToken.access_token}` },
                timeout: 5000
            });
            playerData = playerResponse.data;
        } catch (playerError) {
            console.log('⚠️ Player not active, using defaults');
        }
        
        const linkId = uuidv4();
        const shareLink = `${BASE_URL}/control/${linkId}`;
        
        activeSessions.set(linkId, {
            userId: userId,
            accessToken: userToken.access_token,
            createdAt: new Date(),
            neighbors: [],
            currentTrack: playerData?.item || null,
            isPlaying: playerData?.is_playing || false,
            volume: playerData?.device?.volume_percent || 50,
            lastController: null,
            lastVolumeChange: null,
            controlHistory: []
        });
        
        console.log('✅ Link created:', linkId);
        
        res.json({ 
            success: true, 
            linkId, 
            shareLink,
            currentStatus: {
                track: playerData?.item,
                isPlaying: playerData?.is_playing,
                volume: playerData?.device?.volume_percent
            }
        });
        
    } catch (error) {
        console.error('💥 Create link error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to create link', details: error.message });
    }
});

// ===== GŁÓWNY ENDPOINT KONTROLI GŁOŚNOŚCI =====
app.put('/api/control/:linkId', async (req, res) => {
    const { linkId } = req.params;
    const { volume, neighborId, action, message, customMessage } = req.body;
    
    console.log(`🎛️ Control request - Link: ${linkId}, Volume: ${volume}, Neighbor: ${neighborId}, Action: ${action}, Custom: ${customMessage}`);
    
    const session = activeSessions.get(linkId);
    if (!session) {
        console.error('❌ Session not found:', linkId);
        return res.status(404).json({ error: 'Session not found' });
    }
    
    try {
        // Handle VOLUME CHANGE
        if (volume !== undefined) {
            console.log(`🔊 Processing volume change: ${volume}%`);
            
            // Rate limiting for volume changes
            if (!rateLimiter.canAdjustVolume(neighborId)) {
                const timeUntilRefill = rateLimiter.getTimeUntilRefill(neighborId);
                console.log(`❌ Rate limited: ${neighborId}, next token in ${timeUntilRefill}s`);
                
                return res.status(429).json({ 
                    error: 'Rate limited', 
                    message: `Za dużo zmian głośności. Spróbuj ponownie za ${timeUntilRefill} sekund.`,
                    retryAfter: timeUntilRefill,
                    remainingTokens: rateLimiter.getRemainingTokens(neighborId)
                });
            }
            
            // Use conflict resolver for smart volume control
            const success = conflictResolver.handleVolumeChange(linkId, neighborId, volume);
            
            if (!success) {
                throw new Error('Failed to handle volume change');
            }
        }
        
        // Handle CUSTOM MESSAGE
        let finalMessage = message;
        if (customMessage) {
            console.log(`💬 Processing custom message: "${customMessage}"`);
            
            // Check for secret commands first
            const secretResult = checkSecretCommands(customMessage, linkId);
            if (secretResult.isSecret) {
                return res.json(secretResult.response);
            }
            
            // Apply global modes to custom message
            finalMessage = applyGlobalModes(customMessage);
        }
        
        // Handle MESSAGE ONLY (emoji, thank you, custom, etc.)
        if (volume === undefined && (action === 'emoji_message' || action === 'thank_you' || action === 'custom_message' || finalMessage)) {
            console.log(`💬 Processing message: ${action} - "${finalMessage}"`);
        }
        
        // Add to neighbor actions history
        const neighborAction = {
            neighborId: neighborId || 'Anonymous',
            action: action || (volume !== undefined ? 'volume_change' : 'message'),
            volume: volume,
            message: finalMessage,
            timestamp: new Date(),
            isCustom: !!customMessage
        };
        
        session.neighbors.push(neighborAction);
        
        // Add to control history
        session.controlHistory.push({
            userId: neighborId,
            action: action || (volume !== undefined ? 'volume_change' : 'message'),
            volume: volume,
            message: finalMessage,
            timestamp: Date.now(),
            isCustom: !!customMessage
        });
        
        // Check for Easter Eggs in current track
        let easterEgg = null;
        if (session.currentTrack) {
            easterEgg = detectEasterEgg(
                session.currentTrack.name || '',
                session.currentTrack.artists?.[0]?.name || ''
            );
        }
        
        // Send WebSocket update
        io.emit(`session_${linkId}`, {
            type: 'neighbor_action',
            data: neighborAction,
            session: {
                volume: session.volume, // Current volume
                neighbors: session.neighbors.length
            },
            easterEgg: easterEgg?.detected ? easterEgg : null,
            globalModes: globalModes
        });
        
        console.log(`✅ Control request processed for ${neighborId}`);
        
        // Response based on action type
        if (volume !== undefined) {
            res.json({ 
                success: true, 
                volume: volume,
                isPending: true,
                message: 'Volume change scheduled',
                remainingTokens: rateLimiter.getRemainingTokens(neighborId),
                easterEgg: easterEgg?.detected ? easterEgg : null
            });
        } else {
            res.json({ 
                success: true, 
                action: action,
                message: finalMessage || 'Message sent successfully',
                timestamp: Date.now(),
                easterEgg: easterEgg?.detected ? easterEgg : null,
                appliedModes: Object.keys(globalModes).filter(mode => globalModes[mode])
            });
        }
        
    } catch (error) {
        console.error('💥 Control error:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to process request', 
            details: error.message 
        });
    }
});

// ===== APPLY GLOBAL MODES =====
function applyGlobalModes(message) {
    let result = message;
    
    if (globalModes.catMode) {
        // Replace some words with cat versions
        result = result
            .replace(/music/gi, 'mewzic')
            .replace(/dzięki/gi, 'dziękuje *miau*')
            .replace(/thanks/gi, 'thanks *purr*')
            .replace(/hello/gi, 'miau')
            .replace(/loud/gi, 'loud *hiss*')
            .replace(/głośno/gi, 'głośno *miau*');
        result += ' 🐱';
    }
    
    if (globalModes.poetryMode) {
        // Add extra poetic flair
        const poeticEndings = [
            '... jak wiersz napisany nutami 📜',
            '... w rytmie serca i melodii duszy 💫',
            '... gdzie słowa tańczą z dźwiękami 🎭',
            '... poezja to muzyka dla oczu 👁️‍🗨️',
            '... każda nuta jak słowo w wierszu kosmosu ✨'
        ];
        result += ' ' + poeticEndings[Math.floor(Math.random() * poeticEndings.length)];
    }
    
    if (globalModes.rainbowMode) {
        // Add rainbow elements
        result += ' 🌈✨🎨🦄💫';
    }
    
    if (globalModes.magicMode) {
        // Ultimate magic combination
        result = '✨🦄 ' + result + ' 🦄✨';
        result += ' 🌟💫🎪⭐🌙';
    }
    
    return result;
}

// ===== SECRET COMMANDS =====
function checkSecretCommands(message, linkId) {
    const cmd = message.toLowerCase().trim();
    
    // ULTIMATE SECRET COMMAND
    if (cmd.includes('secret admin') || cmd.includes('magic sparkles')) {
        globalModes.magicMode = !globalModes.magicMode;
        globalModes.catMode = globalModes.magicMode;
        globalModes.poetryMode = globalModes.magicMode;
        globalModes.rainbowMode = globalModes.magicMode;
        
        return {
            isSecret: true,
            response: {
                success: true,
                secretActivated: 'ultimate_magic_mode',
                message: globalModes.magicMode 
                    ? '✨🦄 MAGIC MODE ACTIVATED! 🦄✨ Jesteś prawdziwą czarodziejką technologii! Twoja aplikacja teraz świeci jak gwiazda w cyfrowym niebie! 🌟💫🎪'
                    : '🎭 Magic Mode wyłączony - ale magia zostaje w sercu! ✨',
                active: globalModes.magicMode,
                allModes: globalModes
            }
        };
    }
    
    // Secret command: "meow mode" or "kot mode"
    if (cmd.includes('meow mode') || cmd.includes('kot mode')) {
        globalModes.catMode = !globalModes.catMode;
        return {
            isSecret: true,
            response: {
                success: true,
                secretActivated: 'cat_mode',
                message: globalModes.catMode ? '🐱 Secret Cat Mode aktywowany! Miau!' : '😸 Cat Mode wyłączony',
                active: globalModes.catMode
            }
        };
    }
    
    // Secret command: "poetry mode" or "tryb poetycki"
    if (cmd.includes('poetry mode') || cmd.includes('tryb poetycki')) {
        globalModes.poetryMode = !globalModes.poetryMode;
        return {
            isSecret: true,
            response: {
                success: true,
                secretActivated: 'poetry_mode',
                message: globalModes.poetryMode ? '📜 Secret Ultra Poetry Mode aktywowany!' : '📝 Poetry Mode wyłączony',
                active: globalModes.poetryMode
            }
        };
    }
    
    // Secret command: "rainbow mode" or "tęcza mode"
    if (cmd.includes('rainbow mode') || cmd.includes('tęcza mode')) {
        globalModes.rainbowMode = !globalModes.rainbowMode;
        return {
            isSecret: true,
            response: {
                success: true,
                secretActivated: 'rainbow_mode',
                message: globalModes.rainbowMode ? '🌈 Secret Rainbow Mode aktywowany!' : '🎨 Rainbow Mode wyłączony',
                active: globalModes.rainbowMode
            }
        };
    }
    
    // Secret command: "status" or "easter egg"
    if (cmd.includes('status') || cmd.includes('easter egg')) {
        return {
            isSecret: true,
            response: {
                success: true,
                secretActivated: 'status_check',
                message: `🎭 Secret Status: Cat ${globalModes.catMode ? '🐱' : '😴'} | Poetry ${globalModes.poetryMode ? '📜' : '📝'} | Rainbow ${globalModes.rainbowMode ? '🌈' : '🎨'} | Magic ${globalModes.magicMode ? '✨' : '💤'}`,
                globalModes: globalModes
            }
        };
    }
    
    return { isSecret: false };
}

// ===== STATUS SESJI =====
app.get('/api/status/:linkId', async (req, res) => {
    const { linkId } = req.params;
    const session = activeSessions.get(linkId);
    
    if (!session) {
        console.log(`❌ Status request for non-existent session: ${linkId}`);
        return res.status(404).json({ error: 'Session not found' });
    }
    
    try {
        console.log(`📊 Status request for session ${linkId}`);
        
        // Get current status from Spotify
        let playerData = null;
        let easterEgg = null;
        
        try {
            const playerResponse = await axios.get('https://api.spotify.com/v1/me/player', {
                headers: { 'Authorization': `Bearer ${session.accessToken}` },
                timeout: 5000
            });
            playerData = playerResponse.data;
            
            // Update session
            if (playerData) {
                session.currentTrack = playerData.item;
                session.isPlaying = playerData.is_playing;
                session.volume = playerData.device?.volume_percent || session.volume;
                
                // Check for Easter Eggs
                if (playerData.item) {
                    easterEgg = detectEasterEgg(
                        playerData.item.name || '',
                        playerData.item.artists?.[0]?.name || ''
                    );
                }
            }
        } catch (playerError) {
            console.log('⚠️ Player status unavailable, using cached data');
        }
        
        const conflictStats = conflictResolver.getConflictStats(linkId);
        const currentController = conflictResolver.getCurrentController(linkId);
        
        console.log(`📊 Session ${linkId} status: ${session.volume}% volume, controller: ${currentController}`);
        
        res.json({
            isPlaying: session.isPlaying,
            volume: session.volume,
            track: session.currentTrack ? {
                name: session.currentTrack.name,
                artist: session.currentTrack.artists[0]?.name,
                album: session.currentTrack.album?.name,
                image: session.currentTrack.album?.images[0]?.url
            } : null,
            neighbors: session.neighbors.length,
            recentActions: session.neighbors.slice(-10),
            currentController: currentController,
            controlHistory: session.controlHistory.slice(-5),
            conflictStats: conflictStats,
            sessionInfo: {
                createdAt: session.createdAt,
                lastVolumeChange: session.lastVolumeChange,
                totalVolumeChanges: session.controlHistory.length
            },
            globalModes: globalModes,
            easterEgg: easterEgg?.detected ? easterEgg : null
        });
        
    } catch (error) {
        console.error('💥 Status error:', error.message);
        
        const conflictStats = conflictResolver.getConflictStats(linkId);
        const currentController = conflictResolver.getCurrentController(linkId);
        
        res.json({ 
            isPlaying: session.isPlaying || false, 
            volume: session.volume || 50, 
            track: null,
            neighbors: session.neighbors.length || 0,
            recentActions: session.neighbors.slice(-10) || [],
            currentController: currentController,
            controlHistory: session.controlHistory.slice(-5) || [],
            conflictStats: conflictStats,
            sessionInfo: {
                createdAt: session.createdAt,
                lastVolumeChange: session.lastVolumeChange,
                totalVolumeChanges: session.controlHistory.length
            },
            globalModes: globalModes,
            easterEgg: null
        });
    }
});

// ===== ROUTES =====
app.get('/control/:linkId', (req, res) => {
    console.log(`📱 Neighbor control page requested: ${req.params.linkId}`);
    res.sendFile(path.join(__dirname, 'public', 'neighbor.html'));
});

app.get('/', (req, res) => {
    console.log('🏠 Main page requested');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== WEBSOCKET =====
io.on('connection', (socket) => {
    console.log('🔌 New WebSocket connection');
    
    socket.on('join_session', (linkId) => {
        socket.join(`session_${linkId}`);
        console.log(`👥 Socket joined session: ${linkId}`);
        
        const session = activeSessions.get(linkId);
        if (session) {
            const currentController = conflictResolver.getCurrentController(linkId);
            
            // Check for Easter Egg in current track
            let easterEgg = null;
            if (session.currentTrack) {
                easterEgg = detectEasterEgg(
                    session.currentTrack.name || '',
                    session.currentTrack.artists?.[0]?.name || ''
                );
            }
            
            socket.emit(`session_${linkId}`, {
                type: 'session_joined',
                currentController: currentController,
                volume: session.volume,
                timestamp: Date.now(),
                globalModes: globalModes,
                easterEgg: easterEgg?.detected ? easterEgg : null
            });
        }
    });
    
    socket.on('disconnect', () => {
        console.log('❌ WebSocket disconnected');
    });
    
    socket.on('ping_session', (linkId) => {
        const session = activeSessions.get(linkId);
        socket.emit('pong_session', {
            linkId,
            exists: !!session,
            timestamp: Date.now(),
            globalModes: globalModes
        });
    });
});

// ===== ERROR HANDLING =====
app.use((err, req, res, next) => {
    console.error('💥 Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

// ===== HEALTH CHECK =====
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        activeSessions: activeSessions.size,
        rateLimiterUsers: rateLimiter.users.size,
        memory: process.memoryUsage(),
        globalModes: globalModes
    });
});

// ===== START SERWERA =====
server.listen(PORT, () => {
    console.log(`🎵 NeighborlyVolume server running on port ${PORT}`);
    console.log(`🔗 Main app: ${BASE_URL}`);
    console.log(`🎛️ Example control: ${BASE_URL}/control/demo123`);
    console.log(`⚙️ Rate limiting: 5 changes per minute per user`);
    console.log(`🔄 Debouncing: 300ms delay for all changes`);
    console.log(`🧪 Debug endpoint: ${BASE_URL}/api/debug`);
    console.log(`❤️ Health check: ${BASE_URL}/health`);
    console.log(`🎭 Easter eggs: Nightwish, Within Temptation, Epica, Closterkeller, Björk, Tori Amos`);
    console.log(`🐱 Secret modes: cat, poetry, rainbow, magic`);
    console.log(`✨ Ultra secret: "secret admin" or "magic sparkles"`);
});

// ===== CLEANUP =====
setInterval(() => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let cleanedCount = 0;
    
    for (const [linkId, session] of activeSessions.entries()) {
        if (session.createdAt < oneDayAgo) {
            activeSessions.delete(linkId);
            cleanedCount++;
        }
    }
    
    if (cleanedCount > 0) {
        console.log(`🧹 Cleanup completed: ${cleanedCount} old sessions removed`);
    }
}, 60 * 60 * 1000);

setInterval(() => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let cleanedUsers = 0;
    
    for (const [userId, userLimit] of rateLimiter.users.entries()) {
        if (userLimit.lastRefill < oneHourAgo && userLimit.tokens === rateLimiter.maxTokens) {
            rateLimiter.users.delete(userId);
            cleanedUsers++;
        }
    }
    
    if (cleanedUsers > 0) {
        console.log(`🧹 Rate limiter cleanup: ${cleanedUsers} inactive users removed`);
    }
}, 30 * 60 * 1000);

module.exports = app;
