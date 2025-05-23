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
        
    res.redirect(authURL);
});

app.get('/auth/callback', async (req, res) => {
    const { code, error } = req.query;
    
    if (error) {
        return res.redirect('/?error=access_denied');
    }
    
    try {
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
        
        // Pobierz info o użytkowniku
        const userResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${access_token}` }
        });
        
        const userId = userResponse.data.id;
        userTokens.set(userId, { access_token, refresh_token });
        
        res.redirect(`/?connected=true&user=${encodeURIComponent(userResponse.data.display_name)}&userId=${userId}`);
        
    } catch (error) {
        console.error('Auth error:', error.response?.data || error.message);
        res.redirect('/?error=auth_failed');
    }
});

// ===== TWORZENIE LINKU UDOSTĘPNIANIA =====
app.post('/api/create-link', async (req, res) => {
    const { userId } = req.body;
    
    const userToken = userTokens.get(userId);
    if (!userToken) {
        return res.status(401).json({ error: 'User not authenticated' });
    }
    
    try {
        // Sprawdź status odtwarzacza
        const playerResponse = await axios.get('https://api.spotify.com/v1/me/player', {
            headers: { 'Authorization': `Bearer ${userToken.access_token}` }
        });
        
        const linkId = uuidv4();
        const shareLink = `${BASE_URL}/control/${linkId}`;
        
        activeSessions.set(linkId, {
            userId: userId,
            accessToken: userToken.access_token,
            createdAt: new Date(),
            neighbors: [],
            currentTrack: playerResponse.data?.item || null,
            isPlaying: playerResponse.data?.is_playing || false,
            volume: playerResponse.data?.device?.volume_percent || 50
        });
        
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
        console.error('Create link error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to create link' });
    }
});

// ===== KONTROLA GŁOŚNOŚCI =====
app.put('/api/control/:linkId', async (req, res) => {
    const { linkId } = req.params;
    const { volume, neighborId, action, message } = req.body;
    
    const session = activeSessions.get(linkId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    try {
        if (volume !== undefined) {
            // Ustaw głośność w Spotify
            await axios.put(
                `https://api.spotify.com/v1/me/player/volume?volume_percent=${volume}`,
                {},
                { headers: { 'Authorization': `Bearer ${session.accessToken}` }}
            );
            
            session.volume = volume;
        }
        
        // Dodaj akcję do historii
        const neighborAction = {
            neighborId: neighborId || 'Anonymous',
            action: action || 'volume_change',
            volume: volume,
            message: message,
            timestamp: new Date()
        };
        
        session.neighbors.push(neighborAction);
        
        // Wyślij update przez WebSocket
        io.emit(`session_${linkId}`, {
            type: 'neighbor_action',
            data: neighborAction,
            session: {
                volume: session.volume,
                neighbors: session.neighbors.length
            }
        });
        
        res.json({ success: true, volume: session.volume });
        
    } catch (error) {
        console.error('Volume control error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to control volume' });
    }
});

// ===== STATUS SESJI =====
app.get('/api/status/:linkId', async (req, res) => {
    const { linkId } = req.params;
    const session = activeSessions.get(linkId);
    
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
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
        console.error('Status error:', error.response?.data || error.message);
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
    res.sendFile(path.join(__dirname, 'public', 'neighbor.html'));
});

// ===== GŁÓWNA STRONA =====
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== WEBSOCKET =====
io.on('connection', (socket) => {
    console.log('New client connected');
    
    socket.on('join_session', (linkId) => {
        socket.join(`session_${linkId}`);
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
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
    for (const [linkId, session] of activeSessions.entries()) {
        if (session.createdAt < oneDayAgo) {
            activeSessions.delete(linkId);
            console.log(`Cleaned up old session: ${linkId}`);
        }
    }
}, 60 * 60 * 1000); // Sprawdzaj co godzinę
