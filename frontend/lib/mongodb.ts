import mongoose from "mongoose";

// This file verifies the connnection between our code and the MongoDB database, it's a singleton used in the whole app
// Will later refactor with C# to run a faster connection in the backend as well as a better connection to the database

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/productManagement";

if (!MONGO_URI) {
  throw new Error("Please define the MONGO_URI environment variable");
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
    console.log("Using cached database connection");
    return cached.conn;
  }

  if (!cached.promise) {
    console.log("Connecting to MongoDB...");
    cached.promise = mongoose
      .connect(MONGO_URI)
      .then((m) => {
        console.log("Successfully connected to MongoDB");
        return m;
      })
      .catch((error) => {
        console.error("Failed to connect to MongoDB:", error.message);
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    console.error("Error during database connection:", error);
    throw error;
  }
}

export default connectToDatabase;
