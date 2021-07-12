const faker = require("faker");
const { getRedisClientAsync } = require("../redis-client");
const {
  CREATE_UNVERIFIED_USER_STREAMS_KEY,
  UNVERIFIED_USER_CREATED_STREAMS_KEY,
} = require("../streams-keys");

const RegistrationService = require("../registration-service");
const TEST_DB = process.env.TEST_DB || 1;

const listenForMessage = async () => {
  const redisClient = await getRedisClientAsync(TEST_DB);
  const registrationService = new RegistrationService(redisClient);
  registrationService.listenForMessage(CREATE_UNVERIFIED_USER_STREAMS_KEY);
};

const sendCreateUnverifiedUserMessage = async (user) => {
  const redisClient = await getRedisClientAsync(TEST_DB);

  await redisClient.rawCallAsync([
    "xadd",
    CREATE_UNVERIFIED_USER_STREAMS_KEY,
    "*",
    "user",
    JSON.stringify(user),
  ]);
};

describe("Registration", () => {
  test("It should return user id and verified 0", (done) => {
    expect.assertions(1);

    listenForMessage();

    const user = {
      name: faker.name.findName(),
      email: faker.internet.email(),
      password: faker.datatype.string(6),
    };

    getRedisClientAsync(TEST_DB).then((redisClient) => {
      redisClient
        .rawCallAsync([
          "xread",
          "block",
          0,
          "STREAMS",
          UNVERIFIED_USER_CREATED_STREAMS_KEY,
          "$",
        ])
        .then(async (userMessage) => {
          const userId = userMessage[0][1][0][1][1];
          await expect(
            redisClient.rawCallAsync([
              "hmget",
              `user:${userId}`,
              "id",
              "verified",
            ])
          ).resolves.toEqual([userId, "0"]);

          redisClient.end();

          done();
        });

      sendCreateUnverifiedUserMessage(user);
    });
  }, 10000);
});
