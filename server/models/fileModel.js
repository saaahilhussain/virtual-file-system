import { Schema, model } from "mongoose";

const fileSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    extension: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    parentDirId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Directory",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    isTrashed: {
      type: Boolean,
      default: false,
    },
    trashedAt: {
      type: Date,
      default: null,
    },
    uploadCompletedAt: {
      type: Date,
      default: null,
    },
  },
  { strict: "throw" },
);

// Covers the file listing query used on every drive navigation.
fileSchema.index({
  userId: 1,
  parentDirId: 1,
  isTrashed: 1,
  updatedAt: -1,
  _id: -1,
});

const File = model("File", fileSchema);

export default File;
