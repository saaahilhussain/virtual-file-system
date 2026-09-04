import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URI,
});

redisClient.on("error", (err) => {
  console.error("Redis client error", err);
});

export async function connectRedis() {
  if (!redisClient.isOpen) await redisClient.connect();
}

export default redisClient;
