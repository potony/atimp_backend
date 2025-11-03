// db/connectDB.js
import mongoose from "mongoose";
import { config } from "./config.js";

// your Atlas host (from your screenshots)
const ATLAS_HOST = "cluster0.x8pbnz.mongodb.net";

// turn "mongodb://...cluster0-shard-00-00..." into "mongodb+srv://..."
function normalizeMongoUri(raw, fallbackDb = "treedb") {
  if (!raw || typeof raw !== "string") return "";

  // if it's already the good SRV form, just return it
  if (raw.startsWith("mongodb+srv://")) {
    return raw;
  }

  // if it's your shard-style URI -> rebuild as SRV
  // example you had:
  // mongodb://potony:9809...@cluster0-shard-00-00.x8pbnz.mongodb.net:27017,...
  if (raw.startsWith("mongodb://") && raw.includes("cluster0-shard-00-00")) {
    // parse username / password out of it
    // easiest: use URL
    try {
      const u = new URL(raw.replace("mongodb://", "http://")); // trick to parse
      const user = decodeURIComponent(u.username);
      const pass = decodeURIComponent(u.password);
      return `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(
        pass
      )}@${ATLAS_HOST}/${fallbackDb}?retryWrites=true&w=majority`;
    } catch (e) {
      // if parsing fails, just fall through
    }
  }

  // last resort: return as-is
  return raw;
}

export async function connectDB(passedUri) {
  // priority:
  // 1) explicit arg
  // 2) config.MONGO_URI
  // 3) process.env.MONGO_URI
  // 4) build from parts
  let raw =
    passedUri ||
    config?.MONGO_URI ||
    process.env.MONGO_URI ||
    "";

  // if we still don't have it, try to build from parts
  if (!raw) {
    const user = process.env.MONGO_USER || config?.MONGO_USER;
    const pass = process.env.MONGO_PASS || config?.MONGO_PASS;
    const host = process.env.MONGO_HOST || config?.MONGO_HOST || ATLAS_HOST;
    const db = process.env.MONGO_DB || config?.MONGO_DB || "treedb";

    if (user && pass) {
      raw = `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(
        pass
      )}@${host}/${db}?retryWrites=true&w=majority`;
    }
  }

  const finalUri = normalizeMongoUri(raw, process.env.MONGO_DB || "treedb");

  if (!finalUri) {
    console.error("❌ MongoDB URI is missing (env / config) – cannot connect.");
    process.exit(1);
  }

  console.log(
    "[mongo] connecting with:",
    finalUri.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:**@")
  );

  try {
    // Mongoose 7/8: no need for useNewUrlParser/useUnifiedTopology
    mongoose.set("strictQuery", true);
    await mongoose.connect(finalUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("✅ MongoDB connected");
    return mongoose.connection;
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    // if you want to keep server running, don't exit:
    // throw err;
    process.exit(1);
  }
}