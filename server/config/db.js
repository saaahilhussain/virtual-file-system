import mongoose from "mongoose";

export async function connectDB() {
  try {
    await mongoose.connect("mongodb://sahil:sahil123@localhost/storageApp");
    console.log("Database connected");
  } catch (err) {
    console.log(err);
    console.log("Could not connect to Database");
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  await client.close();
  process.exit(0);
});
