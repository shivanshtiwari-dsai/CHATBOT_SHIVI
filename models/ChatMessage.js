/**
 * SHIVI AI — CHAT MESSAGE MONGOOSE SCHEMA & MODEL
 * 
 * Stores individual turns of conversation including rich attachments,
 * generated imagery, presentation metadata, and multi-provider telemetry.
 */

const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
    id: {
        type: String,
        default: () => 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7)
    },
    sessionId: {
        type: String,
        index: true,
        default: ''
    },
    userId: {
        type: String,
        index: true,
        default: 'guest'
    },
    role: {
        type: String,
        enum: ['user', 'assistant', 'system'],
        required: true
    },
    content: {
        type: String,
        default: ''
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    provider: {
        type: String,
        default: 'builtin'
    },
    model: {
        type: String,
        default: ''
    },
    persona: {
        type: String,
        default: 'companion'
    },
    attachments: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },
    isImage: {
        type: Boolean,
        default: false
    },
    imageUrl: {
        type: String,
        default: ''
    },
    fallbackUrl: {
        type: String,
        default: ''
    },
    prompt: {
        type: String,
        default: ''
    },
    isPresentation: {
        type: Boolean,
        default: false
    },
    downloadUrl: {
        type: String,
        default: ''
    },
    filename: {
        type: String,
        default: ''
    },
    deck: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    }
}, {
    timestamps: true
});

ChatMessageSchema.index({ sessionId: 1, timestamp: 1 });
ChatMessageSchema.index({ userId: 1, timestamp: -1 });

const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', ChatMessageSchema);

module.exports = {
    ChatMessage,
    ChatMessageSchema
};
