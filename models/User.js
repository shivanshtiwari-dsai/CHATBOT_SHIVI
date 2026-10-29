/**
 * SHIVI AI — USER MONGOOSE MODEL
 * 
 * Manages user accounts, authentication profiles, plan tiers,
 * and synchronized UI/voice/AI preferences across devices.
 */

const mongoose = require('mongoose');

const UserSettingsSchema = new mongoose.Schema({
    theme: { type: String, default: 'midnight' },
    font: { type: String, default: 'poppins' },
    persona: { type: String, default: 'companion' },
    sfxEnabled: { type: Boolean, default: true },
    voiceEnabled: { type: Boolean, default: true },
    speechRate: { type: Number, default: 1.0 },
    sfxVolume: { type: Number, default: 0.5 },
    brainProvider: { type: String, default: 'builtin' },
    imageProvider: { type: String, default: 'pollinations' },
    imageApiKey: { type: String, default: '' },
    defaultImageStyle: { type: String, default: 'vivid' },
    defaultImageSize: { type: String, default: '1024x1024' },
    customThemeColors: { type: mongoose.Schema.Types.Mixed, default: {} },
    systemInstructions: { type: String, default: '' },
    apiKeys: { type: mongoose.Schema.Types.Mixed, default: {} },
    apiModels: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false });

const UserSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    passwordHash: {
        type: String,
        default: ''
    },
    salt: {
        type: String,
        default: ''
    },
    provider: {
        type: String,
        enum: ['email', 'google', 'github', 'guest', 'demo'],
        default: 'email'
    },
    avatar: {
        type: String,
        default: 'U'
    },
    plan: {
        type: String,
        enum: ['free', 'pro', 'enterprise', 'creator'],
        default: 'free'
    },
    settings: {
        type: UserSettingsSchema,
        default: () => ({})
    },
    lastLoginAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'users'
});

// Method to sanitize user object for client consumption
UserSchema.methods.toSafeJSON = function () {
    const obj = this.toObject();
    delete obj.passwordHash;
    delete obj.salt;
    delete obj.__v;
    return obj;
};

// Schema indexes are declared inline with unique/index properties

const User = mongoose.models.User || mongoose.model('User', UserSchema);

module.exports = User;
