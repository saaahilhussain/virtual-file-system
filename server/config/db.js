import mongoose from "mongoose";

export async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Database connected");
  } catch (err) {
    console.log(err);
    console.log("Could not connect to Database");
    process.exit(1);
  }
}
