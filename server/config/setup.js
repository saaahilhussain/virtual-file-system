import { connectDB } from "./db.js";
import mongoose from "mongoose";

await connectDB();
const client = mongoose.connection.getClient();

try {
  const db = mongoose.connection.db;
  const command = "collMod";

  await db.command({
    [command]: "users",
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: [
          "_id",
          "name",
          "email",
          "rootDirId",
          "role",
          "isTrashed",
          "isDeleted",
        ],
        properties: {
          _id: {
            bsonType: "objectId",
          },
          name: {
            bsonType: "string",
            minLength: 3,
            description:
              "name field should a string with at least three characters",
          },
          email: {
            bsonType: "string",
            description: "please enter a valid email",
            pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$",
          },
          maxStorageInBytes: {
            bsonType: ["int", "long", "double", "decimal"],
            minimum: 0,
          },
          password: {
            bsonType: "string",
            minLength: 6,
          },
          authProviders: {
            bsonType: "array",
            items: {
              enum: ["local", "google", "github"],
            },
          },
          picture: {
            bsonType: "string",
            minLength: 4,
          },
          rootDirId: {
            bsonType: "objectId",
          },
          role: {
            bsonType: "string",
            enum: ["user", "manager", "admin", "owner"],
          },
          isTrashed: {
            bsonType: "bool",
          },
          isDeleted: {
            bsonType: "bool",
          },
          createdAt: {
            bsonType: ["date", "null"],
          },
          updatedAt: {
            bsonType: ["date", "null"],
          },
          __v: {
            bsonType: "int",
          },
        },
        additionalProperties: false,
      },
    },

    validationAction: "error",
    validationLevel: "strict",
  });

  await db.command({
    [command]: "directories",
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: [
          "_id",
          "name",
          "parentDirId",
          "userId",
          "isTrashed",
          "trashedAt",
        ],
        properties: {
          _id: {
            bsonType: "objectId",
          },
          name: {
            bsonType: "string",
          },
          size: {
            bsonType: ["int", "long", "double", "decimal"],
            minimum: 0,
          },
          parentDirId: {
            bsonType: ["objectId", "null"],
          },
          path: {
            bsonType: "array",
            items: {
              bsonType: "objectId",
            },
          },
          userId: {
            bsonType: "objectId",
          },
          isTrashed: {
            bsonType: "bool",
          },
          trashedAt: {
            bsonType: ["date", "null"],
          },
          createdAt: {
            bsonType: "date",
          },
          updatedAt: {
            bsonType: "date",
          },
          __v: {
            bsonType: "int",
          },
        },
        additionalProperties: false,
      },
    },
    validationAction: "error",
    validationLevel: "strict",
  });

  await db.command({
    [command]: "files",
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: [
          "_id",
          "name",
          "size",
          "extension",
          "userId",
          "parentDirId",
          "isTrashed",
          "trashedAt",
          "uploadCompletedAt",
        ],
        properties: {
          _id: {
            bsonType: "objectId",
          },
          extension: {
            bsonType: "string",
          },
          name: {
            bsonType: "string",
          },
          size: {
            bsonType: ["int", "long", "double", "decimal"],
            minimum: 0,
          },
          userId: {
            bsonType: "objectId",
          },
          parentDirId: {
            bsonType: "objectId",
          },
          isTrashed: {
            bsonType: "bool",
          },
          trashedAt: {
            bsonType: ["date", "null"],
          },
          uploadCompletedAt: {
            bsonType: ["date", "null"],
          },
          createdAt: {
            bsonType: "date",
          },
          updatedAt: {
            bsonType: "date",
          },
          __v: {
            bsonType: "int",
          },
        },
        additionalProperties: false,
      },
    },
    validationAction: "error",
    validationLevel: "strict",
  });

  const sharesValidator = {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "_id",
        "token",
        "resourceType",
        "ownerId",
        "accessType",
        "allowedEmails",
        "isActive",
        "expiresAt",
        "createdAt",
        "updatedAt",
      ],
      properties: {
        _id: {
          bsonType: "objectId",
        },
        token: {
          bsonType: "string",
          minLength: 20,
        },
        resourceType: {
          enum: ["file", "directory"],
        },
        fileId: {
          bsonType: ["objectId", "null"],
        },
        directoryId: {
          bsonType: ["objectId", "null"],
        },
        ownerId: {
          bsonType: "objectId",
        },
        accessType: {
          enum: ["public", "restricted"],
        },
        allowedEmails: {
          bsonType: "array",
          items: {
            bsonType: "string",
          },
        },
        isActive: {
          bsonType: "bool",
        },
        expiresAt: {
          bsonType: ["date", "null"],
        },
        createdAt: {
          bsonType: "date",
        },
        updatedAt: {
          bsonType: "date",
        },
        __v: {
          bsonType: "int",
        },
      },
      additionalProperties: false,
    },
  };

  // collMod fails on collections that don't exist yet, so create the shares
  // collection with its validator the first time setup runs.
  const sharesCollections = await db
    .listCollections({ name: "shares" })
    .toArray();
  if (sharesCollections.length === 0) {
    await db.createCollection("shares", {
      validator: sharesValidator,
      validationAction: "error",
      validationLevel: "strict",
    });
  } else {
    await db.command({
      [command]: "shares",
      validator: sharesValidator,
      validationAction: "error",
      validationLevel: "strict",
    });
  }
} catch (error) {
  console.log(error);
  console.log("Error setting up database");
} finally {
  await client.close();
}
