// Read-only production dependency check. Never print connection strings/errors.
import mongoose from '../../server/node_modules/mongoose/index.js';
import { createClient } from '../../server/node_modules/redis/dist/index.js';
import { getFileMetaData } from '../../server/services/s3Service.js';

let healthy = true;
try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 12000, connectTimeoutMS: 8000 });
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  await mongoose.connection.db.admin().ping();
  if (!hello.setName) throw new Error('ReplicaSetRequired');
  console.log('Atlas: reachable replica set');
} catch (error) {
  healthy = false;
  console.log(`Atlas: failed (${error.name})`);
} finally {
  await mongoose.disconnect();
}
const redis = createClient({ url: process.env.REDIS_URI, socket: { connectTimeout: 8000, reconnectStrategy: false } });
redis.on('error', () => {});
try {
  await redis.connect();
  await redis.ping();
  await redis.sendCommand(['JSON.GET', '__file_shelter_deployment_probe__']);
  const indexes = await redis.sendCommand(['FT._LIST']);
  if (!indexes.includes('userIdIdx')) throw new Error('SessionIndexMissing');
  console.log('Redis Cloud: reachable, JSON/Search/session index ready');
} catch (error) {
  healthy = false;
  console.log(`Redis Cloud: failed (${error.name})`);
} finally {
  if (redis.isOpen) await redis.quit();
}
try {
  const object = await getFileMetaData('deployment-checks/20261004.txt');
  console.log(`Instance role S3: reachable (${object.ContentLength} bytes)`);
} catch (error) {
  healthy = false;
  console.log(`Instance role S3: failed (${error.name})`);
}
process.exitCode = healthy ? 0 : 1;
