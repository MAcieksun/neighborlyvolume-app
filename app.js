const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs').promises;

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// ADVANCED STATS TRACKING
let stats = {
    totalVisits: 0,
    uniqueIPs: new Set(),
    userSessions: new Set(),
    volumeChanges: 0,
    startTime: new Date(),
    authAttempts: 0,
    linksGenerated: 0,
    neighborVisits: 0
};

// ===== KONFIGURACJA =====
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || 'TWÓJ_CLIENT_ID_TUTAJ';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || 'TWÓJ_CLIENT_SECRET_TUTAJ';
const BASE_URL = process.env.BASE_URL || 'https://localhost:3000';

console.log('🔧 STARTUP CONFIG:', {
    PORT: PORT,
    CLIENT_ID: SPOTIFY_CLIENT_ID ? `${SPOTIFY_CLIENT_ID.substring(0, 10)}...` : 'NOT SET',
    CLIENT_SECRET: SPOTIFY_CLIENT_SECRET ? `${SPOTIFY_CLIENT_SECRET.substring(0, 10)}...` : 'NOT SET',
    BASE_URL: BASE_URL
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// LOGGING MIDDLEWARE - DODAJ TO
app.use((req, res, next) => {
    stats.totalVisits++;
    
    // Track unique IPs
    const userIP = req.ip || req.connection.remoteAddress || 'unknown';
    stats.uniqueIPs.add(userIP);
    
    // Track different types of visits
    if (req.path === '/auth/login') stats.authAttempts++;
    if (req.path.startsWith('/control/')) stats.neighborVisits++;
    
    console.log(`📊 ${new Date().toLocaleTimeString()} - ${req.method} ${req.path} - Unique IPs: ${stats.uniqueIPs.size}`);
    next();
});

// ===== PRZECHOWYWANIE SESJI (TRWAŁE) =====
const activeSessions = new Map();
const userTokens = new Map();

// Session file paths
const SESSIONS_FILE = path.join(__dirname, 'data', 'sessions.json');
const TOKENS_FILE = path.join(__dirname, 'data', 'tokens.json');

// Ensure data directory exists
async function ensureDataDirectory() {
    try {
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
        console.log('📁 Data directory ready');
    } catch (error) {
        console.error('❌ Failed to create data directory:', error);
    }
}

// Save sessions to file
async function saveSessions() {
    try {
        const sessionsArray = Array.from(activeSessions.entries()).map(([id, session]) => {
            // Don't save sensitive access tokens to disk
            const sessionCopy = { ...session };
            delete sessionCopy.accessToken;
            return [id, sessionCopy];
        });
        
        await fs.writeFile(SESSIONS_FILE, JSON.stringify(sessionsArray, null, 2));
        console.log('💾 Sessions saved to disk');
    } catch (error) {
        console.error('❌ Failed to save sessions:', error);
    }
}

// Load sessions from file
async function loadSessions() {
    try {
        const data = await fs.readFile(SESSIONS_FILE, 'utf8');
        const sessionsArray = JSON.parse(data);
        
        for (const [id, session] of sessionsArray) {
            // Convert date strings back to Date objects
            session.createdAt = new Date(session.createdAt);
            if (session.expiresAt) session.expiresAt = new Date(session.expiresAt);
            session.neighbors = session.neighbors.map(n => ({
                ...n,
                timestamp: new Date(n.timestamp)
            }));
            
            activeSessions.set(id, session);
        }
        
        console.log(`💾 Loaded ${activeSessions.size} sessions from disk`);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('❌ Failed to load sessions:', error);
        } else {
            console.log('📝 No existing sessions file found, starting fresh');
        }
    }
}

// Save user tokens to file
async function saveTokens() {
    try {
        const tokensArray = Array.from(userTokens.entries());
        await fs.writeFile(TOKENS_FILE, JSON.stringify(tokensArray, null, 2));
        console.log('🔑 Tokens saved to disk');
    } catch (error) {
        console.error('❌ Failed to save tokens:', error);
    }
}

// Load user tokens from file
async function loadTokens() {
    try {
        const data = await fs.readFile(TOKENS_FILE, 'utf8');
        const tokensArray = JSON.parse(data);
        
        for (const [userId, tokens] of tokensArray) {
            userTokens.set(userId, tokens);
        }
        
        console.log(`🔑 Loaded ${userTokens.size} user tokens from disk`);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('❌ Failed to load tokens:', error);
        } else {
            console.log('🔑 No existing tokens file found, starting fresh');
        }
    }
}

