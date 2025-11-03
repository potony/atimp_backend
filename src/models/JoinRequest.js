 // src/models/JoinRequest.js
import mongoose from "mongoose";

const JoinRequestSchema = new mongoose.Schema(
  {
    role: { type: String, index: true },
    source: { type: String, default: "WEB" },
    data: { type: Object, default: {} },
  },
  { timestamps: true }
);

JoinRequestSchema.index({ role: 1, createdAt: -1 });

export default mongoose.model("JoinRequest", JoinRequestSchema);
