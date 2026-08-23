import { Schema, model } from "mongoose";

const shareSchema = new Schema(
  {
    token: {
      type: String,
      required: true,
    },
    resourceType: {
      type: String,
      enum: ["file", "directory"],
      required: true,
    },
    fileId: {
      type: Schema.Types.ObjectId,
      ref: "File",
      default: null,
    },
    directoryId: {
      type: Schema.Types.ObjectId,
      ref: "Directory",
      default: null,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    accessType: {
      type: String,
      enum: ["public", "restricted"],
      default: "public",
    },
    allowedEmails: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { strict: "throw" },
);

// Public links resolve by opaque token only.
shareSchema.index({ token: 1 }, { unique: true });

// One active link per resource. Partial so revoked links (isActive: false)
// don't block a fresh share later; $type excludes the null side of the pair.
shareSchema.index(
  { fileId: 1 },
  { unique: true, partialFilterExpression: { isActive: true, fileId: { $type: "objectId" } } },
);
shareSchema.index(
  { directoryId: 1 },
  { unique: true, partialFilterExpression: { isActive: true, directoryId: { $type: "objectId" } } },
);

const Share = model("Share", shareSchema);

export default Share;
