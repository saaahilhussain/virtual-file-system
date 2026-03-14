import mongoose from "mongoose";
import File from "./models/fileModel.js";
import Directory from "./models/directoryModel.js";

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");
  
  const files = await File.find({ isTrashed: true }).lean();
  console.log("Trashed Files:", files.length, files);
  
  const dirs = await Directory.find({ isTrashed: true }).lean();
  console.log("Trashed Dirs:", dirs.length, dirs);
  
  process.exit(0);
}
test();
