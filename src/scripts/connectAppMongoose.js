// scripts/connectAppMongoose.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

/**
 * Connects to MongoDB using environment variables
 * Works for both local and deployed setups.
 */
export async function connectAppMongoose() {
  const {
    MONGO_URI,
    MONGO_USER,
    MONGO_PASS,
    MONGO_HOST,
    MONGO_DB,
  } = process.env;

  // prefer full URI if available (simpler and safer)
  const uri = MONGO_URI
    ? MONGO_URI
    : `mongodb+srv://${encodeURIComponent(MONGO_USER)}:${encodeURIComponent(MONGO_PASS)}@${MONGO_HOST}/${MONGO_DB}?retryWrites=true&w=majority`;

  console.log('[mongo] Connecting with URI (masked):',
    uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:**@')
  );

  try {
    await mongoose.connect(uri, {
      dbName: MONGO_DB || 'atimp_mvp',
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅ Connected to MongoDB successfully');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
}