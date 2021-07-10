const redisClient = require("./redis-client");
const userSchema = require("./user-validation-schema");

const CREATE_UNVERIFIED_USER_STREAMS_KEY =
  "registration:create_unverified_user";

const UNVERIFIED_USER_CREATED_STREAMS_KEY =
  "registration:unverified_user_created";

const processMessage = (results) => {
  const [, messages] = results[0]; // `key` equals to registration:create_user

  const [id, [, userJson]] = messages[0]; // Only one user should be sent in the first message.

  let user = {};

  try {
    user = JSON.parse(userJson);
  } catch (error) {}

  return {
    id,
    user,
  };
};

const prepairUserDataForInserting = (user) => {
  const data = [];
  for (const property in user) {
    data.push(property, user[property]);
  }
  return data;
};

const fireUnverifiedUserCreatedEvent = async (id) => {
  redisClient.rawCallAsync([
    "xadd",
    UNVERIFIED_USER_CREATED_STREAMS_KEY,
    "*",
    "id",
    id,
  ]);
};

const addUser = async (user) => {
  const data = prepairUserDataForInserting(user);
  const id = await redisClient.rawCallAsync(["incr", "users"]);
  await redisClient.rawCallAsync(["hmset", `user:${id}`, "id", id, ...data]);
  fireUnverifiedUserCreatedEvent(id);
};

const listenForMessage = async (key, lastId = "$") => {
  // `results` is an array, each element of which corresponds to a key.
  const results = await redisClient.rawCallAsync([
    "xread",
    "block",
    0,
    "STREAMS",
    key,
    lastId,
  ]);

  const { id, user } = processMessage(results);

  const { error, value } = userSchema.validate(user);

  if (!error) {
    addUser(value);
  }
  // Pass the last id of the results to the next round.
  await listenForMessage(key, id);
};

redisClient.on("connect", function () {
  listenForMessage(CREATE_UNVERIFIED_USER_STREAMS_KEY);
});

redisClient.on("error", function (e) {
  console.log("redis error", e);
});
