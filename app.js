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
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || 'ac709159a324498eae740127315437f7';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '5aae8a1e2ae844c1921161c38f7e9d8f';
const BASE_URL = process.env.BASE_URL || 'https://localhost:3000';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== PRZECHOWYWANIE SESJI (TYMCZASOWE) =====
const activeSessions = new Map();
const userTokens = new Map();
// ===== DODAJ DO app.js - SYSTEM AUTORYZACJI =====

// Dodaj po linii: const userTokens = new Map();
const neighborAuthorizations = new Map(); // linkId -> authorizations
const emergencyOverrides = new Map(); // linkId -> override status

// ===== KLASA AUTHORIZATION MANAGER =====
class AuthorizationManager {
    constructor() {
        this.maxNeighbors = 10; // Max 10 sąsiadów na sesję
        this.defaultDailyLimit = 20; // 20 zmian głośności dziennie
        this.emergencyOverrideDuration = 300000; // 5 minut
        
        console.log('🔐 Authorization Manager initialized');
    }
    
    // Tworzenie nowej sesji z autoryzacjami
    createSessionAuth(linkId, ownerId) {
        const sessionAuth = {
            ownerId: ownerId,
            createdAt: Date.now(),
            neighbors: new Map(), // neighborId -> permissions
            pendingInvites: new Map(), // inviteCode -> neighborData
            emergencyMode: false,
            emergencyUntil: null,
            sessionSettings: {
                maxVolume: 100,
                minVolume: 0,
                quietHours: {
                    start: 22, // 22:00
                    end: 8,    // 8:00
                    maxVolume: 30
                },
                autoAcceptInvites: false,
                requireOwnerApproval: true
            }
        };
        
        neighborAuthorizations.set(linkId, sessionAuth);
        return sessionAuth;
    }
    
