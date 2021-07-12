const Redis = require("redis-fast-driver");

const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";

const REDIS_CONFIG = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetries: 10, //reconnect retries, default -1 (infinity)
  autoConnect: true, //will connect after creation
  doNotSetClientName: false, //will set connection name (you can see current connections by running CLIENT LIST on the redis server)
  doNotRunQuitOnEnd: false, //when you call `end()`, driver attempts to send `QUIT` command to redis before actual end
};

const getRedisClient = (db = 0) => {
  return new Redis({ ...REDIS_CONFIG, db });
};

const getRedisClientAsync = (db = 0) => {
  return new Promise((resolve, reject) => {
    const redisClient = new Redis({ ...REDIS_CONFIG, db });
    redisClient.on("connect", () => {
      resolve(redisClient);
    });
  });
};

module.exports = { getRedisClient, getRedisClientAsync };
