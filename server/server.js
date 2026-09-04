import mongoose from "mongoose";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import redisClient, { connectRedis } from "./config/redis.js";

let server;

async function start() {
  await Promise.all([connectDB(), connectRedis()]);
  server = app.listen(process.env.PORT, () => {
    console.log("Server Started");
  });
}

async function shutdown(signal) {
  console.log(`${signal} received; shutting down`);
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  if (redisClient.isOpen) await redisClient.quit();
  await mongoose.connection.close();
  process.exit(0);
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

start().catch((error) => {
  console.error("Unable to start server", error);
  process.exit(1);
});
