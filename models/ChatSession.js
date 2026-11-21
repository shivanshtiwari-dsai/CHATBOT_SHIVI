/**
 * SHIVI AI — CHAT SESSION / CONVERSATION MONGOOSE MODEL
 * 
 * Manages conversational threads, persistent session state,
 * and embedded message records for rapid retrieval and indexing.
 */

const mongoose = require('mongoose');
const { ChatMessageSchema } = require('./ChatMessage.js');

const ChatSessionSchema = new mongoose.Schema({
    id: {
        type: String,
        required: false,
        default: () => 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7),
        index: true,
        sparse: true
    },
    userId: {
        type: String,
        default: 'guest',
        index: true
    },
    userEmail: {
        type: String,
        index: true,
        default: '',
        lowercase: true,
        trim: true
    },
    title: {
        type: String,
        default: 'New Conversation',
        trim: true
    },
    currentPersona: {
        type: String,
        default: 'companion'
    },
    pinned: {
        type: Boolean,
        default: false
    },
    messages: {
        type: [ChatMessageSchema],
        default: []
    },
    messageCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    collection: 'conversations'
});

// Update message count and updatedAt before saving
ChatSessionSchema.pre('save', function () {
    if (this.messages) {
        this.messageCount = this.messages.length;
    }
});

// Compound indexes for rapid user session listing & sorting
ChatSessionSchema.index({ userId: 1, updatedAt: -1 });
ChatSessionSchema.index({ userEmail: 1, updatedAt: -1 });
ChatSessionSchema.index({ id: 1, userId: 1 });

const ChatSession = mongoose.models.ChatSession || mongoose.model('ChatSession', ChatSessionSchema);
const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', ChatSessionSchema);

module.exports = ChatSession;
module.exports.ChatSession = ChatSession;
module.exports.Conversation = Conversation;
