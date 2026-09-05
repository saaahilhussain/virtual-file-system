import mongoose from "mongoose";
import User from "../models/userModel.js";

// Billing and storage must conflict on the same account document. A transaction
// retry obtains a new snapshot, including any concurrent quota change.
export async function withAccountTransaction(userId, work) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(
      async () => {
        const user = await User.findOneAndUpdate(
          { _id: userId },
          { $inc: { __v: 1 } },
          { returnDocument: "after", session },
        ).lean();
        if (!user)
          throw Object.assign(new Error("User not found"), { status: 404 });
        return work({ user, session });
      },
      { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } },
    );
  } finally {
    await session.endSession();
  }
}
