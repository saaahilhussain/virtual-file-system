import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URI,
});

redisClient.on("error", (err) => {
  console.log(err);
  process.exit(1);
});

await redisClient.connect();

export default redisClient;
