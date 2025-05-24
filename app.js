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
const neighborAuthorizations = new Map();

// ===== SYSTEM AUTORYZACJI =====
class AuthorizationManager {
    constructor() {
        this.maxNeighbors = 10;
        this.defaultDailyLimit = 20;
        this.emergencyOverrideDuration = 300000;
        console.log('🔐 Authorization Manager initialized');
    }
    
    createSessionAuth(linkId, ownerId) {
        const sessionAuth = {
            ownerId: ownerId,
            createdAt: Date.now(),
            neighbors: new Map(),
            pendingInvites: new Map(),
            emergencyMode: false,
            emergencyUntil: null,
            sessionSettings: {
                maxVolume: 100,
                minVolume: 0,
                quietHours: {
                    start: 22,
                    end: 8,
                    maxVolume: 30
                },
                autoAcceptInvites: false,
                requireOwnerApproval: false // Simplified for demo
            }
        };
        
        neighborAuthorizations.set(linkId, sessionAuth);
        return sessionAuth;
    }
    
    checkPermission(linkId, neighborId, action, params = {}) {
        const sessionAuth = neighborAuthorizations.get(linkId);
        if (!sessionAuth) return { allowed: true, reason: 'No auth system active' };
        
        // Owner has full permissions
        if (neighborId === sessionAuth.ownerId) {
            return { allowed: true, reason: 'Owner privileges' };
        }
        
        // Emergency mode check
        if (sessionAuth.emergencyMode) {
            return { allowed: false, reason: 'Emergency mode active - only owner can control' };
        }
        
        // For now, allow all actions (simplified)
        return { allowed: true, reason: 'Permission granted' };
    }
    
    incrementUsage(linkId, neighborId, type) {
        // Simplified - just log usage
        console.log(`📊 Usage: ${neighborId} performed ${type} in session ${linkId}`);
    }
    
    getAuthStats(linkId) {
        const sessionAuth = neighborAuthorizations.get(linkId);
        if (!sessionAuth) return null;
        
        return {
            ownerId: sessionAuth.ownerId,
            neighborsCount: sessionAuth.neighbors.size,
            emergencyMode: sessionAuth.emergencyMode,
            sessionSettings: sessionAuth.sessionSettings
        };
    }
}

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

// ===== INICJALIZACJA SYSTEMÓW =====
const authManager = new AuthorizationManager();
const rateLimiter = new VolumeRateLimiter();
const conflictResolver = new ConflictResolver();

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
        
        // Create authorization system
        authManager.createSessionAuth(linkId, userId);
        
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

