import { Schema, model } from "mongoose";

const sessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 30,
    },
  },
  {
    strict: "throw",
  },
);

const Session = model("Session", sessionSchema);
export default Session;
