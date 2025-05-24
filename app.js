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
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

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

// ===== PRZECHOWYWANIE SESJI (TYMCZASOWE) =====
const activeSessions = new Map();
const userTokens = new Map();

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
        error: error,
        query: req.query 
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
    console.log('🔧 CONFIG:', {
        CLIENT_ID: SPOTIFY_CLIENT_ID ? `${SPOTIFY_CLIENT_ID.substring(0, 10)}...` : 'NOT SET',
        CLIENT_SECRET: SPOTIFY_CLIENT_SECRET ? `${SPOTIFY_CLIENT_SECRET.substring(0, 10)}...` : 'NOT SET',
        BASE_URL: BASE_URL,
        REDIRECT_URI: BASE_URL + '/auth/callback'
    });
    
    try {
        const tokenRequestBody = {
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: BASE_URL + '/auth/callback',
            client_id: SPOTIFY_CLIENT_ID,
            client_secret: SPOTIFY_CLIENT_SECRET
        };
        
        console.log('📤 TOKEN REQUEST:', {
            grant_type: tokenRequestBody.grant_type,
            code: `${code.substring(0, 20)}...`,
            redirect_uri: tokenRequestBody.redirect_uri,
            client_id: tokenRequestBody.client_id,
            client_secret: tokenRequestBody.client_secret ? 'SET' : 'NOT SET'
        });
        
        const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', 
            new URLSearchParams(tokenRequestBody),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
        );
        
        console.log('✅ TOKEN RESPONSE SUCCESS:', {
            access_token: tokenResponse.data.access_token ? 'RECEIVED' : 'MISSING',
            refresh_token: tokenResponse.data.refresh_token ? 'RECEIVED' : 'MISSING'
        });
        
        const { access_token, refresh_token } = tokenResponse.data;
        
        // Pobierz info o użytkowniku
        console.log('👤 GETTING USER INFO...');
        const userResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${access_token}` }
        });
        
        const userId = userResponse.data.id;
        const userName = userResponse.data.display_name;
        
        console.log('✅ USER INFO SUCCESS:', { userId, userName });
        
        userTokens.set(userId, { access_token, refresh_token });
        
        console.log('🎵 REDIRECTING TO SUCCESS PAGE...');
        res.redirect(`/?connected=true&user=${encodeURIComponent(userName)}&userId=${userId}`);
        
    } catch (error) {
        console.error('❌ AUTH CALLBACK ERROR:', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            config: {
                url: error.config?.url,
                method: error.config?.method,
                headers: error.config?.headers
            }
        });
        
        // Detailed error response
        if (error.response?.data) {
            console.error('📋 SPOTIFY API ERROR DETAILS:', error.response.data);
        }
        
        res.redirect(`/?error=auth_failed&details=${encodeURIComponent(error.message)}`);
    }
});

// ===== TWORZENIE LINKU UDOSTĘPNIANIA =====
app.post('/api/create-link', async (req, res) => {
    const { userId } = req.body;
    
    console.log('🔗 CREATE LINK REQUEST:', { userId });
    
    const userToken = userTokens.get(userId);
    if (!userToken) {
        console.log('❌ USER NOT AUTHENTICATED:', userId);
        return res.status(401).json({ error: 'User not authenticated' });
    }
    
    try {
        // Sprawdź status odtwarzacza
        const playerResponse = await axios.get('https://api.spotify.com/v1/me/player', {
            headers: { 'Authorization': `Bearer ${userToken.access_token}` }
        });
        
        const linkId = uuidv4();
        const shareLink = `${BASE_URL}/control/${linkId}`;
        
        const sessionData = {
            userId: userId,
            accessToken: userToken.access_token,
            createdAt: new Date(),
            neighbors: [],
            currentTrack: playerResponse.data?.item || null,
            isPlaying: playerResponse.data?.is_playing || false,
            volume: playerResponse.data?.device?.volume_percent || 50
        };
        
        activeSessions.set(linkId, sessionData);
        
        console.log('✅ SESSION CREATED:', { linkId, userId, sessionsCount: activeSessions.size });
        
        res.json({ 
            success: true, 
            linkId, 
            shareLink,
            currentStatus: {
                track: playerResponse.data?.item,
                isPlaying: playerResponse.data?.is_playing,
                volume: playerResponse.data?.device?.volume_percent
            }
        });
        
    } catch (error) {
        console.error('❌ CREATE LINK ERROR:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to create link' });
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
        message,
        body: req.body 
    });
    
    const session = activeSessions.get(linkId);
    if (!session) {
        console.log('❌ SESSION NOT FOUND FOR CONTROL:', linkId);
        return res.status(404).json({ error: 'Session not found' });
    }
    
    console.log('✅ SESSION FOUND FOR CONTROL:', { linkId, userId: session.userId });
    
    try {
        // Handle volume control
        if (volume !== undefined) {
            console.log('🔊 SETTING VOLUME:', volume);
            
            // Ustaw głośność w Spotify
            await axios.put(
                `https://api.spotify.com/v1/me/player/volume?volume_percent=${volume}`,
                {},
                { headers: { 'Authorization': `Bearer ${session.accessToken}` }}
            );
            
            session.volume = volume;
            console.log('✅ VOLUME SET SUCCESSFULLY:', volume);
        }
        
        // Create neighbor action
        const neighborAction = {
            neighborId: neighborId || 'Anonymous',
            action: action || 'volume_change',
            volume: volume,
            message: message,
            timestamp: new Date()
        };
        
        console.log('📝 CREATING NEIGHBOR ACTION:', neighborAction);
        
        // Add to session history
        session.neighbors.push(neighborAction);
        
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
        
        // Also emit to general session update (for main app)
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
        
        res.status(500).json({ 
            error: 'Failed to control volume',
            details: error.message 
        });
    }
});

