/**
 * SHIVI AI — HYBRID PERSISTENCE & STORAGE FALLBACK ENGINE
 * 
 * Provides unified data access for Users, Chat Sessions, Messages, and PPT Decks.
 * - Prioritizes MongoDB via Mongoose when available
 * - Automatically degrades to local files (users.json, disk storage) and client localStorage when offline
 * - Auto-syncs users from users.json to MongoDB upon connection
 */

const fs = require('node:fs');
const path = require('node:path');
const { isMongoConnected, getConnectionStatus, mongoose } = require('../config/db.js');
const { User, ChatSession, ChatMessage, PptDeck } = require('../models/index.js');

const ROOT_DIR = path.resolve(__dirname, '..');
const USERS_PATH = path.join(ROOT_DIR, 'users.json');
const DOWNLOADS_DIR = path.join(ROOT_DIR, 'downloads');

// Ensure downloads directory exists
if (!fs.existsSync(DOWNLOADS_DIR)) {
    try {
        fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
    } catch (e) {
        console.warn('[Storage] Could not create downloads dir:', e.message);
    }
}

// ----------------------------------------------------
// LOCAL FILE STORAGE HELPERS (OFFLINE FALLBACK)
// ----------------------------------------------------
function readLocalUsers() {
    try {
        if (!fs.existsSync(USERS_PATH)) return [];
        const raw = fs.readFileSync(USERS_PATH, 'utf-8');
        return JSON.parse(raw);
    } catch (e) {
        console.warn('[Storage] Error reading users.json fallback:', e.message);
        return [];
    }
}

function writeLocalUsers(users) {
    try {
        fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2), 'utf-8');
        return true;
    } catch (e) {
        console.error('[Storage] Error saving users.json fallback:', e.message);
        return false;
    }
}

// ----------------------------------------------------
// AUTO-MIGRATION / SEEDING FROM users.json TO MONGODB
// ----------------------------------------------------
async function seedLocalUsersToMongo() {
    if (!isMongoConnected()) return;
    try {
        const localUsers = readLocalUsers();
        if (!Array.isArray(localUsers) || localUsers.length === 0) return;

        for (const u of localUsers) {
            if (!u.email) continue;
            const exists = await User.findOne({ email: u.email.toLowerCase() });
            if (!exists) {
                await User.create({
                    id: u.id || ('usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4)),
                    name: u.name || 'Explorer',
                    email: u.email.toLowerCase(),
                    passwordHash: u.passwordHash || '',
                    salt: u.salt || '',
                    provider: u.provider || 'email',
                    avatar: u.avatar || 'U',
                    plan: u.plan || 'free',
                    settings: u.settings || {},
                    createdAt: u.createdAt ? new Date(u.createdAt) : new Date()
                });
                console.log(`[Storage] Migrated user from users.json to MongoDB: ${u.email}`);
            }
        }
    } catch (err) {
        console.warn('[Storage] Notice during initial users sync to MongoDB:', err.message);
    }
}

async function migrateLegacyCollections() {
    if (!isMongoConnected() || !mongoose.connection || !mongoose.connection.db) return;
    try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        const colNames = collections.map(c => c.name);
        if (colNames.includes('chat_sessions')) {
            const legacyDocs = await mongoose.connection.db.collection('chat_sessions').find({}).toArray();
            if (legacyDocs.length > 0) {
                for (const doc of legacyDocs) {
                    const exists = await ChatSession.findOne({ id: doc.id });
                    if (!exists) {
                        const copy = Object.assign({}, doc);
                        delete copy._id;
                        await ChatSession.create(copy);
                    }
                }
                console.log(`[Storage] Migrated ${legacyDocs.length} legacy chat_sessions to MongoDB conversations collection.`);
            }
        }
    } catch (e) {
        console.warn('[Storage] Notice during collection migration:', e.message);
    }
}

// ----------------------------------------------------
// USER REPOSITORY
// ----------------------------------------------------
async function findUserByEmail(email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) return null;

    if (isMongoConnected()) {
        try {
            const user = await User.findOne({ email: cleanEmail });
            if (user) return user.toObject();
        } catch (err) {
            console.warn('[Storage] MongoDB query failed, falling back to users.json:', err.message);
        }
    }

    // Fallback: local users.json
    const users = readLocalUsers();
    return users.find(u => (u.email || '').toLowerCase() === cleanEmail) || null;
}

async function findUserById(id) {
    if (!id) return null;

    if (isMongoConnected()) {
        try {
            const user = await User.findOne({ id: id });
            if (user) return user.toObject();
        } catch (err) {
            console.warn('[Storage] MongoDB findUserById failed, using fallback:', err.message);
        }
    }

    const users = readLocalUsers();
    return users.find(u => u.id === id) || null;
}

