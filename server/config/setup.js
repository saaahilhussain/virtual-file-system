import { bsonType } from "bson";
import { connectDB, client } from "../db";

const db = await connectDB();
const command = "collMod";

try {
  await db.command({
    [command]: "users",
    validator: {
      $jsonSchema: {
        required: ["_id", "name", "email", "password", "rootDirId"],
        properties: {
          _id: {
            bsonType: "objectId",
          },
          name: {
            bsonType: "string",
          },
          email: {
            bsonType: "string",
            pattern: "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$",
          },
          password: {
            bsonType: "string",
            minLength: 4,
          },
          rootDirId: {
            bsonType: "objectId",
          },
        },
      },
    },
  });

  await db.command({
    [command]: "directories",
    validator: {
      $jsonSchema: {
        required: ["_id", "name", "parentDirId", "userId"],
        properties: {
          _id: {
            bsonType: "objectId",
          },
          name: {
            bsonType: "string",
          },
          parentDirId: {
            bsonType: ["objectId", "null"],
          },
          userId: {
            bsonType: "objectId",
          },
        },
      },
    },
  });

  await db.command({
    [command]: "files",
    validator: {
      $jsonSchema: {
        required: ["_id", "extension", "name", "parentDirId"],
        properties: {
          _id: {
            bsonType: "objectId",
          },
          extension: {
            bsonType: "string",
          },
          name: {
            bsonType: "objectId",
          },
          parentDirId: {
            bsonType: "objectId",
          },
        },
      },
    },
  });
} catch (error) {
  console.log("Error setting up database");
} finally {
  await client.close();
}
