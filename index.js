const { getRedisClient } = require("./redis-client");
const { CREATE_UNVERIFIED_USER_STREAMS_KEY } = require("./streams-keys");
const RegistrationService = require("./registration-service");
const redisClient = getRedisClient(process.env.db);

redisClient.on("connect", async () => {
  console.log("connect");
  const registrationService = new RegistrationService(redisClient);
  let lastId = "$";

  while (true) {
    lastId = await registrationService.listenForMessage(
      CREATE_UNVERIFIED_USER_STREAMS_KEY,
      lastId
    );
  }
});

redisClient.on("error", function (e) {
  console.log("redis error", e);
});