// Refresh Spotify access token
async function refreshSpotifyToken(refreshToken) {
    console.log('🔄 Refreshing Spotify token...');
    
    try {
        const response = await axios.post('https://accounts.spotify.com/api/token', 
            new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: SPOTIFY_CLIENT_ID,
                client_secret: SPOTIFY_CLIENT_SECRET
            }),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
        );
        
        console.log('✅ Token refreshed successfully');
        return {
            access_token: response.data.access_token,
            refresh_token: response.data.refresh_token || refreshToken
        };
        
    } catch (error) {
        console.error('❌ Token refresh failed:', error.response?.data || error.message);
        throw error;
    }
}

// Get valid access token for user
async function getValidAccessToken(userId) {
    const userToken = userTokens.get(userId);
    if (!userToken) {
        throw new Error('User not found');
    }
    
    // Try current token first
    try {
        const testResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${userToken.access_token}` }
        });
        
        console.log('✅ Current token is valid');
        return userToken.access_token;
        
    } catch (error) {
        if (error.response?.status === 401 && userToken.refresh_token) {
            console.log('🔄 Token expired, refreshing...');
            
            try {
                const newTokens = await refreshSpotifyToken(userToken.refresh_token);
                
                // Update stored tokens
                userTokens.set(userId, newTokens);
                await saveTokens();
                
                console.log('✅ Token refreshed and updated');
                return newTokens.access_token;
                
            } catch (refreshError) {
                console.error('❌ Token refresh failed:', refreshError);
                throw new Error('Token refresh failed');
            }
        } else {
            throw error;
        }
    }
}

// Initialize storage on startup
async function initializeStorage() {
    await ensureDataDirectory();
    await loadSessions();
    await loadTokens();
    
    // Restore access tokens for active sessions
    for (const [sessionId, session] of activeSessions.entries()) {
        try {
            const validToken = await getValidAccessToken(session.userId);
            session.accessToken = validToken;
            console.log(`✅ Restored session ${sessionId} with fresh token`);
        } catch (error) {
            console.log(`❌ Failed to restore session ${sessionId}:`, error.message);
            session.needsReauth = true;
        }
    }
    
    console.log(`🚀 Storage initialized: ${activeSessions.size} sessions, ${userTokens.size} users`);
}

// ===== SPOTIFY AUTH =====
app.get('/auth/login', (req, res) => {
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
        
    console.log('🔗 SPOTIFY AUTH URL:', authURL);
    res.redirect(authURL);
});

app.get('/auth/callback', async (req, res) => {
    const { code, error } = req.query;
    
    console.log('🔄 AUTH CALLBACK RECEIVED:', { 
        code: code ? `${code.substring(0, 20)}...` : 'NO CODE',
        error: error
    });
    
    if (error) {
        console.log('❌ SPOTIFY AUTH ERROR:', error);
        return res.redirect('/?error=access_denied');
    }
    
    if (!code) {
        console.log('❌ NO AUTH CODE RECEIVED');
        return res.redirect('/?error=no_code');
    }
    
    console.log('🔑 ATTEMPTING TOKEN EXCHANGE...');
    
    try {
        const tokenRequestBody = {
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: BASE_URL + '/auth/callback',
            client_id: SPOTIFY_CLIENT_ID,
            client_secret: SPOTIFY_CLIENT_SECRET
        };
        
        const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', 
            new URLSearchParams(tokenRequestBody),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
        );
        
        console.log('✅ TOKEN RESPONSE SUCCESS');
        
        const { access_token, refresh_token } = tokenResponse.data;
        
        // Pobierz info o użytkowniku
        console.log('👤 GETTING USER INFO...');
        const userResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${access_token}` }
        });
        
        const userId = userResponse.data.id;
        const userName = userResponse.data.display_name;
        
        console.log('✅ USER INFO SUCCESS:', { userId, userName });
        
        // Store tokens with refresh capability
        userTokens.set(userId, { access_token, refresh_token });
        await saveTokens();
        
        console.log('🎵 REDIRECTING TO SUCCESS PAGE...');
        res.redirect(`/?connected=true&user=${encodeURIComponent(userName)}&userId=${userId}`);
        
    } catch (error) {
        console.error('❌ AUTH CALLBACK ERROR:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
        });
        
        res.redirect(`/?error=auth_failed&details=${encodeURIComponent(error.message)}`);
    }
});

