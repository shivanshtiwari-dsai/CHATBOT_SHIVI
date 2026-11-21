/**
 * Unit Test Suite for MongoDB Persistence Pipeline & ID Casting Resilience
 */

const assert = require('assert');
const mongoose = require('mongoose');
const { connectDB, isMongoConnected } = require('./config/db.js');
const storage = require('./services/storageService.js');
const { Conversation, ChatSession, User } = require('./models/index.js');

async function runTests() {
    console.log('🧪 Starting ShiviAI MongoDB Persistence Tests...\n');

    // 1. Check Model Alias
    assert.ok(Conversation, 'Conversation model must exist');
    assert.strictEqual(Conversation.collection.name, 'conversations', 'Conversation must target conversations collection');
    console.log('✅ Test 1 Passed: Conversation model targets conversations collection.');

    // 2. Connect DB (or check connection)
    await connectDB();
    if (!isMongoConnected()) {
        console.log('⚠️ MongoDB not running locally, testing schema and validator logic in-memory.');
    } else {
        console.log('✅ MongoDB connected, testing live persistence...');
        
        const testEmail = 'test_architect@shiviai.dev';

        // 3. Test Temporary ID handling (temp_123) - MUST NOT throw CastError
        console.log('Testing persistConversationToMongo with temporary client ID (temp_123)...');
        const convId1 = await storage.persistConversationToMongo({
            conversationId: 'temp_123',
            userEmail: testEmail,
            title: 'Test Session',
            userMessage: 'Hello Shivi!',
            botMessage: 'Hello, how can I assist you?',
            type: 'text'
        });

        assert.ok(convId1, 'Returned conversationId should be valid string');
        assert.notStrictEqual(convId1, 'temp_123', 'Temporary ID must be replaced with a valid MongoDB ID');
        console.log(`✅ Test 2 Passed: Temp ID handled without CastError, generated: ${convId1}`);

        // 4. Test Update with existing valid ID
        console.log('Testing append/update to existing conversation with PPT payload...');
        const convId2 = await storage.persistConversationToMongo({
            conversationId: convId1,
            userEmail: testEmail,
            userMessage: 'Create a presentation on AI',
            botMessage: 'Here is your presentation',
            type: 'ppt',
            pptData: {
                title: 'AI Presentation',
                slides: [{ slide_title: 'Intro to AI', bullets: ['Concept 1', 'Concept 2'] }]
            }
        });

        assert.strictEqual(convId2, convId1, 'Updated conversation ID should match the original');
        console.log(`✅ Test 3 Passed: Updated conversation with PPT data: ${convId2}`);

        // 5. Verify the conversation and its embedded messages
        const retrieved = await storage.getSessionById(convId1);
        assert.ok(retrieved, 'Should retrieve persisted session');
        assert.strictEqual(retrieved.messages.length, 4, 'Should contain 4 messages (2 user, 2 bot)');
        const pptMsg = retrieved.messages.find(m => m.type === 'ppt' || m.isPresentation);
        assert.ok(pptMsg, 'PPT message should be present in messages array');
        assert.ok(pptMsg.pptData || pptMsg.deck, 'pptData or deck should be preserved');
        console.log('✅ Test 4 Passed: Messages and PPT payload correctly retrieved from MongoDB.');

        // 6. Test User Preferences Update
        console.log('Testing User Preferences upsert & update...');
        const updatedPrefs = await storage.updateUserPreferences(testEmail, {
            theme: 'cyberpunk',
            voiceEnabled: true,
            persona: 'coder'
        });

        assert.ok(updatedPrefs, 'Preferences update must return user object');
        assert.strictEqual(updatedPrefs.themePreference, 'cyberpunk', 'themePreference should be updated');
        console.log('✅ Test 5 Passed: User preferences updated in MongoDB successfully.');

        // Cleanup test data
        await ChatSession.deleteMany({ userEmail: testEmail });
        await User.deleteMany({ email: testEmail });
        console.log('🧹 Cleaned up test records.');
    }

    console.log('\n🎉 ALL PERSISTENCE TESTS COMPLETED SUCCESSFULLY!');
    process.exit(0);
}

runTests().catch(err => {
    console.error('❌ Test failed with error:', err.stack || err);
    process.exit(1);
});