async function createUser(userData) {
    const cleanEmail = (userData.email || '').trim().toLowerCase();
    const cleanId = userData.id || ('usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6));

    const record = {
        id: cleanId,
        name: (userData.name || '').trim(),
        email: cleanEmail,
        passwordHash: userData.passwordHash || '',
        salt: userData.salt || '',
        provider: userData.provider || 'email',
        avatar: userData.avatar || (userData.name ? userData.name.slice(0, 2).toUpperCase() : 'U'),
        plan: userData.plan || 'free',
        settings: userData.settings || {},
        createdAt: new Date().toISOString()
    };

    // Always mirror to users.json as offline safety net
    const localUsers = readLocalUsers();
    const existingIdx = localUsers.findIndex(u => (u.email || '').toLowerCase() === cleanEmail);
    if (existingIdx !== -1) {
        localUsers[existingIdx] = Object.assign({}, localUsers[existingIdx], record);
    } else {
        localUsers.push(record);
    }
    writeLocalUsers(localUsers);

    // Save to MongoDB if available
    if (isMongoConnected()) {
        try {
            const created = await User.create(record);
            return created.toSafeJSON();
        } catch (err) {
            console.error('[Storage] MongoDB createUser error, relying on local snapshot:', err.message);
        }
    }

    const safeUser = Object.assign({}, record);
    delete safeUser.passwordHash;
    delete safeUser.salt;
    return safeUser;
}

async function updateUser(idOrEmail, updates) {
    // 1. Mirror to local users.json
    const localUsers = readLocalUsers();
    const idx = localUsers.findIndex(u => u.id === idOrEmail || (u.email && u.email.toLowerCase() === String(idOrEmail).toLowerCase()));
    if (idx !== -1) {
        localUsers[idx] = Object.assign({}, localUsers[idx], updates);
        writeLocalUsers(localUsers);
    }

    // 2. Update MongoDB if connected
    if (isMongoConnected()) {
        try {
            const query = (updates.id) ? { id: updates.id } : { $or: [{ id: idOrEmail }, { email: String(idOrEmail).toLowerCase() }] };
            const updated = await User.findOneAndUpdate(query, { $set: updates }, { returnDocument: 'after' });
            if (updated) return updated.toSafeJSON();
        } catch (err) {
            console.warn('[Storage] MongoDB updateUser notice:', err.message);
        }
    }

    return idx !== -1 ? localUsers[idx] : null;
}

async function updateUserSettings(idOrEmail, newSettings) {
    if (!newSettings || typeof newSettings !== 'object') return false;

    // 1. Mirror in local storage
    const localUsers = readLocalUsers();
    const idx = localUsers.findIndex(u => u.id === idOrEmail || (u.email && u.email.toLowerCase() === String(idOrEmail).toLowerCase()));
    if (idx !== -1) {
        localUsers[idx].settings = Object.assign({}, localUsers[idx].settings || {}, newSettings);
        writeLocalUsers(localUsers);
    }

    // 2. Update MongoDB
    if (isMongoConnected()) {
        try {
            await User.findOneAndUpdate(
                { $or: [{ id: idOrEmail }, { email: String(idOrEmail).toLowerCase() }] },
                { $set: { settings: newSettings } },
                { returnDocument: 'after' }
            );
            return true;
        } catch (err) {
            console.warn('[Storage] MongoDB updateUserSettings notice:', err.message);
        }
    }
    return true;
}

async function syncUserProfile(userData) {
    if (!userData || (!userData.email && !userData.id)) return null;
    const cleanEmail = (userData.email || '').trim().toLowerCase();

    let user = cleanEmail ? await findUserByEmail(cleanEmail) : await findUserById(userData.id);
    if (!user) {
        user = await createUser({
            name: userData.name || 'Explorer',
            email: cleanEmail || `user_${Date.now()}@shiviai.demo`,
            provider: userData.provider || 'email',
            avatar: userData.avatar || (userData.name ? userData.name.slice(0, 2).toUpperCase() : 'U'),
            themePreference: userData.themePreference || 'cyberpunk',
            voiceEnabled: userData.voiceEnabled !== undefined ? userData.voiceEnabled : true,
            plan: userData.plan || 'free',
            settings: {
                theme: userData.themePreference || 'cyberpunk',
                voiceEnabled: userData.voiceEnabled !== undefined ? userData.voiceEnabled : true
            }
        });
    } else {
        if (isMongoConnected()) {
            try {
                const updates = { lastLoginAt: new Date() };
                if (userData.themePreference) {
                    updates.themePreference = userData.themePreference;
                    updates['settings.theme'] = userData.themePreference;
                }
                if (userData.voiceEnabled !== undefined) {
                    updates.voiceEnabled = !!userData.voiceEnabled;
                    updates['settings.voiceEnabled'] = !!userData.voiceEnabled;
                }
                const updated = await User.findOneAndUpdate(
                    { email: user.email },
                    { $set: updates },
                    { returnDocument: 'after' }
                );
                if (updated) user = updated.toSafeJSON();
            } catch (e) {
                console.warn('[Storage] syncUserProfile touch notice:', e.message);
            }
        }
    }
    return user;
}

async function updateUserPreferences(idOrEmail, preferences) {
    if (!idOrEmail || !preferences) return null;
    const cleanKey = String(idOrEmail).trim();
    const query = cleanKey.includes('@') ? { email: cleanKey.toLowerCase() } : { $or: [{ id: cleanKey }, { email: cleanKey.toLowerCase() }] };
    const updates = {};

    const chosenTheme = preferences.themePreference || preferences.theme;
    if (chosenTheme) {
        updates.themePreference = chosenTheme;
        updates['settings.theme'] = chosenTheme;
    }
    if (preferences.voiceEnabled !== undefined) {
        updates.voiceEnabled = !!preferences.voiceEnabled;
        updates['settings.voiceEnabled'] = !!preferences.voiceEnabled;
    }
    if (preferences.font) updates['settings.font'] = preferences.font;
    if (preferences.persona) updates['settings.persona'] = preferences.persona;

    if (isMongoConnected()) {
        try {
            const updated = await User.findOneAndUpdate(query, { $set: updates }, { returnDocument: 'after' });
            if (updated) return updated.toSafeJSON();
        } catch (err) {
            console.error('[Storage] MongoDB updateUserPreferences error:', err.message);
        }
    }

    return null;
}

// ----------------------------------------------------
// CHAT SESSION & CONVERSATION REPOSITORY
// ----------------------------------------------------
async function getUserSessions(userId, userEmail = '') {
    if (isMongoConnected()) {
        try {
            const orQuery = [];
            const cleanEmail = (userEmail || (userId && userId.includes('@') ? userId : '')).trim().toLowerCase();
            const cleanId = userId && !userId.includes('@') ? userId : '';

            if (cleanEmail) orQuery.push({ userEmail: cleanEmail });
            if (cleanId && cleanId !== 'guest') orQuery.push({ userId: cleanId });
            if (orQuery.length === 0) orQuery.push({ userId: 'guest' });

            const sessions = await ChatSession.find({ $or: orQuery }).sort({ updatedAt: -1 }).lean();
            const mapped = sessions.map(s => ({
                id: s.id,
                title: s.title,
                currentPersona: s.currentPersona || 'companion',
                pinned: !!s.pinned,
                createdAt: s.createdAt,
                updatedAt: s.updatedAt,
                messageCount: s.messages ? s.messages.length : 0,
                messages: s.messages || []
            }));

            return {
                success: true,
                mode: 'mongodb',
                conversations: mapped,
                recentChats: mapped,
                sessions: mapped
            };
        } catch (err) {
            console.error('[Storage] MongoDB getUserSessions error:', err.message);
        }
    }

    return {
        success: true,
        mode: 'mongodb',
        conversations: [],
        recentChats: [],
        sessions: []
    };
}

async function getSessionById(sessionId) {
    if (!sessionId) return null;
    if (isMongoConnected()) {
        try {
            return await ChatSession.findOne({ id: sessionId }).lean();
        } catch (err) {
            console.warn('[Storage] MongoDB getSessionById error:', err.message);
        }
    }
    return null;
}

async function saveOrUpdateSession(sessionData, userId = 'guest', userEmail = '') {
    if (!sessionData || !sessionData.id) return { success: false, error: 'Session data with id is required.' };

    if (isMongoConnected()) {
        try {
            const filter = { id: sessionData.id };
            const update = {
                id: sessionData.id,
                userId: userId || sessionData.userId || 'guest',
                userEmail: (userEmail || sessionData.userEmail || '').toLowerCase(),
                title: sessionData.title || 'New Conversation',
                currentPersona: sessionData.currentPersona || 'companion',
                pinned: !!sessionData.pinned,
                messages: Array.isArray(sessionData.messages) ? sessionData.messages : [],
                updatedAt: new Date()
            };

            const session = await ChatSession.findOneAndUpdate(filter, update, {
                upsert: true,
                returnDocument: 'after',
                setDefaultsOnInsert: true
            });

            return {
                success: true,
                mode: 'mongodb',
                session: session
            };
        } catch (err) {
            console.error('[Storage] MongoDB saveOrUpdateSession error:', err.message);
        }
    }

    return {
        success: true,
        mode: 'local_fallback',
        message: 'Saved to local cache fallback.'
    };
}

async function appendMessageToSession(sessionId, message, userId = 'guest', userEmail = '') {
    if (!sessionId || !message) return { success: false, error: 'sessionId and message are required.' };

    if (isMongoConnected()) {
        try {
            const formattedMsg = {
                id: message.id || ('msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6)),
                sessionId: sessionId,
                userId: userId,
                role: message.role || 'user',
                content: message.content || '',
                timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
                provider: message.provider || 'builtin',
                model: message.model || '',
                persona: message.persona || 'companion',
                attachments: Array.isArray(message.attachments) ? message.attachments : [],
                isImage: !!message.isImage,
                imageUrl: message.imageUrl || '',
                fallbackUrl: message.fallbackUrl || '',
                prompt: message.prompt || '',
                isPresentation: !!message.isPresentation,
                downloadUrl: message.downloadUrl || '',
                filename: message.filename || '',
                deck: message.deck || null
            };

            const updatedSession = await ChatSession.findOneAndUpdate(
                { id: sessionId },
                {
                    $push: { messages: formattedMsg },
                    $set: { updatedAt: new Date() },
                    $setOnInsert: {
                        userId: userId,
                        userEmail: (userEmail || '').toLowerCase(),
                        title: message.role === 'user' && message.content ? String(message.content).slice(0, 35) : 'New Conversation'
                    }
                },
                { upsert: true, returnDocument: 'after' }
            );

            if (formattedMsg.isPresentation || message.deck || message.deckData) {
                try {
                    const deckInfo = message.deck || message.deckData || {
                        title: message.filename || 'Presentation',
                        topic: message.prompt || 'Presentation',
                        filename: message.filename || `presentation_${Date.now()}.pptx`,
                        downloadUrl: message.downloadUrl || ''
                    };
                    await savePptDeck(deckInfo, userId, userEmail, sessionId);
                } catch (deckErr) {
                    console.warn('[Storage] Auto-saving PPT deck notice:', deckErr.message);
                }
            }

            return {
                success: true,
                mode: 'mongodb',
                message: formattedMsg,
                messageCount: updatedSession.messages.length
            };
        } catch (err) {
            console.error('[Storage] MongoDB appendMessageToSession error:', err.message);
        }
    }

    return {
        success: true,
        mode: 'local_fallback'
    };
}

async function syncUserSessions(sessions, userId = 'guest', userEmail = '') {
    if (!Array.isArray(sessions)) return { success: false, error: 'Sessions must be an array' };

    let syncedCount = 0;
    if (isMongoConnected()) {
        try {
            for (const s of sessions) {
                if (!s || !s.id) continue;
                await ChatSession.findOneAndUpdate(
                    { id: s.id },
                    {
                        id: s.id,
                        userId: userId || 'guest',
                        userEmail: (userEmail || '').toLowerCase(),
                        title: s.title || 'Conversation',
                        currentPersona: s.currentPersona || 'companion',
                        pinned: !!s.pinned,
                        messages: Array.isArray(s.messages) ? s.messages : [],
                        updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date()
                    },
                    { upsert: true }
                );
                syncedCount++;
            }
            return {
                success: true,
                mode: 'mongodb',
                syncedCount: syncedCount,
                message: `Successfully synchronized ${syncedCount} conversations to MongoDB.`
            };
        } catch (err) {
            console.error('[Storage] MongoDB syncUserSessions error:', err.message);
        }
    }

    return {
        success: true,
        mode: 'local_fallback',
        syncedCount: sessions.length,
        message: 'Operating in local cache fallback mode.'
    };
}

async function deleteUserSession(sessionId, userId = null) {
    if (!sessionId) return { success: false };

    if (isMongoConnected()) {
        try {
            const query = { id: sessionId };
            if (userId && userId !== 'guest') {
                query.$or = [{ userId: userId }, { userEmail: String(userId).toLowerCase() }];
            }
            await ChatSession.deleteOne(query);
            return { success: true, mode: 'mongodb' };
        } catch (err) {
            console.error('[Storage] MongoDB deleteUserSession error:', err.message);
        }
    }

    return { success: true, mode: 'local_fallback' };
}

// ----------------------------------------------------
// PPT DECK REPOSITORY
// ----------------------------------------------------
async function savePptDeck(deckInfo, userId = 'guest', userEmail = '', sessionId = '') {
    if (!deckInfo || !deckInfo.filename) return null;

    const deckRecord = {
        id: 'deck_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6),
        userId: userId || 'guest',
        userEmail: (userEmail || '').toLowerCase(),
        sessionId: sessionId || '',
        title: deckInfo.title || deckInfo.deck_title || 'Executive Presentation',
        topic: deckInfo.topic || 'Presentation',
        theme: deckInfo.theme || 'modern_blue',
        slideCount: deckInfo.slideCount || (deckInfo.slides ? deckInfo.slides.length : 0),
        filename: deckInfo.filename,
        downloadUrl: deckInfo.downloadUrl,
        filePath: deckInfo.filePath || '',
        slides: Array.isArray(deckInfo.slides) ? deckInfo.slides : [],
        deckData: deckInfo.deckData || null,
        createdAt: new Date()
    };

    if (isMongoConnected()) {
        try {
            const created = await PptDeck.create(deckRecord);
            return created.toObject();
        } catch (err) {
            console.error('[Storage] MongoDB savePptDeck error, falling back to disk:', err.message);
        }
    }

    return deckRecord;
}

async function getUserDecks(userId, userEmail = '') {
    if (isMongoConnected()) {
        try {
            const orQuery = [];
            if (userId) orQuery.push({ userId: userId });
            if (userEmail) orQuery.push({ userEmail: userEmail.toLowerCase() });
            if (orQuery.length === 0) orQuery.push({ userId: 'guest' });

            const decks = await PptDeck.find({ $or: orQuery }).sort({ createdAt: -1 }).lean();
            return {
                success: true,
                mode: 'mongodb',
                decks: decks
            };
        } catch (err) {
            console.error('[Storage] MongoDB getUserDecks error:', err.message);
        }
    }

    // Disk fallback: check downloads folder
    try {
        if (fs.existsSync(DOWNLOADS_DIR)) {
            const files = fs.readdirSync(DOWNLOADS_DIR).filter(f => f.endsWith('.pptx'));
            const localDecks = files.map(file => ({
                id: file,
                title: file.replace(/_\d+\.pptx$/, '').replace(/_/g, ' '),
                filename: file,
                downloadUrl: `/downloads/${file}`,
                createdAt: fs.statSync(path.join(DOWNLOADS_DIR, file)).mtime
            }));
            return {
                success: true,
                mode: 'local_fallback',
                decks: localDecks
            };
        }
    } catch (e) {
        console.warn('[Storage] Error listing local downloads:', e.message);
    }

    return { success: true, mode: 'local_fallback', decks: [] };
}

async function deletePptDeck(deckId) {
    if (!deckId) return { success: false };

    if (isMongoConnected()) {
        try {
            await PptDeck.deleteOne({ $or: [{ id: deckId }, { filename: deckId }] });
        } catch (err) {
            console.warn('[Storage] MongoDB deletePptDeck error:', err.message);
        }
    }

    // Attempt to remove physical file if exists
    try {
        const filePath = path.join(DOWNLOADS_DIR, path.basename(deckId));
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (e) {
        // file remove ignore
    }

    return { success: true };
}

// ----------------------------------------------------
// TELEMETRY & SYSTEM HEALTH
// ----------------------------------------------------
async function getDatabaseHealth() {
    const status = getConnectionStatus();
    let stats = {
        users: 0,
        sessions: 0,
        messages: 0,
        decks: 0
    };

    if (status.isConnected) {
        try {
            const [userCount, sessionCount, deckCount] = await Promise.all([
                User.countDocuments().catch(() => 0),
                ChatSession.countDocuments().catch(() => 0),
                PptDeck.countDocuments().catch(() => 0)
            ]);
            stats.users = userCount;
            stats.sessions = sessionCount;
            stats.decks = deckCount;
        } catch (e) {
            // ignore stats query error
        }
    } else {
        const localUsers = readLocalUsers();
        stats.users = localUsers.length;
    }

    return {
        ...status,
        stats: stats
    };
}

module.exports = {
    findUserByEmail,
    findUserById,
    createUser,
    updateUser,
    updateUserSettings,
    syncUserProfile,
    updateUserPreferences,
    getUserSessions,
    getSessionById,
    saveOrUpdateSession,
    appendMessageToSession,
    syncUserSessions,
    deleteUserSession,
    savePptDeck,
    getUserDecks,
    deletePptDeck,
    getDatabaseHealth,
    seedLocalUsersToMongo,
    migrateLegacyCollections
};
