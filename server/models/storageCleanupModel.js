import { Schema, model } from "mongoose";

const schema = new Schema(
  {
    _id: { type: String, required: true }, // S3 key; inherently unique
    userId: { type: Schema.Types.ObjectId, required: true },
    nextAttemptAt: { type: Date, required: true, default: Date.now },
    leaseUntil: { type: Date, default: () => new Date(0) },
    leaseToken: String,
    attempts: { type: Number, default: 0 },
    lastError: String,
    lastDeletedAt: Date,
    createdAt: { type: Date, default: Date.now },
  },
  { strict: "throw" },
);
schema.index({ nextAttemptAt: 1, leaseUntil: 1 });

export default model("StorageCleanup", schema);
