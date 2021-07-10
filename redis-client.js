const Redis = require("redis-fast-driver");

const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";

const redisClient = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetries: 10, //reconnect retries, default -1 (infinity)
  autoConnect: true, //will connect after creation
  doNotSetClientName: false, //will set connection name (you can see current connections by running CLIENT LIST on the redis server)
  doNotRunQuitOnEnd: false, //when you call `end()`, driver attempts to send `QUIT` command to redis before actual end
});

module.exports = redisClient;
