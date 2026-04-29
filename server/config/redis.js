import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URI,
  socket: {
    connectTimeout: 10000, // 10s timeout
    reconnectStrategy: (retries) => {
      if (retries > 5) {
        console.error("Redis reconnect failed after 5 retries");
        return new Error("Redis reconnet failed");
      }
      console.log(`🔁 Redis retry #${retries}`);
      return 1000 * retries;
    },
  },
});

redisClient.on("error", (err) => {
  console.log(err);
  process.exit(1);
});

await redisClient.connect();

export default redisClient;