    // Generowanie kodu zaproszenia (6-cyfrowy)
    generateInviteCode() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }
    
    // Właściciel tworzy zaproszenie dla sąsiada
    createNeighborInvite(linkId, neighborName, permissions = null) {
        const sessionAuth = neighborAuthorizations.get(linkId);
        if (!sessionAuth) return null;
        
        const inviteCode = this.generateInviteCode();
        const defaultPermissions = {
            canControlVolume: true,
            canSendMessages: true,
            dailyVolumeLimit: this.defaultDailyLimit,
            volumeRange: {
                min: sessionAuth.sessionSettings.minVolume,
                max: sessionAuth.sessionSettings.maxVolume
            },
            quietHoursRespect: true,
            emergencyOverride: false, // Tylko właściciel ma to domyślnie
            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24h
        };
        
        const invite = {
            inviteCode: inviteCode,
            neighborName: neighborName,
            permissions: permissions || defaultPermissions,
            createdAt: Date.now(),
            createdBy: sessionAuth.ownerId,
            used: false
        };
        
        sessionAuth.pendingInvites.set(inviteCode, invite);
        
        console.log(`📧 Invite created: ${inviteCode} for ${neighborName} in session ${linkId}`);
        return invite;
    }
    
    // Sąsiad dołącza używając kodu
    acceptInvite(inviteCode, neighborId, neighborDeviceInfo = {}) {
        // Znajdź sesję z tym kodem
        for (const [linkId, sessionAuth] of neighborAuthorizations.entries()) {
            const invite = sessionAuth.pendingInvites.get(inviteCode);
            
            if (invite && !invite.used && invite.expiresAt > Date.now()) {
                // Sprawdź czy sesja nie jest pełna
                if (sessionAuth.neighbors.size >= this.maxNeighbors) {
                    return { success: false, error: 'Session is full' };
                }
                
                // Dodaj sąsiada do sesji
                const neighborData = {
                    neighborId: neighborId,
                    neighborName: invite.neighborName,
                    permissions: invite.permissions,
                    joinedAt: Date.now(),
                    deviceInfo: neighborDeviceInfo,
                    dailyUsage: {
                        date: new Date().toDateString(),
                        volumeChanges: 0,
                        messagesSet: 0
                    },
                    status: sessionAuth.sessionSettings.requireOwnerApproval ? 'pending' : 'active'
                };
                
                sessionAuth.neighbors.set(neighborId, neighborData);
                invite.used = true;
                invite.usedBy = neighborId;
                invite.usedAt = Date.now();
                
                console.log(`✅ Neighbor ${neighborId} joined session ${linkId} using invite ${inviteCode}`);
                
                // Powiadom właściciela
                const session = activeSessions.get(linkId);
                if (session) {
                    io.emit(`session_${linkId}`, {
                        type: 'neighbor_joined',
                        neighborId: neighborId,
                        neighborName: invite.neighborName,
                        needsApproval: sessionAuth.sessionSettings.requireOwnerApproval,
                        message: `🏠 ${invite.neighborName} dołączył jako sąsiad`
                    });
                }
                
                return { 
                    success: true, 
                    linkId: linkId,
                    sessionAuth: sessionAuth,
                    permissions: invite.permissions,
                    needsApproval: sessionAuth.sessionSettings.requireOwnerApproval
                };
            }
        }
        
        return { success: false, error: 'Invalid or expired invite code' };
    }
    
    // Sprawdź czy sąsiad ma pozwolenie na daną akcję
    checkPermission(linkId, neighborId, action, params = {}) {
        const sessionAuth = neighborAuthorizations.get(linkId);
        if (!sessionAuth) return { allowed: false, reason: 'Session not found' };
        
        // Właściciel ma zawsze pełne uprawnienia
        if (neighborId === sessionAuth.ownerId) {
            return { allowed: true, reason: 'Owner privileges' };
        }
        
        const neighbor = sessionAuth.neighbors.get(neighborId);
        if (!neighbor) return { allowed: false, reason: 'Neighbor not found' };
        
        if (neighbor.status !== 'active') {
            return { allowed: false, reason: 'Neighbor not approved' };
        }
        
        // Sprawdź emergency mode
        if (sessionAuth.emergencyMode && !neighbor.permissions.emergencyOverride) {
            return { allowed: false, reason: 'Emergency mode active - only owner can control' };
        }
        
        switch (action) {
            case 'volume_control':
                return this.checkVolumePermission(sessionAuth, neighbor, params.volume);
                
            case 'send_message':
                return this.checkMessagePermission(sessionAuth, neighbor);
                
            case 'emergency_override':
                return { 
                    allowed: neighbor.permissions.emergencyOverride,
                    reason: neighbor.permissions.emergencyOverride ? 'Allowed' : 'No emergency override permission'
                };
                
            default:
                return { allowed: false, reason: 'Unknown action' };
        }
    }
    
    checkVolumePermission(sessionAuth, neighbor, requestedVolume) {
        if (!neighbor.permissions.canControlVolume) {
            return { allowed: false, reason: 'No volume control permission' };
        }
        
        // Sprawdź daily limit
        const today = new Date().toDateString();
        if (neighbor.dailyUsage.date !== today) {
            // Reset daily usage
            neighbor.dailyUsage = {
                date: today,
                volumeChanges: 0,
                messagesSet: 0
            };
        }
        
        if (neighbor.dailyUsage.volumeChanges >= neighbor.permissions.dailyVolumeLimit) {
            return { 
                allowed: false, 
                reason: `Daily limit reached (${neighbor.permissions.dailyVolumeLimit} changes)`,
                resetAt: new Date(Date.now() + 24*60*60*1000).toISOString()
            };
        }
        
        // Sprawdź volume range
        const { min, max } = neighbor.permissions.volumeRange;
        if (requestedVolume < min || requestedVolume > max) {
            return { 
                allowed: false, 
                reason: `Volume out of allowed range (${min}%-${max}%)` 
            };
        }
        
        // Sprawdź quiet hours
        if (neighbor.permissions.quietHoursRespect) {
            const hour = new Date().getHours();
            const { start, end, maxVolume } = sessionAuth.sessionSettings.quietHours;
            
            const isQuietHours = (start > end) ? 
                (hour >= start || hour < end) : 
                (hour >= start && hour < end);
                
            if (isQuietHours && requestedVolume > maxVolume) {
                return { 
                    allowed: false, 
                    reason: `Quiet hours active (${start}:00-${end}:00) - max ${maxVolume}%` 
                };
            }
        }
        
        return { allowed: true, reason: 'Permission granted' };
    }
    
    checkMessagePermission(sessionAuth, neighbor) {
        if (!neighbor.permissions.canSendMessages) {
            return { allowed: false, reason: 'No message permission' };
        }
        
        // Można dodać rate limiting dla wiadomości
        return { allowed: true, reason: 'Message permission granted' };
    }
    
    // Właściciel zatwierdza sąsiada
    approveNeighbor(linkId, ownerId, neighborId) {
        const sessionAuth = neighborAuthorizations.get(linkId);
        if (!sessionAuth || sessionAuth.ownerId !== ownerId) {
            return { success: false, error: 'Unauthorized' };
        }
        
        const neighbor = sessionAuth.neighbors.get(neighborId);
        if (!neighbor) {
            return { success: false, error: 'Neighbor not found' };
        }
        
        neighbor.status = 'active';
        neighbor.approvedAt = Date.now();
        
        // Powiadom sąsiada
        io.emit(`neighbor_${neighborId}`, {
            type: 'approval_received',
            linkId: linkId,
            message: '✅ Właściciel zatwierdził Twój dostęp!',
            permissions: neighbor.permissions
        });
        
        console.log(`✅ Owner ${ownerId} approved neighbor ${neighborId} in session ${linkId}`);
        return { success: true };
    }
    
    // Emergency override - właściciel przejmuje kontrolę
    activateEmergencyOverride(linkId, ownerId, duration = null) {
        const sessionAuth = neighborAuthorizations.get(linkId);
        if (!sessionAuth || sessionAuth.ownerId !== ownerId) {
            return { success: false, error: 'Unauthorized' };
        }
        
        const overrideDuration = duration || this.emergencyOverrideDuration;
        
        sessionAuth.emergencyMode = true;
        sessionAuth.emergencyUntil = Date.now() + overrideDuration;
        
        // Powiadom wszystkich sąsiadów
        io.emit(`session_${linkId}`, {
            type: 'emergency_override_activated',
            ownerId: ownerId,
            duration: overrideDuration,
            message: '🚨 Właściciel aktywował tryb awaryjny - kontrola zablokowana'
        });
        
        // Auto-wyłącz po czasie
        setTimeout(() => {
            this.deactivateEmergencyOverride(linkId, ownerId);
        }, overrideDuration);
        
        console.log(`🚨 Emergency override activated in session ${linkId} for ${overrideDuration}ms`);
        return { success: true, duration: overrideDuration };
    }
    
    deactivateEmergencyOverride(linkId, ownerId) {
        const sessionAuth = neighborAuthorizations.get(linkId);
        if (!sessionAuth || sessionAuth.ownerId !== ownerId) {
            return { success: false, error: 'Unauthorized' };
        }
        
        sessionAuth.emergencyMode = false;
        sessionAuth.emergencyUntil = null;
        
        io.emit(`session_${linkId}`, {
            type: 'emergency_override_deactivated',
            message: '✅ Tryb awaryjny wyłączony - normalna kontrola przywrócona'
        });
        
        console.log(`✅ Emergency override deactivated in session ${linkId}`);
        return { success: true };
    }
    
    // Aktualizuj daily usage
    incrementUsage(linkId, neighborId, type) {
        const sessionAuth = neighborAuthorizations.get(linkId);
        if (!sessionAuth) return;
        
        const neighbor = sessionAuth.neighbors.get(neighborId);
        if (!neighbor) return;
        
        const today = new Date().toDateString();
        if (neighbor.dailyUsage.date !== today) {
            neighbor.dailyUsage = {
                date: today,
                volumeChanges: 0,
                messagesSet: 0
            };
        }
        
        if (type === 'volume') {
            neighbor.dailyUsage.volumeChanges++;
        } else if (type === 'message') {
            neighbor.dailyUsage.messagesSet++;
        }
    }
    
    // Pobierz stats autoryzacji
    getAuthStats(linkId) {
        const sessionAuth = neighborAuthorizations.get(linkId);
        if (!sessionAuth) return null;
        
        return {
            ownerId: sessionAuth.ownerId,
            neighborsCount: sessionAuth.neighbors.size,
            pendingInvites: sessionAuth.pendingInvites.size,
            emergencyMode: sessionAuth.emergencyMode,
            sessionSettings: sessionAuth.sessionSettings,
            neighbors: Array.from(sessionAuth.neighbors.values()).map(n => ({
                neighborId: n.neighborId,
                neighborName: n.neighborName,
                status: n.status,
                joinedAt: n.joinedAt,
                dailyUsage: n.dailyUsage,
                permissions: n.permissions
            }))
        };
    }
}