// ===== 🚨 GŁÓWNY ENDPOINT KONTROLI GŁOŚNOŚCI =====
app.put('/api/control/:linkId', async (req, res) => {
    const { linkId } = req.params;
    const { volume, neighborId, action, message } = req.body;
    
    console.log(`🎛️ Control request - Link: ${linkId}, Volume: ${volume}, Neighbor: ${neighborId}, Action: ${action}`);
    
    const session = activeSessions.get(linkId);
    if (!session) {
        console.error('❌ Session not found:', linkId);
        return res.status(404).json({ error: 'Session not found' });
    }
    
    try {
        // Check authorization
        const actionType = volume !== undefined ? 'volume_control' : 'send_message';
        const permissionCheck = authManager.checkPermission(linkId, neighborId, actionType, { volume });
        
        if (!permissionCheck.allowed) {
            console.log(`❌ Permission denied for ${neighborId}: ${permissionCheck.reason}`);
            return res.status(403).json({ 
                error: 'Permission denied', 
                reason: permissionCheck.reason
            });
        }
        
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
            
            // Update usage stats
            authManager.incrementUsage(linkId, neighborId, 'volume');
        }
        
        // Handle MESSAGE ONLY (emoji, thank you, etc.)
        if (volume === undefined && (action === 'emoji_message' || action === 'thank_you' || message)) {
            console.log(`💬 Processing message: ${action} - "${message}"`);
            
            // Light rate limiting for messages (more permissive)
            if (!rateLimiter.canAdjustVolume(neighborId)) {
                // Allow messages even if volume is rate limited, but log it
                console.log(`⚠️ Message sent while volume rate limited: ${neighborId}`);
            }
            
            // Update usage stats
            authManager.incrementUsage(linkId, neighborId, 'message');
        }
        
        // Add to neighbor actions history
        const neighborAction = {
            neighborId: neighborId || 'Anonymous',
            action: action || (volume !== undefined ? 'volume_change' : 'message'),
            volume: volume,
            message: message,
            timestamp: new Date()
        };
        
        session.neighbors.push(neighborAction);
        
        // Add to control history
        session.controlHistory.push({
            userId: neighborId,
            action: action || (volume !== undefined ? 'volume_change' : 'message'),
            volume: volume,
            message: message,
            timestamp: Date.now()
        });
        
        // Send WebSocket update
        io.emit(`session_${linkId}`, {
            type: 'neighbor_action',
            data: neighborAction,
            session: {
                volume: session.volume, // Current volume
                neighbors: session.neighbors.length
            }
        });
        
        console.log(`✅ Control request processed for ${neighborId}`);
        
        // Response based on action type
        if (volume !== undefined) {
            res.json({ 
                success: true, 
                volume: volume,
                isPending: true,
                message: 'Volume change scheduled',
                remainingTokens: rateLimiter.getRemainingTokens(neighborId)
            });
        } else {
            res.json({ 
                success: true, 
                action: action,
                message: 'Message sent successfully',
                timestamp: Date.now()
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
            }
        } catch (playerError) {
            console.log('⚠️ Player status unavailable, using cached data');
        }
        
        const conflictStats = conflictResolver.getConflictStats(linkId);
        const currentController = conflictResolver.getCurrentController(linkId);
        const authStats = authManager.getAuthStats(linkId);
        
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
            authStats: authStats,
            emergencyMode: authStats?.emergencyMode || false
        });
        
    } catch (error) {
        console.error('💥 Status error:', error.message);
        
        const conflictStats = conflictResolver.getConflictStats(linkId);
        const currentController = conflictResolver.getCurrentController(linkId);
        const authStats = authManager.getAuthStats(linkId);
        
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
            authStats: authStats,
            emergencyMode: authStats?.emergencyMode || false
        });
    }
});

// ===== DEBUG SESSION =====
app.get('/api/debug/:linkId', (req, res) => {
    const { linkId } = req.params;
    const session = activeSessions.get(linkId);
    
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    const conflictStats = conflictResolver.getConflictStats(linkId);
    const pendingChange = conflictResolver.pendingChanges.get(linkId);
    
    res.json({
        session: {
            userId: session.userId,
            createdAt: session.createdAt,
            volume: session.volume,
            lastController: session.lastController,
            neighborsCount: session.neighbors.length,
            controlHistoryCount: session.controlHistory.length
        },
        conflictResolver: {
            pendingChange: pendingChange ? {
                userId: pendingChange.userId,
                volume: pendingChange.volume,
                timeRemaining: pendingChange.timestamp + 300 - Date.now()
            } : null,
            conflictStats: conflictStats
        },
        rateLimiter: {
            userLimits: Array.from(rateLimiter.users.entries()).map(([userId, limit]) => ({
                userId,
                tokens: limit.tokens,
                lastRefill: new Date(limit.lastRefill).toISOString()
            }))
        }
    });
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
            socket.emit(`session_${linkId}`, {
                type: 'session_joined',
                currentController: currentController,
                volume: session.volume,
                timestamp: Date.now()
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
            timestamp: Date.now()
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
        memory: process.memoryUsage()
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
});

// ===== CLEANUP =====
setInterval(() => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let cleanedCount = 0;
    
    for (const [linkId, session] of activeSessions.entries()) {
        if (session.createdAt < oneDayAgo) {
            activeSessions.delete(linkId);
            neighborAuthorizations.delete(linkId);
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
