import mongoose from "mongoose";
import { connectDB } from "./db.js";

async function removeAllValidations() {
  await connectDB();
  const client = mongoose.connection.getClient();

  try {
    const db = mongoose.connection.db;

    const collections = await db
      .listCollections({}, { nameOnly: true })
      .toArray();

    for (const { name } of collections) {
      if (name.startsWith("system.")) continue;

      await db.command({
        collMod: name,
        validator: {},
        validationLevel: "off",
        validationAction: "warn",
      });

      console.log(`Validation removed from: ${name}`);
    }
  } finally {
    await client.close();
  }
}

removeAllValidations().catch((error) => {
  console.error("Failed to remove collection validations:", error.message);
  process.exitCode = 1;
});