// Inicjalizacja
const authManager = new AuthorizationManager();

// ===== AKTUALIZUJ ENDPOINT TWORZENIA LINKU =====
// Zastąp istniejący endpoint '/api/create-link':

app.post('/api/create-link', async (req, res) => {
    const { userId } = req.body;
    
    console.log(`🔗 Creating share link for user: ${userId}`);
    
    const userToken = userTokens.get(userId);
    if (!userToken) {
        console.log(`❌ User ${userId} not authenticated`);
        return res.status(401).json({ error: 'User not authenticated' });
    }
    
    try {
        // Sprawdź status odtwarzacza
        const playerResponse = await axios.get('https://api.spotify.com/v1/me/player', {
            headers: { 'Authorization': `Bearer ${userToken.access_token}` }
        });
        
        const linkId = uuidv4();
        const shareLink = `${BASE_URL}/control/${linkId}`;
        
        // Utwórz sesję muzyczną
        activeSessions.set(linkId, {
            userId: userId,
            accessToken: userToken.access_token,
            createdAt: new Date(),
            neighbors: [],
            currentTrack: playerResponse.data?.item || null,
            isPlaying: playerResponse.data?.is_playing || false,
            volume: playerResponse.data?.device?.volume_percent || 50,
            lastController: null,
            lastVolumeChange: null,
            controlHistory: []
        });
        
        // NOWE: Utwórz system autoryzacji dla sesji
        const sessionAuth = authManager.createSessionAuth(linkId, userId);
        
        console.log(`✅ Share link created: ${linkId} for user ${userId}`);
        console.log(`🔗 Share URL: ${shareLink}`);
        console.log(`🔐 Authorization system initialized for session`);
        
        res.json({ 
            success: true, 
            linkId, 
            shareLink,
            authStats: authManager.getAuthStats(linkId),
            currentStatus: {
                track: playerResponse.data?.item,
                isPlaying: playerResponse.data?.is_playing,
                volume: playerResponse.data?.device?.volume_percent
            }
        });
        
    } catch (error) {
        console.error('❌ Create link error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to create link' });
    }
});