// ===== STATUS SESJI =====
app.get('/api/status/:linkId', async (req, res) => {
    const { linkId } = req.params;
    
    console.log('📊 STATUS REQUEST:', { linkId, sessionsCount: activeSessions.size });
    console.log('📊 AVAILABLE SESSIONS:', Array.from(activeSessions.keys()));
    
    const session = activeSessions.get(linkId);
    
    if (!session) {
        console.log('❌ SESSION NOT FOUND:', linkId);
        return res.status(404).json({ error: 'Session not found' });
    }
    
    console.log('✅ SESSION FOUND:', { linkId, userId: session.userId });
    
    try {
        // Pobierz aktualny status z Spotify
        const playerResponse = await axios.get('https://api.spotify.com/v1/me/player', {
            headers: { 'Authorization': `Bearer ${session.accessToken}` }
        });
        
        const playerData = playerResponse.data;
        
        // Aktualizuj sesję
        if (playerData) {
            session.currentTrack = playerData.item;
            session.isPlaying = playerData.is_playing;
            session.volume = playerData.device?.volume_percent || session.volume;
        }
        
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
            recentActions: session.neighbors.slice(-10)
        });
        
    } catch (error) {
        console.error('❌ STATUS ERROR:', error.response?.data || error.message);
        res.json({ 
            isPlaying: session.isPlaying || false, 
            volume: session.volume || 50, 
            track: null,
            neighbors: session.neighbors.length || 0,
            recentActions: session.neighbors.slice(-10) || []
        });
    }
});

// ===== STRONA KONTROLI SĄSIADA =====
app.get('/control/:linkId', (req, res) => {
    const { linkId } = req.params;
    console.log('🎛️ CONTROL PAGE REQUEST:', { linkId });
    
    // Set proper content type
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(path.join(__dirname, 'public', 'neighbor.html'), (err) => {
        if (err) {
            console.error('❌ Error sending neighbor.html:', err);
            res.status(500).send('Page not found');
        }
    });
});

// ===== GŁÓWNA STRONA =====
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
    
    console.log('✅ SESSION FOUND:', { sessionId, userId: session.userId });
    
    try {
        // Test if Spotify token is still valid
        const playerResponse = await axios.get('https://api.spotify.com/v1/me/player', {
            headers: { 'Authorization': `Bearer ${session.accessToken}` }
        });
        
        console.log('✅ SPOTIFY TOKEN STILL VALID');
        
        res.json({ 
            success: true, 
            session: {
                userId: session.userId,
                sessionId: sessionId,
                neighbors: session.neighbors.length,
                volume: session.volume
            }
        });
        
    } catch (error) {
        console.log('❌ SPOTIFY TOKEN INVALID:', error.response?.status);
        
        // Remove invalid session
        activeSessions.delete(sessionId);
        
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
    
    const userToken = userTokens.get(userId);
    if (!userToken) {
        console.log('❌ USER TOKEN NOT FOUND:', userId);
        return res.status(404).json({ error: 'User not found' });
    }
    
    try {
        // Test if Spotify token is still valid
        const userResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${userToken.access_token}` }
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
        console.log('❌ USER TOKEN INVALID:', { userId, error: error.response?.status });
        
        // Remove invalid user token
        userTokens.delete(userId);
        
        res.status(401).json({ 
            error: 'User token expired',
            needsReauth: true 
        });
    }
});
// ===== START SERWERA =====
server.listen(PORT, () => {
    console.log(`🎵 NeighborlyVolume server running on port ${PORT}`);
    console.log(`🔗 Main app: ${BASE_URL}`);
    console.log(`🎛️ Example control: ${BASE_URL}/control/demo123`);
});

// ===== HELPER FUNCTIONS =====
setInterval(() => {
    // Wyczyść stare sesje (starsze niż 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let cleanedCount = 0;
    
    for (const [linkId, session] of activeSessions.entries()) {
        if (session.createdAt < oneDayAgo) {
            activeSessions.delete(linkId);
            cleanedCount++;
        }
    }
    
    if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} old sessions. Active sessions: ${activeSessions.size}`);
    }
}, 60 * 60 * 1000); // Sprawdzaj co godzinę