// ===== TWORZENIE LINKU UDOSTĘPNIANIA =====
app.post('/api/create-link', async (req, res) => {
    const { userId } = req.body;
    
    console.log('🔗 CREATE LINK REQUEST:', { userId });
    
    try {
        // Get valid access token (this will refresh if needed)
        const accessToken = await getValidAccessToken(userId);
        
        // Sprawdź status odtwarzacza
        const playerResponse = await axios.get('https://api.spotify.com/v1/me/player', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        const linkId = uuidv4();
        const shareLink = `${BASE_URL}/control/${linkId}`;
        
        const sessionData = {
            userId: userId,
            accessToken: accessToken,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            neighbors: [],
            currentTrack: playerResponse.data?.item || null,
            isPlaying: playerResponse.data?.is_playing || false,
            volume: playerResponse.data?.device?.volume_percent || 50,
            needsReauth: false
        };
        
        activeSessions.set(linkId, sessionData);
        await saveSessions();
        
        console.log('✅ SESSION CREATED WITH 7-DAY EXPIRY:', { linkId, userId, expiresAt: sessionData.expiresAt });
        stats.linksGenerated++; // DODAJ TO
        res.json({ 
            success: true, 
            linkId, 
            shareLink,
            expiresAt: sessionData.expiresAt,
            currentStatus: {
                track: playerResponse.data?.item,
                isPlaying: playerResponse.data?.is_playing,
                volume: playerResponse.data?.device?.volume_percent
            }
        });
        
    } catch (error) {
        console.error('❌ CREATE LINK ERROR:', error.message);
        res.status(500).json({ error: 'Failed to create link', details: error.message });
    }
});

// ===== KONTROLA GŁOŚNOŚCI =====
app.put('/api/control/:linkId', async (req, res) => {
    const { linkId } = req.params;
    const { volume, neighborId, action, message } = req.body;
    
    console.log('🎛️ CONTROL REQUEST:', { 
        linkId, 
        volume, 
        neighborId, 
        action, 
        message
    });
    
    const session = activeSessions.get(linkId);
    if (!session) {
        console.log('❌ SESSION NOT FOUND FOR CONTROL:', linkId);
        return res.status(404).json({ error: 'Session not found' });
    }
    
    // Check if session expired
    if (session.expiresAt && new Date() > session.expiresAt) {
        console.log('⏰ SESSION EXPIRED:', linkId);
        activeSessions.delete(linkId);
        await saveSessions();
        return res.status(410).json({ error: 'Session expired' });
    }
    
    console.log('✅ SESSION FOUND FOR CONTROL:', { linkId, userId: session.userId });
    
    try {
        // Get fresh access token if needed
        const accessToken = await getValidAccessToken(session.userId);
        session.accessToken = accessToken;
        session.needsReauth = false;
        
        // Handle volume control
        if (volume !== undefined) {
            console.log('🔊 SETTING VOLUME:', volume);
            
            // Ustaw głośność w Spotify
            await axios.put(
                `https://api.spotify.com/v1/me/player/volume?volume_percent=${volume}`,
                {},
                { headers: { 'Authorization': `Bearer ${accessToken}` }}
            );
            
            session.volume = volume;
            stats.volumeChanges++; // DODAJ TO
            console.log('✅ VOLUME SET SUCCESSFULLY:', volume);
        }
        
        // Create neighbor action
        const neighborAction = {
            neighborId: neighborId || 'Anonymous',
            action: action || 'volume_change',
            volume: volume,
            message: message,
            author: req.body.author || '',
            timestamp: new Date()
        };
        
        console.log('📝 CREATING NEIGHBOR ACTION:', neighborAction);
        
        // Add to session history
        session.neighbors.push(neighborAction);
        
        // Save updated session
        await saveSessions();
        
        // Send WebSocket update
        const wsData = {
            type: 'neighbor_action',
            data: neighborAction,
            session: {
                volume: session.volume,
                neighbors: session.neighbors.length
            }
        };
        
        console.log('📡 SENDING WEBSOCKET UPDATE:', wsData);
        io.emit(`session_${linkId}`, wsData);
        io.emit('session_update', wsData);
        
        console.log('✅ CONTROL REQUEST SUCCESSFUL');
        res.json({ 
            success: true, 
            volume: session.volume,
            message: 'Action completed successfully'
        });
        
    } catch (error) {
        console.error('❌ CONTROL ERROR:', {
            error: error.message,
            response: error.response?.data,
            status: error.response?.status,
            linkId,
            action
        });
        
        if (error.message === 'User not found' || error.message === 'Token refresh failed') {
            session.needsReauth = true;
            await saveSessions();
            
            return res.status(401).json({ 
                error: 'Authentication expired',
                needsReauth: true 
            });
        }
        
        res.status(500).json({ 
            error: 'Failed to control volume',
            details: error.message 
        });
    }
});

// ===== STATUS SESJI =====
app.get('/api/status/:linkId', async (req, res) => {
    const { linkId } = req.params;
    
    console.log('📊 STATUS REQUEST:', { linkId });
    
    const session = activeSessions.get(linkId);
    
    if (!session) {
        console.log('❌ SESSION NOT FOUND:', linkId);
        return res.status(404).json({ error: 'Session not found' });
    }
    
    // Check if session expired
    if (session.expiresAt && new Date() > session.expiresAt) {
        console.log('⏰ SESSION EXPIRED:', linkId);
        activeSessions.delete(linkId);
        await saveSessions();
        return res.status(410).json({ error: 'Session expired' });
    }
    
    console.log('✅ SESSION FOUND:', { linkId, userId: session.userId, expiresAt: session.expiresAt });
    
    try {
        // Get fresh access token if needed
        const accessToken = await getValidAccessToken(session.userId);
        session.accessToken = accessToken;
        session.needsReauth = false;
        
        // Pobierz aktualny status z Spotify
        const playerResponse = await axios.get('https://api.spotify.com/v1/me/player', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        const playerData = playerResponse.data;
        
        // Aktualizuj sesję
        if (playerData) {
            session.currentTrack = playerData.item;
            session.isPlaying = playerData.is_playing;
            session.volume = playerData.device?.volume_percent || session.volume;
        }
        
        // Save updated session
        await saveSessions();
        
        res.json({
            isPlaying: session.isPlaying,
            volume: session.volume,
            expiresAt: session.expiresAt,
            track: session.currentTrack ? {
                name: session.currentTrack.name,
                artist: session.currentTrack.artists[0]?.name,
                album: session.currentTrack.album?.name,
                image: session.currentTrack.album?.images[0]?.url
            } : null,
            neighbors: session.neighbors.length,
            recentActions: session.neighbors.slice(-10)
        });
        
    } catch (error) {
        console.error('❌ STATUS ERROR:', error.message);
        
        if (error.message === 'User not found' || error.message === 'Token refresh failed') {
            session.needsReauth = true;
            await saveSessions();
            
            return res.status(401).json({ 
                error: 'Authentication expired',
                needsReauth: true 
            });
        }
        
        res.json({ 
            isPlaying: session.isPlaying || false, 
            volume: session.volume || 50, 
            track: null,
            neighbors: session.neighbors.length || 0,
            recentActions: session.neighbors.slice(-10) || [],
            expiresAt: session.expiresAt
        });
    }
});

// ===== ZARZĄDZANIE SESJĄ =====

// Check if session is still valid
app.get('/api/session/check/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    
    console.log('🔍 SESSION CHECK REQUEST:', { sessionId });
    
    const session = activeSessions.get(sessionId);
    if (!session) {
        console.log('❌ SESSION NOT FOUND:', sessionId);
        return res.status(404).json({ error: 'Session not found' });
    }
    
    // Check if session expired
    if (session.expiresAt && new Date() > session.expiresAt) {
        console.log('⏰ SESSION EXPIRED:', sessionId);
        activeSessions.delete(sessionId);
        await saveSessions();
        return res.status(410).json({ error: 'Session expired' });
    }
    
    console.log('✅ SESSION FOUND:', { sessionId, userId: session.userId });
    
    try {
        // Test if Spotify token is still valid
        const accessToken = await getValidAccessToken(session.userId);
        session.accessToken = accessToken;
        session.needsReauth = false;
        
        console.log('✅ SPOTIFY TOKEN STILL VALID');
        
        res.json({ 
            success: true, 
            session: {
                userId: session.userId,
                sessionId: sessionId,
                neighbors: session.neighbors.length,
                volume: session.volume,
                expiresAt: session.expiresAt
            }
        });
        
    } catch (error) {
        console.log('❌ SPOTIFY TOKEN INVALID:', error.message);
        
        session.needsReauth = true;
        await saveSessions();
        
        res.status(401).json({ 
            error: 'Session token expired',
            needsReauth: true 
        });
    }
});

// Check if user tokens are still valid (without active session)
app.post('/api/user/check', async (req, res) => {
    const { userId } = req.body;
    
    console.log('👤 USER CHECK REQUEST:', { userId });
    
    try {
        const accessToken = await getValidAccessToken(userId);
        
        const userResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        console.log('✅ USER TOKEN STILL VALID:', { userId, userName: userResponse.data.display_name });
        
        res.json({ 
            success: true, 
            user: {
                userId: userId,
                name: userResponse.data.display_name
            }
        });
        
    } catch (error) {
        console.log('❌ USER TOKEN INVALID:', { userId, error: error.message });
        
        userTokens.delete(userId);
        await saveTokens();
        
        res.status(401).json({ 
            error: 'User token expired',
            needsReauth: true 
        });
    }
});

// ===== STRONA KONTROLI SĄSIADA =====
app.get('/control/:linkId', (req, res) => {
    const { linkId } = req.params;
    console.log('🎛️ CONTROL PAGE REQUEST:', { linkId });
    res.sendFile(path.join(__dirname, 'public', 'neighbor.html'));
});

// ===== GŁÓWNA STRONA =====
// STATS ENDPOINT - DODAJ TO
app.get('/api/stats', (req, res) => {
    res.json({
        totalVisits: stats.totalVisits,
        uniqueUsers: stats.uniqueIPs.size,
        authAttempts: stats.authAttempts,
        linksGenerated: stats.linksGenerated,
        neighborVisits: stats.neighborVisits,
        volumeChanges: stats.volumeChanges,
        activeSessions: activeSessions.size,
        uptime: Math.floor((Date.now() - stats.startTime) / 1000 / 60) + ' minutes',
        conversionRate: stats.uniqueIPs.size > 0 ? (stats.authAttempts / stats.uniqueIPs.size * 100).toFixed(1) + '%' : '0%'
    });
});
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== WEBSOCKET =====
io.on('connection', (socket) => {
    console.log('🔌 New client connected');
    
    socket.on('join_session', (linkId) => {
        console.log('🏠 Client joined session:', linkId);
        socket.join(`session_${linkId}`);
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Client disconnected');
    });
});

// ===== START SERWERA =====
async function startServer() {
    // Initialize persistent storage first
    await initializeStorage();
    
    server.listen(PORT, () => {
        console.log(`🎵 NeighborlyVolume server running on port ${PORT}`);
        console.log(`🔗 Main app: ${BASE_URL}`);
        console.log(`🎛️ Example control: ${BASE_URL}/control/demo123`);
        console.log(`💾 Sessions persist for 7 days`);
    });
}

// Start the server
startServer().catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});

// ===== CLEANUP FUNCTIONS =====
setInterval(async () => {
    console.log('🧹 Running session cleanup...');
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;
    
    for (const [linkId, session] of activeSessions.entries()) {
        if (session.createdAt < sevenDaysAgo || (session.expiresAt && new Date() > session.expiresAt)) {
            activeSessions.delete(linkId);
            cleanedCount++;
        }
    }
    
    if (cleanedCount > 0) {
        await saveSessions();
        console.log(`🧹 Cleaned up ${cleanedCount} expired sessions. Active sessions: ${activeSessions.size}`);
    }
}, 24 * 60 * 60 * 1000); // Run daily cleanup

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM, saving data and shutting down...');
    await saveSessions();
    await saveTokens();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🛑 Received SIGINT, saving data and shutting down...');
    await saveSessions();
    await saveTokens();
    process.exit(0);
});