// ===== NOWE API ENDPOINTS =====

// Właściciel tworzy zaproszenie dla sąsiada
app.post('/api/invite-neighbor/:linkId', (req, res) => {
    const { linkId } = req.params;
    const { userId, neighborName, permissions } = req.body;
    
    const session = activeSessions.get(linkId);
    if (!session || session.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const invite = authManager.createNeighborInvite(linkId, neighborName, permissions);
    
    if (invite) {
        console.log(`📧 Invite created by ${userId}: ${invite.inviteCode}`);
        res.json({ 
            success: true, 
            invite: {
                inviteCode: invite.inviteCode,
                neighborName: invite.neighborName,
                expiresAt: invite.expiresAt,
                inviteLink: `${BASE_URL}/join/${invite.inviteCode}`
            }
        });
    } else {
        res.status(500).json({ error: 'Failed to create invite' });
    }
});

// Sąsiad dołącza używając kodu
app.post('/api/join-session', (req, res) => {
    const { inviteCode, neighborId, neighborDeviceInfo } = req.body;
    
    if (!inviteCode || !neighborId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = authManager.acceptInvite(inviteCode, neighborId, neighborDeviceInfo);
    
    if (result.success) {
        console.log(`✅ Neighbor ${neighborId} successfully joined session`);
        res.json({
            success: true,
            linkId: result.linkId,
            permissions: result.permissions,
            needsApproval: result.needsApproval,
            redirectUrl: `${BASE_URL}/control/${result.linkId}`
        });
    } else {
        res.status(400).json({ error: result.error });
    }
});

// Właściciel zatwierdza sąsiada
app.post('/api/approve-neighbor/:linkId', (req, res) => {
    const { linkId } = req.params;
    const { userId, neighborId } = req.body;
    
    const session = activeSessions.get(linkId);
    if (!session || session.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const result = authManager.approveNeighbor(linkId, userId, neighborId);
    
    if (result.success) {
        res.json({ success: true });
    } else {
        res.status(400).json({ error: result.error });
    }
});

// Emergency override
app.post('/api/emergency-override/:linkId', (req, res) => {
    const { linkId } = req.params;
    const { userId, action, duration } = req.body; // action: 'activate' | 'deactivate'
    
    const session = activeSessions.get(linkId);
    if (!session || session.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    let result;
    if (action === 'activate') {
        result = authManager.activateEmergencyOverride(linkId, userId, duration);
    } else {
        result = authManager.deactivateEmergencyOverride(linkId, userId);
    }
    
    if (result.success) {
        res.json(result);
    } else {
        res.status(400).json({ error: result.error });
    }
});

// Pobierz authorization stats
app.get('/api/auth-stats/:linkId', (req, res) => {
    const { linkId } = req.params;
    const stats = authManager.getAuthStats(linkId);
    
    if (stats) {
        res.json(stats);
    } else {
        res.status(404).json({ error: 'Session not found' });
    }
});

// ===== NOWE: RATE LIMITING CLASS =====
class VolumeRateLimiter {
    constructor() {
        this.maxTokens = 5;      // max 5 zmian
        this.refillRate = 60000; // na minutę (60 sekund)
        this.users = new Map();
        
        console.log('🛡️ Rate Limiter initialized: 5 changes per minute');
    }
    
    canAdjustVolume(userId) {
        const now = Date.now();
        let userLimit = this.users.get(userId) || {
            tokens: this.maxTokens,
            lastRefill: now
        };
        
        // Oblicz ile tokenów dodać na podstawie czasu
        const timePassed = now - userLimit.lastRefill;
        const tokensToAdd = Math.floor(timePassed / (this.refillRate / this.maxTokens));
        
        if (tokensToAdd > 0) {
            userLimit.tokens = Math.min(this.maxTokens, userLimit.tokens + tokensToAdd);
            userLimit.lastRefill = now;
            console.log(`🔄 User ${userId} refilled ${tokensToAdd} tokens, now has ${userLimit.tokens}`);
        }
        
        // Sprawdź czy użytkownik ma tokeny
        if (userLimit.tokens > 0) {
            userLimit.tokens--;
            this.users.set(userId, userLimit);
            console.log(`✅ User ${userId} used token, ${userLimit.tokens} remaining`);
            return true;
        }
        
        this.users.set(userId, userLimit);
        console.log(`❌ User ${userId} rate limited, no tokens available`);
        return false;
    }
    
    getTimeUntilRefill(userId) {
        const userLimit = this.users.get(userId);
        if (!userLimit) return 0;
        
        const timeSinceLastRefill = Date.now() - userLimit.lastRefill;
        const timeUntilNextToken = (this.refillRate / this.maxTokens) - (timeSinceLastRefill % (this.refillRate / this.maxTokens));
        
        return Math.ceil(timeUntilNextToken / 1000); // w sekundach
    }
    
    getRemainingTokens(userId) {
        const userLimit = this.users.get(userId);
        return userLimit ? userLimit.tokens : this.maxTokens;
    }
}

// ===== NOWE: CONFLICT RESOLVER CLASS =====
class ConflictResolver {
    constructor() {
        this.pendingChanges = new Map();
        this.debounceTime = 300; // 300ms
        this.recentChanges = new Map(); // Track recent changes for conflict detection
        this.conflictWindow = 5000; // 5 seconds window for conflict detection
        
        console.log('🎛️ Conflict Resolver initialized: 300ms debounce, 5s conflict window');
    }
    
    handleVolumeChange(linkId, userId, volume) {
        const session = activeSessions.get(linkId);
        if (!session) {
            console.log(`❌ Session ${linkId} not found`);
            return false;
        }
        
        console.log(`🎚️ Volume change request: ${userId} → ${volume}% in session ${linkId}`);
        
        // Zapisz zmianę do historii
        this.recordVolumeChange(linkId, userId, volume);
        
        // Anuluj poprzednie oczekujące zmiany dla tej sesji
        if (this.pendingChanges.has(linkId)) {
            clearTimeout(this.pendingChanges.get(linkId).timeout);
            console.log(`🔄 Cancelled previous pending change for session ${linkId}`);
        }
        
        // Sprawdź czy występuje konflikt
        const conflictUsers = this.detectConflict(linkId);
        let finalVolume = volume;
        let isConflictResolution = false;
        
        if (conflictUsers.length >= 2) {
            // Smart averaging - uśrednij wartości z ostatnich 5 sekund
            finalVolume = this.smartAverage(linkId);
            isConflictResolution = true;
            
            console.log(`⚠️ Conflict detected in session ${linkId}: ${conflictUsers.length} users, averaging to ${finalVolume}%`);
            
            // Powiadom o konflikcie
            io.emit(`session_${linkId}`, {
                type: 'conflict_detected',
                conflictingUsers: conflictUsers,
                originalVolume: volume,
                averagedVolume: finalVolume,
                message: `⚠️ Konflikt wykryty! Uśrednianie ${conflictUsers.length} zmian...`,
                timestamp: Date.now()
            });
        }
        
        // Ustaw opóźnioną zmianę (debouncing)
        const changeData = {
            userId,
            volume: finalVolume,
            originalVolume: volume,
            timestamp: Date.now(),
            isConflictResolution,
            timeout: setTimeout(() => {
                this.applyVolumeChange(linkId, userId, finalVolume);
                this.pendingChanges.delete(linkId);
            }, this.debounceTime)
        };
        
        this.pendingChanges.set(linkId, changeData);
        
        console.log(`⏳ Scheduled volume change to ${finalVolume}% in ${this.debounceTime}ms`);
        
        // Powiadom o oczekującej zmianie
        io.emit(`session_${linkId}`, {
            type: 'volume_pending',
            userId: userId,
            volume: finalVolume,
            originalVolume: volume,
            willApplyIn: this.debounceTime,
            isConflictResolution,
            timestamp: Date.now()
        });
        
        return true;
    }
    
    recordVolumeChange(linkId, userId, volume) {
        if (!this.recentChanges.has(linkId)) {
            this.recentChanges.set(linkId, []);
        }
        
        const changes = this.recentChanges.get(linkId);
        changes.push({
            userId,
            volume,
            timestamp: Date.now()
        });
        
        // Zachowaj tylko zmiany z ostatnich 10 sekund
        const cutoff = Date.now() - 10000;
        const filteredChanges = changes.filter(change => change.timestamp > cutoff);
        this.recentChanges.set(linkId, filteredChanges);
        
        console.log(`📝 Recorded change for ${userId}: ${volume}%, total recent changes: ${filteredChanges.length}`);
    }
    
    detectConflict(linkId) {
        const changes = this.recentChanges.get(linkId) || [];
        const recentCutoff = Date.now() - this.conflictWindow;
        
        const recentChanges = changes.filter(change => change.timestamp > recentCutoff);
        const uniqueUsers = [...new Set(recentChanges.map(change => change.userId))];
        
        if (uniqueUsers.length >= 2) {
            console.log(`🔍 Conflict detected: ${uniqueUsers.length} users in last ${this.conflictWindow/1000}s`);
        }
        
        return uniqueUsers;
    }
    
    smartAverage(linkId) {
        const changes = this.recentChanges.get(linkId) || [];
        const recentCutoff = Date.now() - this.conflictWindow;
        
        const recentChanges = changes.filter(change => change.timestamp > recentCutoff);
        
        if (recentChanges.length === 0) {
            console.log('📊 No recent changes for averaging, defaulting to 50%');
            return 50;
        }
        
        // Wyważona średnia - nowsze zmiany mają większą wagę
        let totalWeight = 0;
        let weightedSum = 0;
        const now = Date.now();
        
        recentChanges.forEach(change => {
            const age = now - change.timestamp;
            const weight = Math.max(1, this.conflictWindow - age); // Nowsze = większa waga
            
            weightedSum += change.volume * weight;
            totalWeight += weight;
            
            console.log(`📊 Change: ${change.volume}%, age: ${age}ms, weight: ${weight}`);
        });
        
        const average = Math.round(weightedSum / totalWeight);
        console.log(`📊 Smart average calculated: ${average}% from ${recentChanges.length} changes`);
        
        return average;
    }
    
    async applyVolumeChange(linkId, userId, volume) {
        const session = activeSessions.get(linkId);
        if (!session) {
            console.log(`❌ Cannot apply volume change: session ${linkId} not found`);
            return;
        }
        
        try {
            console.log(`🎵 Applying volume change: ${volume}% to Spotify`);
            
            // Zastosuj zmianę w Spotify
            await axios.put(
                `https://api.spotify.com/v1/me/player/volume?volume_percent=${volume}`,
                {},
                { headers: { 'Authorization': `Bearer ${session.accessToken}` }}
            );
            
            session.volume = volume;
            session.lastController = userId;
            session.lastVolumeChange = Date.now();
            
            console.log(`✅ Volume successfully changed to ${volume}% by ${userId}`);
            
            // Powiadom o zastosowanej zmianie
            io.emit(`session_${linkId}`, {
                type: 'volume_applied',
                userId: userId,
                volume: volume,
                appliedAt: Date.now()
            });
            
        } catch (error) {
            console.error(`❌ Volume change error for session ${linkId}:`, error.response?.data || error.message);
            
            // Powiadom o błędzie
            io.emit(`session_${linkId}`, {
                type: 'volume_error',
                userId: userId,
                error: 'Failed to change volume',
                message: 'Błąd zmiany głośności - sprawdź połączenie Spotify',
                originalVolume: volume
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
        const changes = this.recentChanges.get(linkId) || [];
        const recentCutoff = Date.now() - this.conflictWindow;
        const recentChanges = changes.filter(change => change.timestamp > recentCutoff);
        
        return {
            totalChanges: changes.length,
            recentChanges: recentChanges.length,
            uniqueUsers: [...new Set(recentChanges.map(c => c.userId))].length,
            hasConflict: [...new Set(recentChanges.map(c => c.userId))].length >= 2
        };
    }
}

// ===== INICJALIZACJA SYSTEMÓW =====
const rateLimiter = new VolumeRateLimiter();
const conflictResolver = new ConflictResolver();

// ===== SPOTIFY AUTH =====
app.get('/auth/login', (req, res) => {
    console.log('🔐 Spotify login request received');
    
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
        
    console.log('🔗 Redirecting to Spotify auth URL');
    res.redirect(authURL);
});

app.get('/auth/callback', async (req, res) => {
    const { code, error } = req.query;
    
    if (error) {
        console.log(`❌ Spotify auth error: ${error}`);
        return res.redirect('/?error=access_denied');
    }
    
    try {
        console.log('🔄 Exchanging code for tokens...');
        
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
        const userName = userResponse.data.display_name;
        
        userTokens.set(userId, { access_token, refresh_token });
        
        console.log(`✅ User authenticated: ${userName} (${userId})`);
        
        res.redirect(`/?connected=true&user=${encodeURIComponent(userName)}&userId=${userId}`);
        
    } catch (error) {
        console.error('❌ Auth error:', error.response?.data || error.message);
        res.redirect('/?error=auth_failed');
    }
});

// ===== TWORZENIE LINKU UDOSTĘPNIANIA =====
app.post('/api/create-link', async (req, res) => {
    const { userId } = req.body;
    
    console.log(`🔗 Creating share link for user: ${userId}`);
    
    const userToken = userTokens.get(userId);
    if (!userToken) {
        console.log(`❌ User ${userId} not authenticated`);
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
            volume: playerResponse.data?.device?.volume_percent || 50,
            lastController: null,
            lastVolumeChange: null,
            controlHistory: []
        });
        
        console.log(`✅ Share link created: ${linkId} for user ${userId}`);
        console.log(`🔗 Share URL: ${shareLink}`);
        
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
        console.error('❌ Create link error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to create link' });
    }
});

// ===== KONTROLA GŁOŚNOŚCI (ZAKTUALIZOWANA Z NOWYM SYSTEMEM) =====
app.get('/api/status/:linkId', async (req, res) => {
    const { linkId } = req.params;
    const session = activeSessions.get(linkId);
    
    if (!session) {
        console.log(`❌ Status request for non-existent session: ${linkId}`);
        return res.status(404).json({ error: 'Session not found' });
    }
    
    try {
        console.log(`📊 Status request for session ${linkId}`);
        
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
        
        const conflictStats = conflictResolver.getConflictStats(linkId);
        const currentController = conflictResolver.getCurrentController(linkId);
        
        // NOWE: Dodaj authorization stats
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
            // NOWE: Authorization info
            authStats: authStats,
            emergencyMode: authStats?.emergencyMode || false
        });
        
    } catch (error) {
        console.error('❌ Status error:', error.response?.data || error.message);
        
        // Fallback response
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
// ===== STATUS SESJI (ROZSZERZONY) =====
app.get('/api/status/:linkId', async (req, res) => {
    const { linkId } = req.params;
    const session = activeSessions.get(linkId);
    
    if (!session) {
        console.log(`❌ Status request for non-existent session: ${linkId}`);
        return res.status(404).json({ error: 'Session not found' });
    }
    
    try {
        console.log(`📊 Status request for session ${linkId}`);
        
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
            }
        });
        
    } catch (error) {
        console.error('❌ Status error:', error.response?.data || error.message);
        
        // Fallback response
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
            }
        });
    }
});

