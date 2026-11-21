/**
 * SHIVI AI — MONGOOSE MODELS EXPORT REPOSITORY
 */

const User = require('./User.js');
const ChatSession = require('./ChatSession.js');
const Conversation = ChatSession.Conversation || ChatSession;
const { ChatMessage, ChatMessageSchema } = require('./ChatMessage.js');
const PptDeck = require('./PptDeck.js');

module.exports = {
    User,
    ChatSession,
    Conversation: Conversation || ChatSession,
    ChatMessage,
    ChatMessageSchema,
    PptDeck
};
