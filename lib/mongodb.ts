import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/productManagement';

if (!MONGO_URI) {
    throw new Error('Please define the MONGO_URI environment variable');
}

interface MongooseCache {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

let cached: MongooseCache = globalThis.mongoose as MongooseCache;

if (!cached) {
    cached = globalThis.mongoose = { conn: null, promise: null };
}

async function connectToDatabase(): Promise<typeof mongoose> {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGO_URI).then((m) => m);
    }

    cached.conn = await cached.promise;
    return cached.conn;
}

export default connectToDatabase;