// ===== NOWE: DEBUG ENDPOINT =====
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
                originalVolume: pendingChange.originalVolume,
                isConflictResolution: pendingChange.isConflictResolution,
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

// ===== STRONA KONTROLI SĄSIADA =====
app.get('/control/:linkId', (req, res) => {
    console.log(`🎮 Control page request for session: ${req.params.linkId}`);
    res.sendFile(path.join(__dirname, 'public', 'neighbor.html'));
});

// ===== GŁÓWNA STRONA =====
app.get('/', (req, res) => {
    console.log('🏠 Main page request');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== WEBSOCKET =====
io.on('connection', (socket) => {
    console.log('🔌 New WebSocket client connected');
    
    socket.on('join_session', (linkId) => {
        socket.join(`session_${linkId}`);
        console.log(`👥 Client joined session: ${linkId}`);
        
        // Send current session state
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
        console.log('❌ WebSocket client disconnected');
    });
    
    socket.on('ping_session', (linkId) => {
        // Health check for session
        const session = activeSessions.get(linkId);
        socket.emit('pong_session', {
            linkId,
            exists: !!session,
            timestamp: Date.now()
        });
    });
});

// ===== START SERWERA =====
server.listen(PORT, () => {
    console.log(`🎵 NeighborlyVolume server running on port ${PORT}`);
    console.log(`🔗 Main app: ${BASE_URL}`);
    console.log(`🎛️ Example control: ${BASE_URL}/control/demo123`);
    console.log(`⚙️ Rate limiting: 5 changes per minute per user`);
    console.log(`🔄 Debouncing: 300ms delay for all changes`);
    console.log(`⚠️ Conflict detection: 5 second window`);
    console.log(`🧪 Debug endpoint: ${BASE_URL}/api/debug/[linkId]`);
});

// ===== HELPER FUNCTIONS =====

// Cleanup old sessions
setInterval(() => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let cleanedCount = 0;
    
    for (const [linkId, session] of activeSessions.entries()) {
        if (session.createdAt < oneDayAgo) {
            activeSessions.delete(linkId);
            cleanedCount++;
            console.log(`🧹 Cleaned up old session: ${linkId}`);
        }
    }
    
    if (cleanedCount > 0) {
        console.log(`🧹 Cleanup completed: ${cleanedCount} old sessions removed`);
    }
}, 60 * 60 * 1000); // Check every hour

// Cleanup old rate limiter data
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
}, 30 * 60 * 1000); // Check every 30 minutes

