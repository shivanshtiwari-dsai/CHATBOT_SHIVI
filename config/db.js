/**
 * SHIVI AI — MONGODB CONNECTION & DATABASE CONFIGURATION
 * 
 * Provides robust MongoDB connectivity via Mongoose with:
 * - Automatic connection retry & connection state monitoring
 * - Transparent Local Fallback detection when offline
 * - Connection telemetry & status endpoint reporting
 */

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shiviai_db';

let isConnected = false;
let connectionHost = '';

/**
 * Connect to MongoDB instance with timeout and fallback handling
 */
const connectDB = async (customUri = null) => {
    const uri = customUri || process.env.MONGO_URI || MONGO_URI;
    try {
        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 3500,
            connectTimeoutMS: 5000
        });
        isConnected = true;
        connectionHost = conn.connection.host;
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        isConnected = false;
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        console.warn('⚠️  ShiviAI running in Automatic Local Fallback Mode (using users.json and local storage).');
        return null;
    }
};

/**
 * Returns true if MongoDB connection is active and ready
 */
const isMongoConnected = () => {
    return isConnected && mongoose.connection.readyState === 1;
};

/**
 * Get comprehensive MongoDB connection health status
 */
const getConnectionStatus = () => {
    const readyState = mongoose.connection ? mongoose.connection.readyState : 0;
    const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    const rawUri = process.env.MONGO_URI || MONGO_URI;
    const maskedUri = rawUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');

    return {
        isConnected: readyState === 1,
        mode: readyState === 1 ? 'mongodb' : 'local_fallback',
        status: states[readyState] || 'unknown',
        readyState: readyState,
        host: connectionHost || (mongoose.connection && mongoose.connection.host) || '127.0.0.1',
        port: (mongoose.connection && mongoose.connection.port) || 27017,
        name: (mongoose.connection && mongoose.connection.name) || 'shiviai_db',
        uri: maskedUri
    };
};

// Monitor connection events
mongoose.connection.on('connected', () => {
    isConnected = true;
    connectionHost = mongoose.connection.host;
});

mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('⚠️ MongoDB Disconnected. Operating in Local Fallback Mode.');
});

mongoose.connection.on('reconnected', () => {
    isConnected = true;
    console.log('🔄 MongoDB Reconnected successfully.');
});

mongoose.connection.on('error', (err) => {
    isConnected = false;
    console.error(`❌ MongoDB Connection Error: ${err.message}`);
});

module.exports = {
    connectDB,
    isMongoConnected,
    getConnectionStatus,
    mongoose,
    MONGO_URI
};
module.exports.default = connectDB;