// Health check endpoint
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
// ===== NOWY ENDPOINT: JOIN PAGE =====
app.get('/join/:inviteCode', (req, res) => {
    const { inviteCode } = req.params;
    
    // Sprawdź czy kod istnieje
    let validInvite = null;
    for (const [linkId, sessionAuth] of neighborAuthorizations.entries()) {
        const invite = sessionAuth.pendingInvites.get(inviteCode);
        if (invite && !invite.used && invite.expiresAt > Date.now()) {
            validInvite = { linkId, invite };
            break;
        }
    }
    
    if (!validInvite) {
        // Strona błędu dla nieprawidłowego kodu
        res.send(`
            <!DOCTYPE html>
            <html><head><title>Invalid Invite</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1>❌ Invalid Invite Code</h1>
                <p>This invite code is invalid, expired, or already used.</p>
                <p>Please ask your neighbor for a new invite.</p>
            </body></html>
        `);
        return;
    }
    
    // Prosta strona join
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Join NeighborlyVolume</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: Arial; text-align: center; padding: 20px; background: #1DB954; color: white; }
                .container { max-width: 400px; margin: 0 auto; background: rgba(0,0,0,0.2); padding: 30px; border-radius: 15px; }
                input { width: 100%; padding: 15px; margin: 10px 0; border: none; border-radius: 8px; font-size: 16px; }
                button { background: white; color: #1DB954; padding: 15px 30px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; width: 100%; }
                button:hover { background: #f0f0f0; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🎵 NeighborlyVolume</h1>
                <h2>Join as ${validInvite.invite.neighborName}</h2>
                <p>You've been invited to control your neighbor's music volume!</p>
                
                <input type="text" id="neighborId" placeholder="Your device name (e.g., John's Phone)" required>
                <button onclick="joinSession()">Join Session</button>
                
                <div id="status" style="margin-top: 20px;"></div>
            </div>
            
            <script>
                async function joinSession() {
                    const neighborId = document.getElementById('neighborId').value;
                    if (!neighborId.trim()) {
                        alert('Please enter your device name');
                        return;
                    }
                    
                    document.getElementById('status').innerHTML = '⏳ Joining...';
                    
                    try {
                        const response = await fetch('/api/join-session', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                inviteCode: '${inviteCode}',
                                neighborId: neighborId,
                                neighborDeviceInfo: { userAgent: navigator.userAgent }
                            })
                        });
                        
                        const data = await response.json();
                        
                        if (data.success) {
                            document.getElementById('status').innerHTML = '✅ Success! Redirecting...';
                            window.location.href = data.redirectUrl + '?neighborId=' + encodeURIComponent(neighborId);
                        } else {
                            document.getElementById('status').innerHTML = '❌ ' + data.error;
                        }
                    } catch (error) {
                        document.getElementById('status').innerHTML = '❌ Connection error';
                    }
                }
                
                // Enter key submit
                document.getElementById('neighborId').addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') joinSession();
                });
            </script>
        </body>
        </html>
    `);
});
